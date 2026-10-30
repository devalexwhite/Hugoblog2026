import assert from 'node:assert/strict';

let handler;
let rpc;
let rpcResponse = { reported: true };
let rpcStatus = 200;
globalThis.Deno = {
  serve: fn => { handler = fn; },
  env: { get: name => name === 'SUPABASE_URL' ? 'https://database.example' : 'server-secret' },
};
globalThis.fetch = async (url, options) => {
  rpc = { url, body: JSON.parse(options.body) };
  return new Response(JSON.stringify(rpcResponse), { status: rpcStatus });
};
await import('./index.ts');
const visitor = '12345678-1234-4123-8123-123456789abc';
const request = body => handler(new Request('https://function.example', {
  method: 'POST', body: JSON.stringify(body),
}));
let response = await request({ action: 'report', visitor, url: 'https://example.com/treat#fragment' });
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { reported: true });
assert.equal(rpc.url, 'https://database.example/rest/v1/rpc/report_treat');
assert.deepEqual(rpc.body, { p_visitor: visitor, p_url: 'https://example.com/treat' });
rpcResponse = { code: '42501' };
rpcStatus = 403;
assert.equal((await request({ action: 'report', visitor, url: 'https://example.com/unseen' })).status, 403);
assert.equal((await request({ action: 'report', visitor: 'invalid', url: 'https://example.com' })).status, 400);
assert.equal((await request({ action: 'unknown', visitor, url: 'https://example.com' })).status, 400);
rpcStatus = 200;
rpcResponse = { url: null };
assert.equal((await request({ visitor, url: 'https://example.com' })).status, 200);
assert.equal(rpc.url, 'https://database.example/rest/v1/rpc/exchange_treat');
console.log('PASS: report routing, URL normalization, validation, denial, and exchange compatibility');
