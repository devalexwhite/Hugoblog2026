-- URL-wide moderation also covers duplicate submissions and saved rewards.
create table public.treat_for_treat_moderation (
  url text primary key,
  report_count integer not null default 0 check (report_count >= 0),
  disabled boolean not null default false
);
create table public.treat_for_treat_reports (
  url text not null references public.treat_for_treat_moderation(url),
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (url, visitor_id)
);
alter table public.treat_for_treat_moderation enable row level security;
alter table public.treat_for_treat_reports enable row level security;
revoke all on public.treat_for_treat_moderation, public.treat_for_treat_reports from anon, authenticated;
grant select, insert, update on public.treat_for_treat_moderation, public.treat_for_treat_reports to service_role;
create index treat_for_treat_received on public.treat_for_treat_links (visitor_id, reward_url);

create function public.report_treat(p_visitor uuid, p_url text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare added integer;
begin
  if p_visitor is null or p_url is null then
    raise sqlstate '22023' using message = 'Invalid report';
  end if;
  -- A retry remains valid even if a later exchange replaced the saved reward.
  if not exists (select 1 from public.treat_for_treat_links where visitor_id = p_visitor and reward_url = p_url)
    and not exists (select 1 from public.treat_for_treat_reports where visitor_id = p_visitor and url = p_url) then
    raise sqlstate '42501' using message = 'You can only report a treat you received';
  end if;
  insert into public.treat_for_treat_moderation(url) values (p_url) on conflict do nothing;
  -- Serialize reports for this URL so concurrent reports cannot lose an increment.
  perform 1 from public.treat_for_treat_moderation where url = p_url for update;
  insert into public.treat_for_treat_reports(url, visitor_id) values (p_url, p_visitor) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    update public.treat_for_treat_moderation
      set report_count = report_count + 1, disabled = disabled or report_count + 1 >= 2
      where url = p_url;
  end if;
  return jsonb_build_object('reported', true);
end;
$$;
revoke all on function public.report_treat(uuid, text) from public, anon, authenticated;
grant execute on function public.report_treat(uuid, text) to service_role;

-- Only the validating Edge Function may invoke this atomic exchange.
create or replace function public.exchange_treat(p_visitor uuid, p_url text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  existing public.treat_for_treat_links;
  reward text;
begin
  if p_visitor is null or p_url is null then raise exception 'Invalid submission'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor::text, 0));
  select * into existing from public.treat_for_treat_links where visitor_id = p_visitor and url = p_url;
  if existing.reward_url is not null
    and not exists (select 1 from public.treat_for_treat_moderation where url = existing.reward_url and disabled)
    and not exists (select 1 from public.treat_for_treat_reports where url = existing.reward_url and visitor_id = p_visitor) then
    return jsonb_build_object('url', existing.reward_url);
  end if;
  if existing.id is null and exists (
    select 1 from public.treat_for_treat_links where visitor_id = p_visitor and created_at > now() - interval '30 seconds'
  ) then
    raise sqlstate 'P0001' using message = 'Please wait 30 seconds before leaving another treat.';
  end if;
  select url into reward from public.treat_for_treat_links
    where visitor_id <> p_visitor and url <> p_url
      and not exists (select 1 from public.treat_for_treat_moderation m where m.url = treat_for_treat_links.url and m.disabled)
      and not exists (select 1 from public.treat_for_treat_reports r where r.url = treat_for_treat_links.url and r.visitor_id = p_visitor)
      and url not in (select url from public.treat_for_treat_links where visitor_id = p_visitor)
    order by random() limit 1;
  if existing.id is null then
    insert into public.treat_for_treat_links(visitor_id, url, reward_url) values (p_visitor, p_url, reward);
  else
    update public.treat_for_treat_links set reward_url = reward where id = existing.id;
  end if;
  return jsonb_build_object('url', reward);
end;
$$;
revoke all on function public.exchange_treat(uuid, text) from public, anon, authenticated;
grant execute on function public.exchange_treat(uuid, text) to service_role;
