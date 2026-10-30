import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
class Element {
  children = []; listeners = {}; dataset = {}; disabled = false;
  constructor(tag = 'div') { this.tag = tag; }
  append(...elements) { this.children.push(...elements); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  setAttribute(name, value) { this[name] = value; }
  remove() { this.removed = true; }
}
const button = new Element('button');
const result = new Element();
const form = new Element('form');
form.elements = { url: { value: 'https://example.org' } };
form.querySelector = () => button;
form.reportValidity = () => true;
const box = new Element();
box.querySelector = selector => ({ form, '.treat-result': result }[selector]);
const calls = [];
runInNewContext(readFileSync(new URL('../../static/experiments/treat-for-treat/app.js', import.meta.url), 'utf8'), {
  document: { querySelectorAll: () => [box], createElement: tag => new Element(tag) },
  localStorage: { getItem: () => '12345678-1234-4123-8123-123456789abc' },
  URL, AbortController, setTimeout, clearTimeout,
  fetch: async (_url, options) => {
    const body = JSON.parse(options.body); calls.push(body);
    return { ok: true, json: async () => body.action === 'report' ? { reported: true } : {
      url: 'https://example.com/post', preview: { title: '<script>Plain text</script>', description: 'A description', image: 'https://example.com/cover.jpg', favicon: 'https://example.com/icon.png' },
    } };
  },
});
await form.listeners.submit({ preventDefault() {} });
const [card, report] = result.children;
assert.equal(card.className, 'treat-card');
assert.equal(card.href, 'https://example.com/post');
assert.equal(card.children[1].children[1].textContent, '<script>Plain text</script>');
assert.equal(card.children[1].children[2].textContent, 'A description');
const image = card.children[0].children[1];
assert.equal(image.src, 'https://example.com/cover.jpg');
image.listeners.error();
assert.equal(image.removed, true);
await report.listeners.click();
assert.equal(calls[1].action, 'report');
assert.equal(calls[1].url, card.href);
assert.equal(card.removed, true);
assert.equal(report.disabled, true);
console.log('PASS: card contents, safe text, image fallback, and reporting');
