import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { forecastDeck, type DeckForecastModel, type DeckFormat, type OmnidexDecklist } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardsByNames } from '../events/useCardsByNames';
import CardArtTile from '../../components/CardArtTile';
import DisclosureChevron from '../../components/DisclosureChevron';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const key='analysis-deck-forecast',url='/data/analysis/deck-forecast.json';
const percent=(n:number)=>`${Math.round(n*100)}%`;
export default function DeckExpectedResults({decklist,championName,format,legal=true}:{decklist:OmnidexDecklist;championName:string|null;format:DeckFormat;legal?:boolean}) {
  const [expanded,setExpanded]=useState(false);
  const matchupId=useId();
  const enabled=format==='STANDARD';
  const model=usePublishedData<DeckForecastModel>(key,url,enabled,true);
  const status=usePublishedDataStatus(key,url,enabled);
  const deck=useMemo(()=>({champion:championName?.split(',')[0].trim()??'',cards:[...decklist.main,...decklist.material].map(l=>[l.card,l.quantity] as [string,number])}),[decklist,championName]);
  const [result,setResult]=useState<ReturnType<typeof forecastDeck>>();
  const [pending,startTransition]=useTransition();
  useEffect(()=>{startTransition(()=>setResult(model?forecastDeck(deck,model,format):undefined));},[deck,model,format]);
  const names=useMemo(()=>result?.status==='ready'?result.matchups.map(r=>r.card):[],[result]);
  const cards=useCardsByNames(names);
  let message:string|null=null;
  if(!enabled)message='Standard decks only';
  else if(!legal||!deck.champion||!decklist.main.length)message='Complete a legal deck to see expected results';
  else if(status.phase==='error'&&!model)message='Expected results unavailable';
  else if(!model||!result)message='Loading expected results…';
  else if(result.status==='unsupported-champion')message='Champion not yet supported';
  else if(result.status==='incomplete')message='Complete a deck to see expected results';
  else if(result.status!=='ready')message='Field update needed';
  return <Panel>
    <section aria-label="Expected results" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ctp-text">Expected results</h3><span className="rounded bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext0">Beta</span></div>
      {message?<div className="mt-3 text-sm text-ctp-subtext0" role="status">{message}{status.phase==='error'&&enabled&&<Button onClick={status.retry} className="ml-2">Retry</Button>}</div>:result?.status==='ready'&&model&&<>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1"><strong className="text-5xl tabular-nums text-ctp-teal">{percent(result.score)}</strong><div className="pb-1 text-sm"><div>Expected match score</div><div className="text-ctp-subtext0">Equal skill · Sampled field</div></div></div>
        <p className="mt-3 text-xs text-ctp-subtext0">{model.season} · Field as of {model.asOf} · {model.coverage.modeledEntrants.toLocaleString()} decks</p>
        {result.cardCoverage<1&&<p className="mt-1 text-xs text-ctp-yellow">{percent(result.cardCoverage)} card coverage</p>}
        <div role="status" className="text-xs text-ctp-subtext0">{pending?'Recalculating…':''}</div>
        <h4 className="mt-4 text-sm font-medium">By matchup</h4>
        <div id={matchupId} className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(expanded?result.matchups:result.matchups.slice(0,6)).map(row=>{const card=cards.get(row.card);const art=<CardArtTile card={card} name={row.card} artworkOnly/>;return <div key={row.champion} className="flex min-w-0 items-center gap-3 rounded-lg bg-ctp-mantle p-3">
            {card?<Link to={`/cards/${card.slug}`} aria-label={row.card} className="block w-20 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{art}</Link>:<div className="w-20 shrink-0">{art}</div>}
            <div className="min-w-0 flex-1"><div className="break-words text-sm font-medium">{row.card}</div><div className="flex flex-wrap items-baseline justify-between gap-1"><strong className="text-xl tabular-nums">{percent(row.score)}</strong><span className="text-xs text-ctp-subtext0">{row.share<.005?'<1%':percent(row.share)} of field</span></div></div>
          </div>;})}
        </div>
        {result.matchups.length>6&&<Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} aria-controls={matchupId} onClick={()=>setExpanded(v=>!v)}>{expanded?'Fewer matchups':`All ${result.matchups.length} matchups`}<DisclosureChevron className={expanded?"rotate-180":""}/></Button>}
      </>}
    </section>
  </Panel>;
}
