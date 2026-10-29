import { useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import type { OmnidexDecklist } from '@gatcg/shared';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import CardArtTile from '../../components/CardArtTile';
import { blendBuilderPath } from './deckBlendHandoff';
import { useComparisonData } from './useComparisonData';
import { useDeckPopularityIndexData } from '../topdecks/data';
import { blendDecks, blendIdentity, type BlendMode } from './deckBlend';
import type { ComparedDeck } from './types';

const modes: {key:BlendMode;label:string}[] = [{key:'balanced',label:'Balanced'},{key:'popular',label:'Popular'},{key:'winning',label:'Winning'}];
export default function BlendDeck({decks,decklists,onRetry}: {decks:ComparedDeck[];decklists:Map<string,OmnidexDecklist|null>;onRetry:()=>void}) {
  const {cardsByName,deckStats}=useComparisonData(decks,decklists);
  const popularity=useDeckPopularityIndexData();
  const [mode,setMode]=useState<BlendMode>('balanced');
  const [baseKey,setBaseKey]=useState('');
  const [pending,startTransition]=useTransition();
  const sources=useMemo(()=>decks.flatMap((d,i)=>{const decklist=decklists.get(d.key);return decklist?[{key:d.key,label:d.label,format:deckStats[i].format,decklist}]:[];}),[decks,decklists,deckStats]);
  const identities=new Set(sources.map(s=>blendIdentity(s,cardsByName)));
  const effectiveBase=(sources.some(source=>source.key===baseKey)?baseKey:'') || (identities.size===1?sources[0]?.key:'') || '';
  const result=useMemo(()=>{
    if(decks.length<2) return {error:'Select at least two decks to see a blended deck.'};
    if(sources.length!==decks.length) return {error:'Waiting for all selected decklists.'};
    if(!cardsByName.size) return {error:'Loading card data…'};
    if(!effectiveBase) return {error:'Choose a base deck to set the Champion and Spirit lineup.'};
    try{return {value:blendDecks(sources,effectiveBase,mode,cardsByName,popularity?.entries)}}catch(error){return {error:(error as Error).message};}
  },[effectiveBase,sources,decks.length,mode,cardsByName,popularity]);
  const blend=result.value;
  const base=sources.find(s=>s.key===effectiveBase);
  const path=blend?blendBuilderPath(blend.decklist,blend.format,cardsByName):null;
  return <section data-component="BlendedDeckReport" aria-label="Blended deck report" aria-busy={pending}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 break-words"><h2 className="text-xl font-semibold">{blend ? `${modes.find(m=>m.key===mode)?.label} blend · ${blend.included} decks` : 'Blended deck'}</h2>
        {blend&&<p className="mt-1 text-sm text-ctp-subtext1">{blend.format} · {blend.status}{blend.excluded>0?` · ${blend.excluded} incompatible excluded`:''}</p>}
        {base&&blend&&<p className="mt-1 text-xs text-ctp-subtext1">Changes from {base.label}</p>}
      </div>
      {path&&!pending&&<Link className="flex min-h-control items-center rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base" to={path}>Create editable copy</Link>}
    </div>
    <div className="mt-4"><Tabs tabs={modes} active={mode} onChange={value=>startTransition(()=>setMode(value))} label="Blend weighting" baseId="blend-mode" variant="pill" wrap/></div>
    {identities.size>1&&<label className="mt-3 block text-sm">Base deck<select className="mt-1 block min-h-control w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 sm:max-w-lg" value={effectiveBase} onChange={e=>{const key=e.target.value;startTransition(()=>setBaseKey(key));}}><option value="">Choose a base deck</option>{sources.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>}
    {pending&&<p role="status" className="mt-2 text-xs text-ctp-subtext1">Recalculating…</p>}
    <TabPanel baseId="blend-mode" tab={mode} active={mode}>
      {result.error&&<p role="status" className="mt-4 text-sm text-ctp-yellow">{result.error}</p>}
      {sources.length!==decks.length&&<Button className="mt-2" onClick={onRetry}>Retry decklists</Button>}
      {blend&&<div aria-busy={pending} className="mt-4 space-y-4">
        {!popularity&&<p role="status" className="text-xs text-ctp-yellow">Tournament weights unavailable · equal source weights</p>}
        {blend.reasons.length>0&&<ul className="list-inside list-disc text-sm text-ctp-yellow">{blend.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
        {(['main','material','sideboard'] as const).map(section=><section key={section}><h3 className="mb-2 font-semibold capitalize">{section} · {blend.decklist[section].reduce((n,l)=>n+l.quantity,0)}</h3><div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">{blend.decklist[section].map(line=>{
          const card=cardsByName.get(line.card);const before=base?.decklist[section].filter(l=>l.card===line.card).reduce((n,l)=>n+l.quantity,0)??0;
          const content=<><CardArtTile card={card} name={line.card} cornerBadge={`${line.quantity}×`} tags={before!==line.quantity?[`${before} → ${line.quantity}`]:undefined}/><span className="mt-1 block break-words text-xs">{line.card}</span></>;
          return card?<Link key={line.card} target="_blank" to={`/cards/${card.slug}`} className="rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link>:<div key={line.card}>{content}</div>;
        })}</div>{base?.decklist[section].filter(l=>!blend.decklist[section].some(next=>next.card===l.card)).map(l=><p className="mt-2 text-xs text-ctp-subtext1" key={l.card}>{l.card} · {l.quantity} → 0</p>)}</section>)}
      </div>}
    </TabPanel>
  </section>;
}
