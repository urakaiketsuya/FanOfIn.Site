import AssociatedCards from '../../components/AssociatedCards';
import {useCasellaPoints} from './useCasellaPoints';
import { type AnalyticsDeck, type Card } from '@gatcg/shared';
export default function CasellaCombatComparison({baseline,target,cardsByName}:{baseline:AnalyticsDeck;target:AnalyticsDeck;cardsByName:Map<string,Card>}) {
  const a=useCasellaPoints(baseline,cardsByName), b=useCasellaPoints(target,cardsByName);
  if(!a.points || !b.points) return <p role="status">Calculating Casella comparison…</p>;
  if(a.points.some(p=>!p.available)||b.points.some(p=>!p.available)) return null;
  const points=a.points.flatMap(p=>{const other=b.points!.find(q=>q.seen===p.seen);return other?[{seen:p.seen,a:p,b:other}]:[];});
  const all=(deck:AnalyticsDeck)=>[...deck.main,...deck.material,...(deck.song ?? [])];
  const count=(deck:AnalyticsDeck,name:string)=>all(deck).filter(l=>l.name===name).reduce((n,l)=>n+l.quantity,0);
  const changes=[...new Set([...all(baseline),...all(target)].map(l=>l.name))].filter(name=>count(baseline,name)!==count(target,name)).map(name=>({name,quantity:Math.max(count(baseline,name),count(target,name)),detail:`${count(baseline,name)} → ${count(target,name)} copies`}));
  return <section className="my-4" data-component="CasellaCombatComparison"><h4 className="font-semibold">Casella burst comparison</h4><p className="mt-1 text-xs text-ctp-subtext1">Level 3 · 4 aria · unopposed · baseline → target</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{points.map(({seen,a,b})=><div key={seen} className="rounded-xl bg-ctp-mantle p-3"><p className="text-sm">{seen} cards seen</p><p className="mt-2 font-semibold">{a.median} ({a.low}–{a.high}) → {b.median} ({b.low}–{b.high})</p><p className="mt-1 text-xs">Median damage · middle 80%</p></div>)}</div><AssociatedCards lines={changes} cardsByName={cardsByName} /></section>;
}
