// Source preparation only: production builds use these bundled official card portraits offline.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { matchPortraitCards, portraitFile } from './build-timeline-pages.mjs';
const root=new URL('../',import.meta.url);
const read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const [{matches},{cards},maps]=await Promise.all([read('data/broadcast-timelines.json'),read('data/card-catalog.json'),read('data/broadcast-events.json')]);
const files=[...new Set(matches.flatMap(match=>matchPortraitCards(match,cards,maps).flat().map(portraitFile)).filter(Boolean))];
await mkdir(new URL('scripts/assets/match-social/',root),{recursive:true});
for(const file of files){const destination=new URL(`scripts/assets/match-social/${file}`,root);try{await access(destination);continue;}catch{}const response=await fetch(`https://api.gatcg.com/cards/images/${file}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`${file}: ${response.status}`);await writeFile(destination,Buffer.from(await response.arrayBuffer()));}
await writeFile(new URL('scripts/assets/match-social/sources.json',root),JSON.stringify(files.map(file=>({file,url:`https://api.gatcg.com/cards/images/${file}`})),null,2)+'\n');
console.log(`Bundled ${files.length} official card portraits`);
