// After `hugo`, run `node scripts/audit.cjs`. No dependencies needed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=process.env.HUGO_OUTPUT_DIR || 'public';
const manifest=JSON.parse(fs.readFileSync('migration/manifest.json'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const html=walk(output).filter(f=>f.endsWith('.html'));let links=0;
for(const file of html){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){let url=(m[1]??m[2]??m[3]).replaceAll('&amp;','&');if(!url.startsWith('/')||url.startsWith('//'))continue;url=decodeURIComponent(url.split(/[?#]/)[0]);const target=path.join(output,url);assert(fs.existsSync(target)||fs.existsSync(path.join(target,'index.html')),`${file}: missing ${url}`);links++}}
for(const p of manifest.pages)assert(fs.existsSync(`${output}/${p.slug}/index.html`),`Missing original URL ${p.slug}`);
for(const asset of manifest.assets){const current=manifest.optimizedAssets?.[asset]??asset;assert(fs.existsSync(path.join('static',decodeURIComponent(new URL(current).pathname))),`Missing asset ${current}`);}
const search=JSON.parse(fs.readFileSync(path.join(output,'index.json')));
for(const page of manifest.pages.filter(p=>p.slug !== 'about')) assert(search.some(p=>p.url === `/${page.slug}/`),`Search missing ${page.slug}`);
assert(search.some(p=>p.url === '/treat-for-treat/'),'Search should include Treat For Treat');
console.log(`PASS: ${manifest.pages.length} original pages, ${manifest.assets.length} migrated assets, ${html.length} HTML files, ${links} internal references, ${search.length} searchable posts.`);
