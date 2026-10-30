import { fetchPreview } from './preview.ts';

// JWT verification is enabled at the gateway; the browser uses the public anon JWT.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(async (req: Request) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: 'That submission is too long.' }, 413);
    const { url, visitor, action = 'exchange' } = JSON.parse(raw);
    if (!['exchange', 'report'].includes(action)) return reply({ error: 'Unknown action.' }, 400);
    if (typeof url !== 'string' || url.length > 2048 || typeof visitor !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitor)) {
      return reply({ error: 'Please enter a valid web address.' }, 400);
    }
    let parsed: URL;
    try { parsed = new URL(url); } catch { return reply({ error: 'Please enter a full http:// or https:// address.' }, 400); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      !parsed.hostname.includes('.') || parsed.hostname.endsWith('.local') ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname) || parsed.hostname.includes(':')) {
      return reply({ error: 'Please share a public http:// or https:// link without login details.' }, 400);
    }
    parsed.hash = '';
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${action === 'report' ? 'report_treat' : 'exchange_treat'}`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_visitor: visitor, p_url: parsed.href }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === '42501') return reply({ error: 'You can only report a link you received.' }, 403);
      if (result.code === 'P0001') return reply({ error: 'Please wait 30 seconds before leaving another treat.' }, 429);
      return reply({ error: 'The treat bowl is unavailable. Please try again shortly.' }, 503);
    }
    if (action === 'exchange' && result.url) result.preview = await fetchPreview(result.url);
    return reply(result);
  } catch {
    return reply({ error: 'We could not exchange that treat. Please try again.' }, 400);
  }
});
