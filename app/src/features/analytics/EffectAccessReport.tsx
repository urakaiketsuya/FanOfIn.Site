import { useMemo } from 'react';
import { effectAccessReport, type AnalyticsDeck, type Card } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';

export default function EffectAccessReport({ deck, cardsByName, baseline }: { deck: AnalyticsDeck; cardsByName: Map<string, Card>; baseline?: AnalyticsDeck }) {
  const report = useMemo(() => effectAccessReport(deck, cardsByName), [deck, cardsByName]);
  const before = useMemo(() => baseline ? effectAccessReport(baseline, cardsByName) : null, [baseline, cardsByName]);
  const ids = [...new Set([...report.rows, ...before?.rows ?? []].map(row => row.id))];
  return <Panel data-component="EffectAccessReport">
    <h3 className="font-semibold">{baseline ? 'Effect access comparison' : 'Effects in your draws'}</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Reviewed sources · median copies · middle 80% of draws{baseline ? ' · baseline → target' : ''}</p>
    {report.unavailable || before?.unavailable ? <p role="status" className="mt-3 text-sm">Card data incomplete · report unavailable</p> : !ids.length ? <p className="mt-3 text-sm">No reviewed effect sources.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{ids.map(id => {
      const row = report.rows.find(r => r.id === id), previous = before?.rows.find(r => r.id === id);
      const source = row ?? previous!;
      const names = new Set([...row?.lines ?? [], ...previous?.lines ?? []].map(line => line.name));
      const lines = [...names].map(name => {
        const a = previous?.lines.find(l => l.name === name)?.quantity ?? 0, b = row?.lines.find(l => l.name === name)?.quantity ?? 0;
        return { name, quantity: Math.max(a, b), detail: baseline ? `${a} → ${b} copies` : undefined };
      });
      return <article key={id} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h4 className="mb-3 text-sm font-semibold">{source.label}</h4>
        <AssociatedCards lines={lines} cardsByName={cardsByName} />
        <div className="mt-4 space-y-3">{source.points.map((p, i) => {
          const a = previous?.points[i], b = row?.points[i];
          const delta = ((b?.access ?? 0) - (a?.access ?? 0)) * 100;
          return <div key={p.seen}>
            <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{p.seen} seen</span><strong>{baseline ? `${((a?.access ?? 0) * 100).toFixed(1)}% → ` : ''}{((b?.access ?? 0) * 100).toFixed(1)}% to find{baseline ? ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp` : ''}</strong></div>
            <div className="my-1 h-1.5 overflow-hidden rounded bg-ctp-surface1" aria-hidden="true"><div className="h-full bg-ctp-teal" style={{ width: `${(b?.access ?? 0) * 100}%` }} /></div>
            <p className="text-xs text-ctp-subtext1">{baseline ? `${a?.median ?? 0} (${a?.low ?? 0}–${a?.high ?? 0}) → ` : ''}{b?.median ?? 0} copies · {b?.low ?? 0}–{b?.high ?? 0}</p>
          </div>;
        })}</div>
        {(row?.material.length || previous?.material.length) ? <div className="mt-3"><p className="mb-2 text-xs">Material · outside draws</p><AssociatedCards lines={row?.material ?? previous?.material ?? []} cardsByName={cardsByName} /></div> : null}
      </article>;
    })}</div>}
  </Panel>;
}
