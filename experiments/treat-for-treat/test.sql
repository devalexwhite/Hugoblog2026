-- Run in the Supabase SQL editor. Test data is rolled back.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid(); result jsonb; rejected boolean := false;
begin
  -- These assertions assume the new experiment's bowl is still empty.
  result := public.exchange_treat(a, 'https://example.com/treat-test-a');
  assert result->>'url' is null, 'First visitor should see an empty bowl';
  result := public.exchange_treat(b, 'https://example.org/treat-test-b');
  assert result->>'url' = 'https://example.com/treat-test-a', 'Second visitor gets first link';
  result := public.exchange_treat(a, 'https://example.com/treat-test-a');
  assert result->>'url' = 'https://example.org/treat-test-b', 'First visitor can retry';
  assert public.exchange_treat(a, 'https://example.com/treat-test-a') = result, 'Retry is idempotent';
  assert (select count(*) from public.treat_for_treat_links where visitor_id in (a,b)) = 2, 'No duplicate inserts';
  begin
    perform public.exchange_treat(a, 'https://example.net/too-soon');
  exception when sqlstate 'P0001' then rejected := true;
  end;
  assert rejected, 'Cooldown enforced';
  perform public.report_treat(b, 'https://example.com/treat-test-a');
  perform public.report_treat(b, 'https://example.com/treat-test-a');
  assert (select report_count = 1 and not disabled from public.treat_for_treat_moderation where url = 'https://example.com/treat-test-a'), 'Duplicate reports count once';
  result := public.exchange_treat(b, 'https://example.org/treat-test-b');
  assert result->>'url' is null, 'Reporter no longer gets the reported URL';
  insert into public.treat_for_treat_links(visitor_id, url, reward_url) values
    (c, 'https://example.net/treat-test-c', 'https://example.com/treat-test-a'),
    (d, 'https://example.com/treat-test-a', 'https://example.com/treat-test-a');
  perform public.report_treat(c, 'https://example.com/treat-test-a');
  assert (select report_count = 2 and disabled from public.treat_for_treat_moderation where url = 'https://example.com/treat-test-a'), 'Second distinct report disables URL';
  result := public.exchange_treat(d, 'https://example.com/treat-test-a');
  assert result->>'url' is distinct from 'https://example.com/treat-test-a', 'Disabled saved rewards are replaced';
  for i in 1..20 loop
    result := public.exchange_treat(gen_random_uuid(), 'https://example.net/new-reader-' || i);
    assert result->>'url' is distinct from 'https://example.com/treat-test-a', 'Disabled URL never selected, including duplicates';
  end loop;
  rejected := false;
  begin
    perform public.report_treat(a, 'https://example.net/not-received');
  exception when sqlstate '42501' then rejected := true;
  end;
  assert rejected, 'Cannot report a URL not received';
  assert not has_function_privilege('anon','public.report_treat(uuid,text)','EXECUTE'), 'No public report RPC access';
  assert not has_table_privilege('anon','public.treat_for_treat_reports','INSERT'), 'No direct reports';
  assert not has_table_privilege('authenticated','public.treat_for_treat_moderation','UPDATE'), 'No direct moderation';
  assert not has_table_privilege('anon','public.treat_for_treat_links','SELECT'), 'No public table reads';
  assert not has_table_privilege('anon','public.treat_for_treat_links','INSERT'), 'No direct inserts';
  assert not has_function_privilege('anon','public.exchange_treat(uuid,text)','EXECUTE'), 'No RPC bypass';
end $$;
rollback;
