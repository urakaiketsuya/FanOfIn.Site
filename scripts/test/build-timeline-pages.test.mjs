import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { renderTimelinePage, renderTimelineIndex, renderMatchImage, buildTimelinePages, matchPortraitCards } from '../build-timeline-pages.mjs';
import { timelineMetadata, timelinePath, timelineChampions } from '../../shared/src/timelineSeo.ts';
import { canonicalSiteUrl } from '../../shared/src/seo.ts';
const shell=await readFile(new URL('../../app/index.html',import.meta.url),'utf8');
const match={id:'test-match',event:'Osaka & friends',eventId:1,round:'Round 9',players:[{id:'p1',name:'A </script><b>',deck:'Fire Suzaku / Guo Jia'},{id:'p2',name:'B',deck:'Water'}],result:'B wins 2–1; Game 1 partial',games:[{gameNumber:1,winner:'unknown',summary:'Outcome unconfirmed',beats:[{order:1,actor:'p1',text:'A plays a card <script>.'}]}],video:{id:'g3NNFcNpw3k',kind:'broadcast',startSeconds:42720}};
const card=name=>({name,types:['CHAMPION'],subtypes:[],editions:[]});
test('match entries expose exact results, canonical metadata and escaped readable recaps',()=>{
 const html=renderTimelinePage(shell,match),meta=timelineMetadata(match);
 assert.ok(html.includes(`href="${meta.url}"`));assert.equal(meta.url,'https://fanofin.site/timelines/test-match/');
 assert.match(html,/og:image.*media\/matches\/test-match.jpg/);assert.match(html,/summary_large_image/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<b>/);assert.match(html,/Outcome unconfirmed/);assert.match(html,/t=42720s/);
 const json=JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);assert.equal(json.headline,meta.title);assert.equal(json['@type'],'Article');assert.ok(!json.datePublished);
 assert.equal(timelinePath('mike-Raylam'),'/timelines/mike-Raylam/');
 assert.equal(canonicalSiteUrl('/timelines/mike-Raylam'),'https://fanofin.site/timelines/mike-Raylam/');
 assert.throws(()=>timelinePath('../escape'));assert.throws(()=>timelinePath('combos'));
 assert.equal(canonicalSiteUrl('/timelines/test-match?game=2'),'https://fanofin.site/timelines/test-match/');
 assert.equal(canonicalSiteUrl('/timelines/combos'),'https://fanofin.site/timelines/combos');
 assert.doesNotMatch(renderTimelinePage(shell,{...match,video:{id:'javascript:',kind:'broadcast'}}),/href="https:\/\/www.youtube/);
});
test('index links every match and groups events; champion identities preserve multiples and spirit fallback',()=>{
 assert.match(renderTimelineIndex(shell,[match]),/href="\/timelines\/test-match\/"/);
 const cards=[card('Suzaku, Vermilion'),card('Guo Jia, Strategist'),{...card('Spirit of Water'),subtypes:['SPIRIT']}];
 assert.equal(timelineChampions('Fire Suzaku / Guo Jia',cards).length,2);
 const maps={events:[{id:1,stages:[{matches:[{recapId:match.id,players:[{name:'B',spirits:['Spirit of Water']}]}]}]}]};
 assert.deepEqual(matchPortraitCards(match,cards,maps).map(side=>side.map(c=>c.name)),[['Suzaku, Vermilion','Guo Jia, Strategist'],['Spirit of Water']]);
});
test('share image has full landscape dimensions and works without portrait files',async()=>{
 const bytes=await renderMatchImage(match,[[],[]]);const meta=await sharp(bytes).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.equal(meta.format,'jpeg');
});
test('build emits pages and images, preserves other sitemap entries, and is idempotent',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'match-pages-'));const dataDir=path.join(dir,'data'),outDir=path.join(dir,'out');
 try{
 await mkdir(dataDir);await mkdir(outDir);await writeFile(path.join(outDir,'index.html'),shell);await writeFile(path.join(outDir,'sitemap.xml'),'<urlset><url><loc>https://fanofin.site/cards/stats</loc></url><url><loc>https://fanofin.site/timelines</loc></url></urlset>');
 for(const [file,value] of Object.entries({'broadcast-timelines.json':{matches:[match]},'card-catalog.json':{cards:[]},'broadcast-events.json':{events:[]}}))await writeFile(path.join(dataDir,file),JSON.stringify(value));
 await buildTimelinePages({dataDir,outDir});await buildTimelinePages({dataDir,outDir});
 const sitemap=await readFile(path.join(outDir,'sitemap.xml'),'utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,3);assert.match(sitemap,/cards\/stats/);
 assert.match(await readFile(path.join(outDir,'timelines/test-match/index.html'),'utf8'),/Game 1/);assert.ok((await readFile(path.join(outDir,'media/matches/test-match.jpg'))).length>1000);
 }finally{await rm(dir,{recursive:true,force:true});}
});
