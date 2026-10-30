import { useMemo } from 'react';
import { computeCombatAccessForecast, REPORT_DRAW_CHECKPOINTS, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
export default function CombatRangeComparison({ baseline, target, cardsByName }: { baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const points = useMemo(() => REPORT_DRAW_CHECKPOINTS.map(seen => ({ seen,
    a: computeCombatAccessForecast(baseline.main, baseline.material, cardsByName, seen),
    b: computeCombatAccessForecast(target.main, target.material, cardsByName, seen),
  })), [baseline, target, cardsByName]);
  const names = new Set(points.flatMap(p => [...p.a.sources, ...p.b.sources].map(s => s.name)));
  for (const line of [...baseline.main, ...target.main]) if (cardsByName.get(line.name)?.types.includes('ALLY')) names.add(line.name);
  if (!names.size && !points.some(p => p.a.unavailable || p.b.unavailable)) return null;
  return <section className="my-4" data-component="CombatRangeComparison">
    <h4 className="font-semibold">Ally power comparison</h4>
    <p className="mt-1 text-xs text-ctp-subtext1">Baseline → target · median (middle 80%) · sources resolved</p>
    {points.some(p => p.a.unavailable || p.b.unavailable) ? <p role="status" className="mt-2 text-sm">Card data incomplete · comparison unavailable</p> : <>
      <div className="my-3 grid gap-3 sm:grid-cols-2">{(['printedRange', 'boostedRange'] as const).map(key => <div key={key} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h5 className="mb-3 text-sm font-semibold">{key === 'printedRange' ? 'Printed power' : 'With supported boosts'}</h5>
        {points.map(({seen,a,b}) => <div key={seen} className="my-3 text-xs"><p className="flex flex-wrap justify-between gap-2"><span>{seen} seen</span><strong>{a[key].median} ({a[key].low}–{a[key].high}) → {b[key].median} ({b[key].low}–{b[key].high})</strong></p>
          {key === 'boostedRange' && <p className="mt-1 text-ctp-subtext1">Eligible boost: {(a.boostAccessChance*100).toFixed(1)}% → {(b.boostAccessChance*100).toFixed(1)}%</p>}
        </div>)}
      </div>)}</div>
      <AssociatedCards lines={[...names].map(name => {
        const count = (deck: AnalyticsDeck) => [...deck.main,...deck.material].filter(l=>l.name===name).reduce((sum,l)=>sum+l.quantity,0);
        const a=count(baseline), b=count(target); return {name,quantity:Math.max(a,b),detail:`${a} → ${b} copies`};
      })} cardsByName={cardsByName} />
    </>}
  </section>;
}
