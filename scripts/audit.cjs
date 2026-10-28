// After `hugo`, run `node scripts/audit.cjs`. No dependencies needed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('migration/manifest.json'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk('public').filter(f=>f.endsWith('.html'));let links=0;
for(const file of html){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){let url=(m[1]??m[2]??m[3]).replaceAll('&amp;','&');if(!url.startsWith('/')||url.startsWith('//'))continue;url=decodeURIComponent(url.split(/[?#]/)[0]);const target=path.join('public',url);assert(fs.existsSync(target)||fs.existsSync(path.join(target,'index.html')),`${file}: missing ${url}`);links++}}
for(const p of manifest.pages)assert(fs.existsSync(`public/${p.slug}/index.html`),`Missing original URL ${p.slug}`);
for(const asset of manifest.assets){const current=manifest.optimizedAssets?.[asset]??asset;assert(fs.existsSync(path.join('static',decodeURIComponent(new URL(current).pathname))),`Missing asset ${current}`);}
assert.equal(JSON.parse(fs.readFileSync('public/index.json')).length,25,'Search should contain all posts');
console.log(`PASS: ${manifest.pages.length} original pages, ${manifest.assets.length} migrated assets, ${html.length} HTML files, ${links} internal references, 25 searchable posts.`);
