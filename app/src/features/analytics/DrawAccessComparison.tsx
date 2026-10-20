import { compareDrawAccess, copies, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';

export default function DrawAccessComparison({ baseline, target, cardsByName, baselineLabel, targetLabel }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string;
}) {
  const rows = compareDrawAccess(baseline.main, target.main);
  return <section data-component="DrawAccessComparison" className="mt-4">
    <h4 className="font-semibold">What changes your draw access?</h4>
    <p className="mt-1 text-xs text-ctp-subtext1">Chance of drawing at least one · {baselineLabel} → {targetLabel}</p>
    <p className="mt-1 text-xs text-ctp-subtext1">Open dot: before · filled dot: after · 0–100% scale</p>
    <p className="mt-1 text-xs text-ctp-subtext1">Main library: {copies(baseline.main)} → {copies(target.main)} cards</p>
    {!rows.length && <p className="mt-3 text-sm">Main-card access is unchanged.</p>}
    <div className="mt-3 space-y-4">{rows.map(row => <article key={row.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
      <h5 className="text-sm font-semibold">{row.name} · {row.beforeCopies} → {row.afterCopies} copies</h5>
      <div className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{row.points.map(point => {
        const delta = (point.after - point.before) * 100;
        return <div key={point.seen} className="min-w-0">
          <p className="text-xs text-ctp-subtext1">{point.seen} cards seen</p>
          <p className="mt-1 text-sm tabular-nums">{(point.before * 100).toFixed(1)}% → {(point.after * 100).toFixed(1)}%</p>
          <svg viewBox="0 0 110 22" aria-hidden="true" className="mt-1 w-full">
            <line x1="5" x2="105" y1="11" y2="11" className="stroke-ctp-surface2" />
            <line x1={5 + point.before * 100} x2={5 + point.after * 100} y1="11" y2="11" className="stroke-ctp-blue" strokeWidth="3" />
            <circle cx={5 + point.before * 100} cy="11" r="4" className="fill-ctp-mantle stroke-ctp-text" strokeWidth="2" />
            <circle cx={5 + point.after * 100} cy="11" r="3" className="fill-ctp-blue" />
          </svg>
          <p className="text-xs font-semibold tabular-nums">{delta > 0 ? '+' : ''}{delta.toFixed(1)} percentage points</p>
        </div>;
      })}</div>
      <div className="max-w-40"><AssociatedCards lines={[{ name: row.name, quantity: Math.max(row.beforeCopies, row.afterCopies), detail: `${row.beforeCopies} → ${row.afterCopies}` }]} cardsByName={cardsByName} /></div>
    </article>)}</div>
  </section>;
}
