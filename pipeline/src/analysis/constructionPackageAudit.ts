import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckSightingsData, type ConstructionCandidate, type ConstructionReport } from "@gatcg/shared";
import { constructionKey, mineConstructionCohort, CONSTRUCTION_SETTINGS, type ConstructionDeck } from "./constructionPackages.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const read=async<T>(file:string):Promise<T>=>JSON.parse(await readFile(path.join(root,file),"utf8"));
const [index,taxonomy,sightings,catalog]=await Promise.all([
 read<DeckCardIndexData>('data/analysis/deck-card-index.json'),read<ArchetypeTaxonomyData>('data/analysis/archetype-taxonomy.json'),read<DeckSightingsData>('data/analysis/deck-sightings.json'),
 read<{fetchedAt:string;cards:{name:string;effect?:string;types?:string[];legality?:Record<string,{limit:number}>}[]}>('pipeline/.cache/cards.json')]);
const byId=new Map(index.decks.map(d=>[d.deckId,d]));
const metadata=new Map(sightings.sightings.map(d=>[d.deckId,d]));
const cards=new Map(catalog.cards.map(c=>[c.name,c]));
const all:ConstructionCandidate[]=[];let cohortsTested=0;
for(const build of [...taxonomy.clusters].sort((a,b)=>a.id.localeCompare(b.id))){
 const cohorts=new Map<string,ConstructionDeck[]>();
 for(const id of new Set(build.deckIds)){
  const deck=byId.get(id),s=metadata.get(id);if(!deck||!s||!s.championName||s.seasonId===null||!Number.isFinite(Date.parse(s.eventDate)))continue;
  const counts=new Map<string,number>();
  for(const section of ['main','material'] as const)for(const line of decodeCardLines(deck[section],index.cardNames)){
   if(line.quantity<=0||cards.get(line.name)?.types?.includes('CHAMPION'))continue;
   const k=constructionKey({name:line.name,section});counts.set(k,(counts.get(k)??0)+line.quantity);
  }
  const key=JSON.stringify([s.championName,s.format,s.seasonName??String(s.seasonId),s.seasonId]);
  const rows=cohorts.get(key)??[];rows.push({id,player:String(s.player),event:String(s.eventId),date:s.eventDate.slice(0,10),counts});cohorts.set(key,rows);
 }
 for(const [key,rows] of [...cohorts].sort(([a],[b])=>a.localeCompare(b))){
  if(rows.length<50||new Set(rows.map(d=>d.date)).size<8)continue;
  cohortsTested++; const [champion,format,season]=JSON.parse(key);
  for(const found of mineConstructionCohort(rows)){
   const definingOverlap=found.cards.filter(name=>build.definingCards.some(c=>c.name===name));
   const bannedCards=[...new Set([...found.cards,...found.options.map(o=>o.member.name)])].filter(name=>cards.get(name)?.legality?.STANDARD?.limit===0);
   all.push({...found,id:JSON.stringify([build.id,key,found.core]),source:'within-build-construction-v1',buildId:build.id,build:build.name,champion,format,season,
    mechanics:found.cards.map(name=>({name,text:cards.get(name)?.effect??''})),bannedCards,definingOverlap,
    questions:['Does this group serve one construction role, or reflect a sub-build?', 'Are the associated options substitutes or additional dependencies?', 'Are the observed copy counts appropriate for the proposed role?']});
  }
 }
}
// Rank only with discovery evidence. Later recurrence cannot select winners.
all.sort((a,b)=>b.discovery.weakestAssociation-a.discovery.weakestAssociation || b.discovery.complete.players-a.discovery.complete.players || a.id.localeCompare(b.id));
const selected:ConstructionCandidate[]=[];
for(const c of all){
 if(selected.some(p=>JSON.stringify(p.core)===JSON.stringify(c.core)))continue;
 if(selected.filter(p=>p.buildId===c.buildId).length>=2)continue;
 selected.push(c);if(selected.length===10)break;
}
const report:ConstructionReport={method:'within-build-construction-v1',generatedAt:new Date().toISOString(),sources:{decks:index.generatedAt,sightings:sightings.generatedAt,taxonomy:taxonomy.generatedAt,catalog:catalog.fetchedAt},cohortsTested,nominated:all.length,settings:CONSTRUCTION_SETTINGS,candidates:selected};
await mkdir(path.join(root,'data/experiments'),{recursive:true});await mkdir(path.join(root,'docs/experiments'),{recursive:true});
await writeFile(path.join(root,'data/experiments/package-construction.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(root,'docs/experiments/package-construction.md'),['# Construction discovery','',`${all.length} nominations across ${cohortsTested} cohorts; ${selected.length} selected by discovery association with at most two per build.`, '',...selected.map(c=>`- ${c.cards.join(' + ')} — ${c.build} / ${c.season}: ${c.discovery.complete.decks}/${c.discovery.population} discovery decks, ${c.discovery.complete.players} players; later ${c.validation.status}.`),'','See docs/CALCULATIONS.md for thresholds and limits.'].join('\n'));
console.log(`Construction: ${all.length} nominations from ${cohortsTested} cohorts; ${selected.length} report candidates.`);
