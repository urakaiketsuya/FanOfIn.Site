import { useCasellaPoints } from './useCasellaPoints';
import { type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

export default function CasellaCombatReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const {points,pending}=useCasellaPoints(deck,cardsByName);
  if(points?.some(p=>!p.available)) return null;
  return <Panel data-component="CasellaCombatReport" aria-busy={pending || !points}>
    <h3 className="font-semibold">Casella burst potential</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Level 3 · 4 starting aria · paid sequences · unopposed</p>
    {!points ? <p role="status" className="mt-3">Calculating sequences…</p> : <>
      <p className="mt-2 text-xs text-ctp-subtext1">Sampled access · median and middle 80%</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{points.map(p=><section key={p.seen} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h4 className="text-sm">{p.seen} cards seen</h4><p className="mt-2"><strong className="text-2xl">{p.median}</strong><span className="ml-2 text-sm">damage · {p.low}–{p.high}</span></p>
        <p className="mt-1 text-xs">{(p.repeatChance*100).toFixed(0)}% repeat-attack lines</p>
        {p.representative && <><dl className="my-3 grid grid-cols-2 gap-2 text-xs">{([['First attacks',p.representative.first],['Repeat attacks',p.representative.repeat],['Buffs',p.representative.buffs],['Triggered damage',p.representative.triggered]] as const).map(([label,value])=><div key={label}><dt className="text-ctp-subtext0">{label}</dt><dd className="text-base font-semibold">{value}</dd></div>)}</dl><AssociatedCards lines={p.representative.sources.map(name=>({name,quantity:[...deck.main,...deck.material,...(deck.song ?? [])].filter(l=>l.name===name).reduce((n,l)=>n+l.quantity,0),detail:'In deck'}))} cardsByName={cardsByName} /></>}
      </section>)}</div>
    </>}
  </Panel>;
}
