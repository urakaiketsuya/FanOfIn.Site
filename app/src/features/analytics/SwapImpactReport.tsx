import { rangeText } from './reportFormatting';
import { useMemo } from 'react';
import type { AnalyticsDeck, Card } from '@gatcg/shared';
import { computeSwapImpact } from './swapImpact';
import { RangeMark, ReportCards } from './ForecastResult';

export default function SwapImpactReport({ baseline, target, cardsByName }: { baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeSwapImpact(baseline, target, cardsByName), [baseline, target, cardsByName]);
  const changes = (['main', 'material'] as const).flatMap(section => [...new Set([...baseline[section], ...target[section]].map(l => l.name))].flatMap(name => {
    const quantity = (deck: AnalyticsDeck) => deck[section].filter(l => l.name === name).reduce((n, l) => n + l.quantity, 0);
    const before = quantity(baseline), after = quantity(target);
    return before === after ? [] : [{ name, quantity: Math.max(before, after), detail: `${before} → ${after} · ${section === 'main' ? 'Main' : 'Material'}` }];
  }));
  // The same card may move between sections; keep both changes in one visible tile.
  const cards = [...new Set(changes.map(l => l.name))].map(name => ({ name, quantity: Math.max(...changes.filter(l => l.name === name).map(l => l.quantity)), detail: changes.filter(l => l.name === name).map(l => l.detail).join(' · ') }));
  return <section data-component="SwapImpactReport" className="mt-4 min-w-0"><h3 className="mb-4 text-lg font-semibold">Swap impact</h3><div className="max-w-md"><ReportCards lines={cards} cardsByName={cardsByName} /></div><p className="my-4 text-xs text-ctp-subtext1">Going first · turns 3 & 5</p>
    {report.unavailable.map(message => <p key={message} role="status" className="mb-2 text-sm">{message}</p>)}
    {!report.rows.length && <p role="status" className="py-3 text-sm">{report.unavailable.length ? 'No comparable forecast changes available.' : report.supported ? 'No changes in supported turn-3/5 forecasts.' : 'No supported forecasts for this pair.'}</p>}
    {report.rows.filter(row => row.turn === 5).map(row => {
      const early = report.rows.find(p => p.id === row.id && p.turn === 3);
      const delta = row.after.median - row.before.median;
      const displayDelta = Number(delta.toFixed(1));
      return <section key={row.id} className="grid gap-4 border-t border-ctp-surface1 py-5 sm:grid-cols-2"><div><h4 className="font-medium">{row.label}</h4><p className="mt-2 flex flex-wrap items-baseline gap-2"><strong className="text-3xl font-semibold tabular-nums">{displayDelta > 0 ? '+' : ''}{displayDelta}</strong><span className="text-sm">{row.unit}</span></p><p className="text-xs text-ctp-subtext1">{row.probability ? 'Chance change · turn 5' : 'Median change · by turn 5'}</p>{row.context && <p className="mt-2 text-xs text-ctp-subtext1">{row.context}</p>}</div><div className="min-w-0 space-y-3">{[{ label: 'Current', value: row.before }, { label: 'With swap', value: row.after }].map(({ label, value }) => <div key={label}><p className="flex justify-between gap-2 text-sm"><span>{label}</span><strong className="tabular-nums">{row.probability ? `${Number(value.median.toFixed(1))}%` : rangeText(value)}</strong></p>{row.probability ? <div className="mt-2 h-1.5 overflow-hidden rounded bg-ctp-surface1" aria-hidden="true"><div className="h-full bg-ctp-teal" style={{ width: `${value.median}%` }} /></div> : <RangeMark value={value} max={Math.max(1, row.before.high, row.after.high)} unit={row.unit} />}</div>)}{early && <p className="border-t border-ctp-surface1 pt-3 text-xs tabular-nums">Turn 3 · {row.probability ? `${Number(early.before.median.toFixed(1))}% → ${Number(early.after.median.toFixed(1))}%` : `${rangeText(early.before)} → ${rangeText(early.after)}`}</p>}</div></section>;
    })}
    {report.rows.some(r => !r.probability) && <p className="mt-2 text-xs text-ctp-subtext1">Ranges: middle 80% · dot: median</p>}
  </section>;
}
