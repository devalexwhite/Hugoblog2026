import assert from 'node:assert/strict';
import { parsePreview, webURL, publicIPv4, fetchPreview, parseResponse } from './preview.ts';
const card = parsePreview(`<!doctype html><head>
<!-- <meta property="og:title" content="Ignore comment"> -->
<script>const fake = '<meta property="og:title" content="Ignore script">';</script>
<title>Fallback title</title>
<meta content='A &amp; B &#x1F383;' property='og:title'>
<meta name="description" content="Fallback description">
<meta property="og:description" content="A lovely &quot;treat&quot; > another">
<meta property="og:image" content="/social.jpg">
<link href="icons/favicon.png" rel="shortcut icon">
</head>`, 'https://example.com/posts/one');
assert.deepEqual(card, {
  title: 'A & B 🎃', description: 'A lovely "treat" > another',
  image: 'https://example.com/social.jpg', favicon: 'https://example.com/posts/icons/favicon.png',
});
const fallback = parsePreview('<title>Plain &amp; simple</title><meta name="description" content="Description">', 'https://example.com');
assert.equal(fallback.title, 'Plain & simple');
assert.equal(fallback.description, 'Description');
assert.equal(fallback.image, null);
assert.equal(fallback.favicon, 'https://example.com/favicon.ico');
assert.equal(parsePreview('<meta name="twitter:title" content="Twitter"><meta name="twitter:image" content="https://cdn.example.com/image.png">', 'https://example.com').title, 'Twitter');
for (const url of ['http://127.1', 'http://0x7f000001', 'http://169.254.169.254', 'http://10.0.0.1', 'http://[::1]', 'file:///etc/passwd', 'javascript:alert(1)', 'https://a:b@example.com', 'http://example.com:3000', 'http://service.internal']) assert.equal(webURL(url), null, url);
for (const ip of ['127.0.0.1', '10.0.0.1', '100.64.0.1', '172.16.0.1', '192.168.0.1', '169.254.169.254', '224.0.0.1']) assert.equal(publicIPv4(ip), false, ip);
assert.equal(publicIPv4('93.184.215.14'), true);
assert.equal(parsePreview('<meta property="og:image" content="javascript:alert(1)">', 'https://example.com').image, null);
assert.deepEqual(await fetchPreview('http://127.0.0.1'), { title: '127.0.0.1', description: '', image: null, favicon: null });
console.log('PASS: social metadata, fallbacks, entities, relative images/icons, and blocked destinations');
if (process.argv.includes('--live')) {
  const preview = await fetchPreview('https://example.com');
  assert.equal(preview.title, 'Example Domain');
  console.log('PASS: live HTTPS metadata fetch with pinned public DNS');
}

assert.deepEqual(parseResponse(Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<title>Test</title>')), { html: '<title>Test</title>' });
assert.deepEqual(parseResponse(Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n0\r\n\r\n')), { html: 'hello' });
assert.deepEqual(parseResponse(Buffer.from('HTTP/1.1 302 Found\r\nLocation: /next\r\n\r\n')), { location: '/next' });
assert.throws(() => parseResponse(Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\nff\r\nshort')));
assert.throws(() => parseResponse(Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: image/png\r\n\r\nbytes')));
console.log('PASS: bounded HTTP response parsing, redirects, chunked encoding, and malformed responses');
