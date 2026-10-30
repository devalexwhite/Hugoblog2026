import { Buffer } from 'node:buffer';
import { connect as connectTCP } from 'node:net';
import { connect as connectTLS } from 'node:tls';
import { resolve4 } from 'node:dns/promises';

export function publicIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}

export function webURL(value: string, base?: string): string | null {
  try {
    if (!value) return null;
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !url.hostname.includes('.') || url.hostname.endsWith('.') ||
      /\.(local|localhost|internal|test|invalid)$/i.test(url.hostname) ||
      (/^[\d.]+$/.test(url.hostname) && !publicIPv4(url.hostname))) return null;
    return url.href;
  } catch { return null; }
}

function decode(value: string): string {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©' };
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/\s+/g, ' ').trim();
}

export function parsePreview(html: string, pageURL: string) {
  // Ignore commented-out metadata and strings inside executable/raw-text elements.
  const head = html.split(/<\/head\s*>/i)[0].replace(/<!--[\s\S]*?(?:-->|$)|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const metadata = new Map<string, string>();
  let favicon: string | null = null;
  for (const match of head.matchAll(/<(meta|link)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[2].matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[attr[1].toLowerCase()] = decode(attr[2] ?? attr[3] ?? attr[4]);
    }
    if (match[1].toLowerCase() === 'meta') {
      const key = (attrs.property || attrs.name || '').toLowerCase();
      if (attrs.content && !metadata.has(key)) metadata.set(key, attrs.content);
    } else if (!favicon && /(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test(attrs.rel || '')) {
      favicon = webURL(attrs.href || '', pageURL);
    }
  }
  return {
    title: (metadata.get('og:title') || metadata.get('twitter:title') || decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '') || new URL(pageURL).hostname).slice(0, 200),
    description: (metadata.get('og:description') || metadata.get('twitter:description') || metadata.get('description') || '').slice(0, 400),
    image: webURL(metadata.get('og:image:secure_url') || metadata.get('og:image') || metadata.get('twitter:image') || '', pageURL),
    favicon: favicon || new URL('/favicon.ico', pageURL).href,
  };
}

// Small bounded HTTP response reader; redirects are followed only after revalidation.
export function parseResponse(response: Buffer): { html?: string; location?: string } {
  const split = response.indexOf('\r\n\r\n');
  if (split < 0 || split > 32768) throw new Error('Invalid preview response');
  const lines = response.subarray(0, split).toString('latin1').split('\r\n');
  const status = Number(lines.shift()?.split(' ')[1]);
  const headers = new Map(lines.map(line => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim()];
  }));
  if ([301, 302, 303, 307, 308].includes(status)) return { location: headers.get('location') };
  if (status !== 200 || !/^(text\/html|application\/xhtml\+xml)\b/i.test(headers.get('content-type') || '') ||
    (headers.has('content-encoding') && headers.get('content-encoding') !== 'identity')) throw new Error('No HTML preview');
  let body = response.subarray(split + 4);
  if (headers.get('transfer-encoding')?.toLowerCase() === 'chunked') {
    const chunks: Buffer[] = [];
    let offset = 0;
    while (true) {
      const end = body.indexOf('\r\n', offset);
      if (end < 0) throw new Error('Invalid chunk');
      const sizeText = body.subarray(offset, end).toString('ascii').split(';')[0];
      if (!/^[0-9a-f]+$/i.test(sizeText)) throw new Error('Invalid chunk size');
      const size = parseInt(sizeText, 16);
      offset = end + 2;
      if (!size) break;
      if (size > body.length - offset || body.subarray(offset + size, offset + size + 2).toString() !== '\r\n') throw new Error('Truncated chunk');
      chunks.push(body.subarray(offset, offset + size));
      offset += size + 2;
    }
    body = Buffer.concat(chunks);
  }
  if (body.length > 512 * 1024) throw new Error('Preview too large');
  return { html: body.toString('utf8') };
}

// Connect only to the vetted IPv4 address; do not resolve again during the request.
// HTTPS still validates the original hostname and uses it for SNI.
async function readPage(url: URL, signal: AbortSignal): Promise<{ html?: string; location?: string }> {
  const addresses = await resolve4(url.hostname);
  if (!addresses.length || addresses.some(address => !publicIPv4(address))) throw new Error('Non-public destination');
  signal.throwIfAborted();
  return await new Promise((resolve, reject) => {
    const options = { host: addresses[0], port: url.protocol === 'https:' ? 443 : 80, servername: url.hostname };
    const socket = url.protocol === 'https:' ? connectTLS(options) : connectTCP(options);
    const chunks: Buffer[] = [];
    let bytes = 0;
    const abort = () => socket.destroy(new Error('Preview timed out'));
    signal.addEventListener('abort', abort, { once: true });
    socket.on(url.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
      socket.write(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: text/html,application/xhtml+xml\r\nAccept-Encoding: identity\r\nUser-Agent: TreatForTreatPreview/1.0\r\nConnection: close\r\n\r\n`);
    });
    socket.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 544 * 1024) { socket.destroy(new Error('Preview too large')); return; }
      chunks.push(chunk);
    });
    socket.on('error', reject);
    socket.on('close', () => signal.removeEventListener('abort', abort));
    socket.on('end', () => {
      try { resolve(parseResponse(Buffer.concat(chunks))); }
      catch (error) { reject(error); }
    });
  });
}

export async function fetchPreview(pageURL: string) {
  const fallback = { title: new URL(pageURL).hostname, description: '', image: null, favicon: null };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const work = async () => {
    let target: string | null = webURL(pageURL);
    for (let redirects = 0; target && redirects <= 3; redirects++) {
      const page = await readPage(new URL(target), controller.signal);
      if (page.html !== undefined) return parsePreview(page.html, target);
      target = page.location ? webURL(page.location, target) : null;
    }
    return fallback;
  };
  try {
    return await Promise.race([work(), new Promise<typeof fallback>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(fallback); }, 4000);
    })]);
  } catch (error) { console.warn('Treat preview unavailable:', error instanceof Error ? error.message : 'Unknown error'); return fallback; }
  finally { clearTimeout(timer!); }
}
