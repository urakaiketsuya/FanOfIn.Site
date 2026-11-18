import { useCasellaPoints } from './useCasellaPoints';
import { type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

export default function CasellaCombatReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const {points,pending}=useCasellaPoints(deck,cardsByName);
  if(points?.some(p=>!p.available)) return null;
  const scale=Math.max(1,...(points ?? []).map(p=>p.high));
  return <Panel data-component="CasellaCombatReport" aria-busy={pending || !points}>
    <h3 className="font-semibold">Casella damage progression</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Going first · cumulative damage · unopposed</p>
    {!points ? <p role="status" className="mt-3">Calculating sequences…</p> : <>
      <p className="mt-2 text-xs text-ctp-subtext1">Median · middle 80% of sampled games</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{points.map(p=><section key={p.turn} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h4 className="text-sm">By your turn {p.turn}</h4><p className="mt-2"><strong className="text-2xl">{p.median}</strong><span className="ml-2 text-sm">damage · {p.low}–{p.high}</span></p>
        <svg viewBox="0 0 300 20" className="my-2 w-full" aria-hidden="true"><line x1="0" x2="300" y1="10" y2="10" stroke="currentColor" className="text-ctp-surface1" strokeWidth="2"/><line x1={p.low/scale*300} x2={p.high/scale*300} y1="10" y2="10" stroke="currentColor" className="text-ctp-teal" strokeWidth="6"/><circle cx={p.median/scale*300} cy="10" r="6" className="fill-ctp-text"/></svg><p className="mt-1 text-xs">{(p.levelThreeChance*100).toFixed(0)}% level 3 · {(p.repeatChance*100).toFixed(0)}% repeat attacks</p>
        {p.representative && <><p className="mt-3 text-xs text-ctp-subtext1">Median-damage line</p><dl className="my-3 grid grid-cols-2 gap-2 text-xs">{([['Regular attacks',p.representative.first],['Replay attacks',p.representative.repeat],['Buffs',p.representative.buffs],['Triggered damage',p.representative.triggered],['Allies in play',p.representative.allies],['Cards accessed',p.representative.drawn]] as const).map(([label,value])=><div key={label}><dt className="text-ctp-subtext0">{label}</dt><dd className="text-base font-semibold">{value}</dd></div>)}</dl><AssociatedCards lines={p.representative.sources.map(name=>({name,quantity:[...deck.main,...deck.material,...(deck.song ?? [])].filter(l=>l.name===name).reduce((n,l)=>n+l.quantity,0),detail:'In deck'}))} cardsByName={cardsByName} /></>}
      </section>)}</div>
    </>}
  </Panel>;
}
