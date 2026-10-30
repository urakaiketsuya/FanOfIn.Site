import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchStagePairings, missingStagePairings } from '../src/omnidex/stagePairings.js';
import { omnidexApi } from '../src/omnidex/api.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import { config } from '../src/config.js';
import { sleep } from '../src/lib/http.js';
import type { OmnidexIndexData } from '@gatcg/shared';
import { competitionMatches } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';
const root=new URL('../../',import.meta.url);
const index:OmnidexIndexData=JSON.parse(await readFile(new URL('data/omnidex/index.json',root),'utf8'));
const majors=new Set(['worlds','nationals','ascent','regionals']);
const events=index.events.filter(e=>e.status==='complete' && e.setting==='physical' && Date.parse(e.date)<=Date.parse(index.generatedAt))
 .sort((a,b)=>Number(b.hostCountry==='US'&&majors.has(b.category))-Number(a.hostCountry==='US'&&majors.has(a.category)) || Number(majors.has(b.category))-Number(majors.has(a.category)) || b.playerCount-a.playerCount);
await mkdir(new URL('pipeline/.cache/omnidex/events/',root),{recursive:true});
let recovered=0, added=0;const failed:{id:number;error:string}[]=[];
let cursor=0, nextRequest=0;
async function worker(){
while(cursor<events.length){
 const e=events[cursor++];
 const published=new URL(`data/omnidex/events/${e.id}.json`,root);
 const bundle:OmnidexEventBundle=JSON.parse(await readFile(published,'utf8'));
 if(/team/i.test(bundle.event.format)||('error' in bundle.teams ? bundle.teams.error!=='Not a team event.' : bundle.teams.length>0)||!missingStagePairings(bundle.event,bundle.pairingsByRound))continue;
 try{
  const pairingsByRound=await fetchStagePairings(bundle.event,bundle.pairingsByRound,async(id,round,stage)=>{
   const slot=Math.max(Date.now(),nextRequest); nextRequest=slot+config.crawlRequestDelayMs;
   await sleep(Math.max(0,slot-Date.now()));
   return omnidexApi.getPairings(id,round,stage);
  });
  const delta=competitionMatches(pairingsByRound).length-competitionMatches(bundle.pairingsByRound).length;
  const next={...bundle,pairingsByRound,fetchedAt:new Date().toISOString()};
  // Cache first, then the published mirror. A failed publication stays eligible for an idempotent retry.
  await writeJsonAtomic(fileURLToPath(new URL(`pipeline/.cache/omnidex/events/${e.id}.json`,root)),next,0);
  await writeJsonAtomic(fileURLToPath(published),next,0);
  recovered++;added+=delta;console.log(JSON.stringify({id:e.id,name:e.name,recovered,added,delta}));
 }catch(error){failed.push({id:e.id,error:String(error)});console.log(JSON.stringify(failed.at(-1)));}
}
}
await Promise.all(Array.from({length:6},()=>worker()));
await writeJsonAtomic('/tmp/stage-recovery-result.json',{recovered,added,failed},2);
console.log(JSON.stringify({recovered,added,failed}));
