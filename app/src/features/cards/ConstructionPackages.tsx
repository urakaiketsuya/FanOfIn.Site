import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, ConstructionCandidate, ConstructionReport } from "@gatcg/shared";
import PackageCardGrid from "./PackageCardGrid";
import DisclosureChevron from "../../components/DisclosureChevron";
const control="min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ctp-teal";
const recurrence={repeated:"Repeated in later events","not-repeated":"Not repeated in later events","insufficient-data":"Insufficient later data"};
export default function ConstructionPackages({query,cardsByName}:{query:string;cardsByName:ReadonlyMap<string,Card>}){
 const [data,setData]=useState<ConstructionReport>();const [error,setError]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError(false);
 fetch('/data/experiments/package-construction.json',{signal:controller.signal}).then(async r=>{
 if(!r.ok)throw new Error('Unavailable');const value=await r.json() as ConstructionReport;
 if(value.method!=="within-build-construction-v1"||!Array.isArray(value.candidates))throw new Error('Invalid report');
 if(!controller.signal.aborted)setData(value);
 }).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[attempt]);
 if(error)return <div role="alert" className="mt-4">Construction discovery unavailable. <button className={control} onClick={()=>setAttempt(attempt+1)}>Retry construction discovery</button></div>;
 if(!data)return <p role="status" className="mt-4">Loading construction candidates…</p>;
 const matches=data.candidates.map(c=>({...c,bannedCards:c.bannedCards.filter(name=>c.cards.includes(name))})).filter(c=>!c.bannedCards.length).filter(c=>[c.build,c.champion,c.season,...c.cards].some(s=>s.toLowerCase().includes(query)));
 return <div className="mt-4 space-y-4">
 <p className="text-sm text-ctp-subtext0">{matches.length} construction {matches.length===1?"candidate":"candidates"} · Unreviewed</p>
 {!matches.length&&<p role="status">No construction candidates match this search.</p>}
 {matches.map(c=><Candidate key={c.id} c={c} cardsByName={cardsByName}/>)}

 </div>;
}
function Candidate({c,cardsByName}:{c:ConstructionCandidate;cardsByName:ReadonlyMap<string,Card>}){
 const captions = new Map(c.cards.map(name => [name, c.quantities.filter(q=>q.member.name===name).map(q=>`${q.median}× usual · ${q.member.section === "main" ? "Main" : "Material"}`).join(" · ")]));
 return <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
   <h2 className="break-words text-lg font-semibold">{c.cards.join(" + ")}</h2>
   <p className="mt-1 text-sm text-ctp-subtext0">Found in {c.build} · {c.season}</p>
   {!!c.bannedCards.length && <p className="mt-2 text-sm text-ctp-peach">Banned in Standard: {c.bannedCards.join(", ")}</p>}
   <PackageCardGrid names={c.cards} cardsByName={cardsByName} captions={captions}/>
   <p className="mt-3 text-sm">Used together in {c.discovery.complete.decks} of {c.discovery.population} decks · {recurrence[c.validation.status]}</p>
   <details className="group mt-3">
     <summary className={`${control} flex cursor-pointer list-none items-center justify-between gap-3`}>View deck examples<DisclosureChevron className="group-open:rotate-180"/></summary>
     <div className="mt-3 space-y-3 break-words text-sm">
       <p>Compare similar decks with and without these {c.cards.length} cards.</p>
       {c.examples.map((e,i)=><div key={`${e.withId}:${e.withoutId}`} className="rounded-lg border border-ctp-surface1 p-3">
         <p className="mb-2 font-medium">Comparison {i+1} · {Math.round(e.similarity*100)}% similar outside this package</p>
         <div className="flex flex-wrap gap-2">
           <Link className={`${control} inline-flex items-center text-ctp-teal`} to={`/decks/${encodeURIComponent(e.withId)}`}>With these cards</Link>
           <Link className={`${control} inline-flex items-center text-ctp-teal`} to={`/decks/${encodeURIComponent(e.withoutId)}`}>Without these cards</Link>
         </div>
       </div>)}
       <p className="text-ctp-subtext0">Earlier usage: {c.discovery.complete.players} players across {c.discovery.complete.events} events. Later usage: {c.validation.complete.decks} of {c.validation.population} decks.</p>
       <p className="text-ctp-subtext0">Usual quantities are observed medians, not recommended ratios.</p>
     </div>
   </details>
 </article>;
}
