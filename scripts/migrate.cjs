// Re-run with: NODE_PATH=/path/to/node_modules node scripts/migrate.cjs
// Dependencies: cheerio, turndown. Uses the public sitemap and saves source snapshots.
const fs = require('node:fs/promises');
const path = require('node:path');
const {load} = require('cheerio');
const Turndown = require('turndown');
const origin = 'https://thatalexguy.dev';
const td = new Turndown({headingStyle:'atx', codeBlockStyle:'fenced'});
const assets = new Map();
async function get(url) { const r = await fetch(url); if(!r.ok) throw Error(`${r.status}: ${url}`); return r; }
async function asset(url) {
 const u=new URL(url,origin); if(u.origin!==origin) return url;
 const target=path.join('static',decodeURIComponent(u.pathname));
 if(!assets.has(u.href)) assets.set(u.href,(async()=>{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,Buffer.from(await (await get(u.href)).arrayBuffer()));return u.pathname;})());
 return assets.get(u.href);
}
(async()=>{
 await fs.mkdir('migration/source',{recursive:true});
 const sitemap=await (await get(origin+'/sitemap.xml')).text(); await fs.writeFile('migration/source/sitemap.xml',sitemap);
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]); const posts=[];
 for(const url of urls){
 const slug=new URL(url).pathname.slice(1); if(!slug||slug==='search') continue;
 const html=await (await get(url)).text(); await fs.writeFile(`migration/source/${slug}.html`,html);
 const $=load(html); const article=$('main article').first();
 const title=slug==='about'?'About Alex':article.find('h1').first().text().trim();
 const date=article.find('time').first().attr('datetime');
 const tags=article.find('.tag-list a').map((i,e)=>$(e).text()).get();
 const comments=article.find('#comments').length>0;
 article.find('.post-date,.tag-list,.post-nav,#comments,script').remove();
 if(slug!=='about') article.find('h1').first().remove();
 for(const el of article.find('[src],[poster]').toArray()) for(const attr of ['src','poster']) {const src=$(el).attr(attr);if(src) $(el).attr(attr,await asset(src));}
 for(const el of article.find('a[href]').toArray()){const href=$(el).attr('href');if(href.includes('/content/')) $(el).attr('href',await asset(href));else if(href.startsWith(origin)) $(el).attr('href',href.slice(origin.length)||'/');}
 const cover=article.find('img').first().attr('src')||'';
 const description=article.find('p').filter((i,e)=>!$(e).find('img').length).first().text().trim().slice(0,240);
 let section=tags.some(t=>/cycling/i.test(t))?'cycling':tags.some(t=>/book/i.test(t))?'books':tags.some(t=>/gaming|games/i.test(t))?'games':'posts';
 if(slug==='about') section='';
 const meta={title,...(date?{date}:{}),url:`/${slug}/`,tags,description,cover,comments,source:url};
 await fs.mkdir(`content/${section}`,{recursive:true});
 await fs.writeFile(`content/${section?section+'/':''}${slug}.md`,JSON.stringify(meta,null,2)+'\n\n'+td.turndown(article.html())+'\n');
 posts.push({slug,title,section,images:article.find('img').length,source:url});
 console.log(`${section||'page'}: ${title}`);
 }
 for(const p of ['/content/images/fav.jpeg','/content/images/meta.jpeg']) await asset(p);
 await fs.writeFile('migration/manifest.json',JSON.stringify({source:origin,migratedAt:new Date().toISOString(),pages:posts,assets:[...assets.keys()]},null,2));
 console.log(`Migrated ${posts.length} pages and ${assets.size} assets.`);
})().catch(e=>{console.error(e);process.exit(1)});
