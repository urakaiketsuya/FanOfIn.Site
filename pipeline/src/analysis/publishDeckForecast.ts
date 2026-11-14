import { writeFile, readFile } from 'node:fs/promises';
import { deckModelValue, matchupValue, forecastClip, deckCardIssues, type Card, type DeckForecastModel, type ResidualStats } from '@gatcg/shared';
import { competitivePeriod, type BanRegime } from '../../../shared/src/competitivePeriods.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import { buildEventDeckSignatures } from './decklists.js';
import { buildCardIndex, type CardSignature } from '../cards/catalog.js';
import type { CompositionMatch } from './cardCompositionValidation.js';

export async function publishDeckForecast(args: { root:string; asOf:string; bundles:OmnidexEventBundle[]; regimes:BanRegime[]; coefficients:Record<string,number>; residuals:ResidualStats; scale:number; priorMass:number; inputs:Record<string,string>; rows:CompositionMatch[]; predict:(r:CompositionMatch)=>number }) {
  const {root,asOf,bundles,regimes,coefficients}=args;
  const seasons=bundles.flatMap(b=>b.event.season?[b.event.season]:[]).filter(s=>s.dateStart.slice(0,10)<=asOf&&s.dateEnd.slice(0,10)>=asOf);
  const season=seasons.sort((a,b)=>b.dateStart.localeCompare(a.dateStart))[0];
  const period=competitivePeriod(asOf,'standard',{season:season??null,completed:null},regimes);
  if (!period.key || period.status!=='verified') throw new Error('Review the current official season and ban ledger before publishing');
  const catalog=JSON.parse(await readFile(`${root}data/card-catalog.json`,'utf8')) as {cards:Card[]};
  const cards=new Map(catalog.cards.map(c=>[c.name,c]));
  const signatures=buildCardIndex(catalog.cards.map(c=>({...c,editions:[]})) as CardSignature[]);
  const from=new Date(Date.parse(asOf+'T00:00:00Z')-28*86400000).toISOString().slice(0,10);
  const field:DeckForecastModel['field']=[];
  let entrants=0,events=0;
  for(const b of bundles) {
    const completed=b.event.dateCompleted?.slice(0,10);
    if(b.event.format!=='standard'||b.event.status!=='complete'||!completed||completed>=asOf||completed<from||'error' in b.decklists||'error' in b.standings) continue;
    const start=b.event.dateStarted?.slice(0,10);
    if(!start || start<from || competitivePeriod(start,'standard',{season:b.event.season,completed:b.event.dateCompleted},regimes).key!==period.key) continue;
    events++;entrants+=b.standings.standings.length;
    const standingIds=new Set(b.standings.standings.map(s=>s.id));
    for(const [player,d] of buildEventDeckSignatures(b.decklists,signatures)) {
      if(!standingIds.has(player)||!d.championName||d.unmatchedCardNames.length||!d.mainCards.length)continue;
      if (!Object.hasOwn(coefficients,`champ:standard:${d.championName}`) && !((args.residuals[JSON.stringify(['standard',d.championName])]?.n ?? 0)>0)) continue;
      const lines=[...d.mainCards,...d.materialCards];
      if(lines.some(l=>!Number.isSafeInteger(l.quantity)||l.quantity<=0))continue;
      if(deckCardIssues({main:d.mainCards.map(l=>({card:l.name,quantity:l.quantity})),material:d.materialCards.map(l=>({card:l.name,quantity:l.quantity})),sideboard:[]},cards,'STANDARD').length)continue;
      const deck={champion:d.championName,cards:lines.map(l=>[l.name,l.quantity] as [string,number])};
      const art=d.materialCards.map(l=>cards.get(l.name)).filter(c=>c?.types.includes('CHAMPION')&&c.name.split(',')[0].trim()===d.championName).sort((a,b)=>(b?.level??0)-(a?.level??0))[0]?.name??d.championName;
      field.push({champion:d.championName,card:art,value:deckModelValue(deck,coefficients),weight:1});
    }
  }
  if(!field.length)throw new Error('No current-period field decklists available');
  // Verify the exact serialized arithmetic, including pre-correction clipping.
  let maximumDifference=0;
  for(const r of args.rows) {
    const predicted=forecastClip(r.prior+deckModelValue(r.a,coefficients,r.format)-deckModelValue(r.b,coefficients,r.format)+matchupValue(r.a.champion,r.b.champion,coefficients,r.format));
    maximumDifference=Math.max(maximumDifference,Math.abs(predicted-args.predict(r)));
  }
  if(maximumDifference>1e-10)throw new Error(`Export prediction mismatch ${maximumDifference}`);
  const expires=[season.dateEnd.slice(0,10),new Date(Date.parse(asOf+'T00:00:00Z')+14*86400000).toISOString().slice(0,10)].sort()[0];
  const model:DeckForecastModel={generatedAt:new Date().toISOString(),schemaVersion:1,asOf,expires,season:season.name,period:period.key,coefficients,residuals:args.residuals,priorMass:args.priorMass,scale:args.scale,field,
    coverage:{entrants,modeledEntrants:field.length,events,from,through:asOf},provenance:{...args.inputs,maximumExportDifference:String(maximumDifference)}};
  await writeFile(`${root}data/analysis/deck-forecast.json`,JSON.stringify(model)+'\n');
  const manifestPath=`${root}data/manifest.json`,manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  manifest['analysis-deck-forecast']=model.generatedAt;
  await writeFile(manifestPath,JSON.stringify(manifest)+'\n');
  console.log(JSON.stringify({forecast:model.coverage,season:model.season,maximumDifference}));
}
