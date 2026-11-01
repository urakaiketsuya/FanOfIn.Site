import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { timelineMetadata, timelinePath, timelineChampions, timelineVideoLink, timelineRoundLabel } from '../shared/src/timelineSeo.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style = `<style>.match-entry{max-width:64rem;margin:auto;padding:24px;font-family:system-ui;color:#cdd6f4;background:#1e1e2e;overflow-wrap:anywhere}.match-entry a{display:inline-flex;min-height:48px;align-items:center;color:#89b4fa}.match-entry a:focus-visible{outline:2px solid currentColor}.match-entry h1{font-size:clamp(24px,4vw,40px)}.match-entry .versus{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;text-align:center}.match-entry img{width:100%;height:auto;border-radius:16px}.match-entry li{margin:12px 0}.match-entry p{line-height:1.6}</style>`;
function entry(shell, { title, description, url, image }, body, structured) {
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)} · Fan of Insight</title>`);
  for (const [attr,key,value] of [
    ['name','description',description],['property','og:title',title],['property','og:description',description],['property','og:url',url],['property','og:type','website'],
    ['name','twitter:title',title],['name','twitter:description',description],['name','twitter:card','summary_large_image'],
    ['property','og:image',image],['name','twitter:image',image],['property','og:image:alt',title],['name','twitter:image:alt',title],
    ['property','og:image:width','1200'],['property','og:image:height','630'],['property','og:image:type','image/jpeg'],
  ]) {
    html=html.replace(new RegExp(`<meta\\b[^>]*\\b${attr}=["']${key}["'][^>]*>`, 'gi'),'');
    html=html.replace('</head>',()=>`<meta ${attr}="${key}" content="${escape(value)}">\n</head>`);
  }
  html=html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>',()=>`<link rel="canonical" href="${escape(url)}"><script type="application/ld+json" data-canonical="${escape(url)}">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('Build shell is missing empty root');
  return html.replace('<div id="root"></div>',()=>`<div id="root">${style}<main class="match-entry">${body}</main></div>`);
}
export function renderTimelinePage(shell, match) {
  const meta=timelineMetadata(match), video=timelineVideoLink(match.video);
  const body=`<a href="/timelines/">← Match Timelines</a><p>${escape(match.event)} · ${escape(match.round)}</p><h1>${escape(match.players.map(p=>p.name).join(' vs. '))}</h1>
  <img src="${meta.image}" width="1200" height="630" alt="${escape(meta.title)}">
  <div class="versus">${match.players.map(player=>`<p><strong>${escape(player.name)}</strong><br>${escape(player.deck)}</p>`).join("<span>VS</span>")}</div><p>${escape(match.result)}</p>${video?`<a href="${escape(video.url)}">${video.label} ↗</a>`:''}
  ${match.games.map(game=>`<section><h2>Game ${game.gameNumber}</h2><p>${escape(game.summary)}</p><ol>${game.beats.map(beat=>`<li>${escape(beat.text)}</li>`).join('')}</ol></section>`).join('')}`;
  return entry(shell,meta,body,{'@context':'https://schema.org','@type':'Article',headline:meta.title,description:meta.description,url:meta.url,image:meta.image,about:{'@type':'Thing',name:'Grand Archive TCG'},...(video?{citation:video.url}:{})});
}
export function renderTimelineIndex(shell,matches) {
  const groups=Map.groupBy(matches,match=>match.event);
  const meta={title:'Grand Archive Match Timelines',description:'Explore Grand Archive tournament matches by event, player and champion. Watch broadcasts and read game recaps.',url:'https://fanofin.site/timelines/',image:'https://fanofin.site/media/social/fan-of-insight-v1.jpg'};
  return entry(shell,meta,`<h1>Match Timelines</h1>${[...groups].map(([event,rows])=>`<section><h2>${escape(event)}</h2><ul>${rows.map(match=>`<li><a href="${timelinePath(match.id)}">${escape(match.players.map(p=>p.name).join(' vs. '))} · ${escape(match.round)}</a><p>${escape(match.result)}</p></li>`).join('')}</ul></section>`).join('')}`,{'@context':'https://schema.org','@type':'CollectionPage',name:meta.title,url:meta.url,mainEntity:{'@type':'ItemList',itemListElement:matches.map((match,i)=>({'@type':'ListItem',position:i+1,url:timelineMetadata(match).url,name:match.players.map(p=>p.name).join(' vs. ')}))}});
}
export function matchPortraitCards(match,cards,eventMaps) {
  const pairing=eventMaps?.events.find(e=>e.id===match.eventId)?.stages.flatMap(s=>s.matches).find(m=>m.recapId===match.id);
  return match.players.map(player=>{
    const champions=timelineChampions(player.deck,cards);
    return champions.length?champions:(pairing?.players.find(p=>p.name.toLowerCase()===player.name.toLowerCase())?.spirits??[]).map(name=>cards.find(c=>c.name===name)).filter(Boolean);
  });
}
export const portraitFile = card => card?.editions.find(e=>/^\/cards\/images\/[\w-]+\.(jpg|png|webp|jpeg)$/.test(e.image??''))?.image?.split('/').at(-1);
const short = (text, max) => [...text].length <= max ? text : [...text].slice(0,max-1).join('').trimEnd()+'…';
const fit = (text, width, size) => Math.max(14,Math.min(size,width/(Math.max(1,[...text].length)*0.6)));
export async function renderMatchImage(match, portraits, {artDir=path.join(root,'scripts/assets/match-social')}={}) {
  const layers=[];
  for (let side=0;side<2;side++) {
    const cards=portraits[side]??[];
    const count=Math.max(cards.length,1), size=Math.min(170,390/count-12);
    for (let i=0;i<count;i++) {
      const x=(side?875:325)+(i-(count-1)/2)*(size+12)-size/2, y=175+(170-size)/2;
      let pixels;
      const file=portraitFile(cards[i]);
      if (file) {
        // Portraits are bundled during source preparation; production builds need no image network calls.
        const raw=await readFile(path.join(artDir,file)).catch(error=>{if(error.code==='ENOENT') return undefined;throw error;});
        if(raw) pixels=await sharp(raw).extract(await portraitCrop(raw)).resize(Math.round(size),Math.round(size)).png().toBuffer();
      }
      const embedded=pixels?`<image href="data:image/png;base64,${pixels.toString('base64')}" x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#p${side}${i})"/>`:`<text x="${x+size/2}" y="${y+size*.64}" text-anchor="middle" fill="#cdd6f4" font-size="60">${escape(match.players[side].name.slice(0,1))}</text>`;
      layers.push(`<defs><clipPath id="p${side}${i}"><circle cx="${x+size/2}" cy="${y+size/2}" r="${size/2}"/></clipPath></defs><circle cx="${x+size/2}" cy="${y+size/2}" r="${size/2+3}" fill="${side?'#cba6f7':'#89b4fa'}"/>${embedded}`);
    }
  }
  const text=(value,x,y,size,color='#cdd6f4',width=1000)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${fit(value,width,size)}" fill="${color}">${escape(value)}</text>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#1e1e2e"/><rect x="28" y="28" width="1144" height="574" rx="28" fill="#181825" stroke="#45475a"/><g font-family="Arial, sans-serif" font-weight="700">${text(match.event,600,85,30)}${text(timelineRoundLabel(match.round),600,125,21,'#a6adc8')}${layers.join('')}${text('VS',600,275,28,'#a6adc8')}${match.players.map((p,i)=>text(p.name,i?875:325,405,40,i?'#cba6f7':'#89b4fa',460)+text(short(p.deck,58),i?875:325,445,22,'#a6adc8',460)).join('')}${text(match.result,600,522,28)}${text('FAN OF INSIGHT  ·  MATCH RECAP',600,574,18,'#a6adc8')}</g></svg>`;
  return sharp(Buffer.from(svg)).jpeg({quality:90}).toBuffer();
}
async function portraitCrop(raw) {
 const {width,height}=await sharp(raw).metadata();const size=Math.floor(Math.min(width*.8,height*.56));return {left:Math.floor((width-size)/2),top:Math.floor(height*.12),width:size,height:size};
}
export async function buildTimelinePages({dataDir=path.join(root,'data'),outDir=path.join(root,'app/dist'),artDir}={}) {
 const [{matches},{cards},eventMaps,shell]=await Promise.all([readFile(path.join(dataDir,'broadcast-timelines.json'),'utf8').then(JSON.parse),readFile(path.join(dataDir,'card-catalog.json'),'utf8').then(JSON.parse),readFile(path.join(dataDir,'broadcast-events.json'),'utf8').then(JSON.parse),readFile(path.join(outDir,'index.html'),'utf8')]);
 if(!matches.length||new Set(matches.map(m=>m.id)).size!==matches.length) throw new Error('Missing or duplicate match IDs');
 const pages=matches.map(match=>({match,html:renderTimelinePage(shell,match)}));
 const index=renderTimelineIndex(shell,matches);
 const sitemapPath=path.join(outDir,'sitemap.xml');const original=await readFile(sitemapPath,'utf8');
 if(!original.includes('</urlset>'))throw new Error('Invalid sitemap');
 const sitemap=original.replace(/\s*<url>\s*<loc>https:\/\/fanofin\.site\/timelines(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g,'').replace('</urlset>',`<url><loc>https://fanofin.site/timelines/</loc></url>${matches.map(m=>`<url><loc>${timelineMetadata(m).url}</loc></url>`).join('')}</urlset>`);
 if((sitemap.match(/<loc>/g)??[]).length>50000)throw new Error('Sitemap exceeds URL limit');
 await rm(path.join(outDir,'timelines'),{recursive:true,force:true});await mkdir(path.join(outDir,'timelines'),{recursive:true});
 await rm(path.join(outDir,'media/matches'),{recursive:true,force:true});await mkdir(path.join(outDir,'media/matches'),{recursive:true});
 for(const {match,html} of pages){await mkdir(path.join(outDir,'timelines',match.id),{recursive:true});await writeFile(path.join(outDir,'timelines',match.id,'index.html'),html);await writeFile(path.join(outDir,'media/matches',`${match.id}.jpg`),await renderMatchImage(match,matchPortraitCards(match,cards,eventMaps),{artDir}));}
 await writeFile(path.join(outDir,'timelines/index.html'),index);await writeFile(sitemapPath,sitemap);
 console.log(`Match entry pages and share images: ${pages.length}`);return pages.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildTimelinePages();
