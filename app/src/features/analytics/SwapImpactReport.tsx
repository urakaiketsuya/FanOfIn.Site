import { useId, useMemo, useState } from 'react';
import type { AnalyticsDeck, Card } from '@gatcg/shared';
import { computeSwapImpact, type ImpactRow } from './swapImpact';
import { RangeMark, ReportCards } from './ForecastResult';
import { impactChange, impactValue } from './swapImpactPresentation';
import DisclosureChevron from '../../components/DisclosureChevron';
import Panel from '../../components/ui/Panel';
import Tabs, { TabPanel } from '../../components/ui/Tabs';

const checkpoints = [{ key: '3', label: 'Turn 3' }, { key: '5', label: 'Turn 5' }];

function OutcomeComparison({ row, max }: { row: ImpactRow; max: number }) {
  return <div className="min-w-0 space-y-4">
    {[{ label: 'Current', value: row.before }, { label: 'With swap', value: row.after }].map(({ label, value }) => <div key={label}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{label}</span><strong className="tabular-nums">{impactValue(row, value)}</strong></div>
      {row.probability
        ? <div className="mt-2 h-2 overflow-hidden rounded bg-ctp-surface1" aria-hidden="true"><div className="h-full bg-ctp-blue" style={{ width: `${value.median}%` }} /></div>
        : <RangeMark value={value} max={max} unit={row.unit} />}
    </div>)}
    <p className="text-xs text-ctp-subtext1">{row.probability ? '0–100% chance' : 'Middle 80% · dot: median'}</p>
  </div>;
}

export default function SwapImpactReport({ baseline, target, cardsByName }: { baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeSwapImpact(baseline, target, cardsByName), [baseline, target, cardsByName]);
  const [selectedId, setSelectedId] = useState('draw');
  const [turn, setTurn] = useState('5');
  const baseId = useId();
  const rows = report.rows.filter(row => row.turn === Number(turn));
  // Keep the player's preference when inputs change; fall back only while it is unavailable.
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const others = rows.filter(row => row.id !== selected?.id);
  const changes = (['main', 'material'] as const).flatMap(section => [...new Set([...baseline[section], ...target[section]].map(l => l.name))].flatMap(name => {
    const quantity = (deck: AnalyticsDeck) => deck[section].filter(l => l.name === name).reduce((n, l) => n + l.quantity, 0);
    const before = quantity(baseline), after = quantity(target);
    return before === after ? [] : [{ name, quantity: Math.max(before, after), detail: `${before} → ${after} · ${section === 'main' ? 'Main' : 'Material'}` }];
  }));
  // The same card may move between sections; keep both changes in one visible tile.
  const cards = [...new Set(changes.map(l => l.name))].map(name => ({ name, quantity: Math.max(...changes.filter(l => l.name === name).map(l => l.quantity)), detail: changes.filter(l => l.name === name).map(l => l.detail).join(' · ') }));
  if (!selected) return null;
  return <section data-component="SwapImpactReport" aria-labelledby={`${baseId}-title`} className="@container mt-4 min-w-0">
    <h3 id={`${baseId}-title`} className="mb-4 text-lg font-semibold">Swap impact</h3>
    <div className="grid items-start gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 max-w-md"><ReportCards lines={cards} cardsByName={cardsByName} /></div>
      <div className="min-w-0">
        {selected && <>
          <div className="mb-3">
            <label htmlFor={`${baseId}-outcome`} className="mb-1 block text-sm font-medium">Focus outcome</label>
            <div className="relative">
              <select id={`${baseId}-outcome`} value={selected.id} onChange={event => setSelectedId(event.target.value)} className="min-h-control w-full min-w-0 appearance-none rounded-lg border border-ctp-surface2 bg-ctp-base py-2 pl-3 pr-10 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue">
                {rows.map(row => <option key={row.id} value={row.id}>{row.label}{row.context ? ` · ${row.context.split(' · paid casts')[0]}` : ''}</option>)}
              </select>
              <DisclosureChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <Tabs tabs={checkpoints} active={turn} onChange={setTurn} baseId={baseId} label="Forecast checkpoint" variant="pill" wrap />
          <TabPanel baseId={baseId} tab={turn} active={turn} className="mt-3 rounded-xl focus-visible:outline-2 focus-visible:outline-ctp-blue">
            <Panel>
              <div className="mb-4" aria-live="polite" aria-atomic="true">
                <p className="mb-2 text-xs text-ctp-subtext1">Modeled · going first · turn {turn}</p>
                <h4 className="font-semibold">{selected.label}</h4>
                {selected.context && <p className="mt-1 text-xs text-ctp-subtext1">{selected.context}</p>}
                <p className="mt-3 text-2xl font-semibold tabular-nums text-ctp-blue">{impactChange(selected)}</p>
              </div>
              <OutcomeComparison row={selected} max={Math.max(1, ...report.rows.filter(row => row.id === selected.id).flatMap(row => [row.before.high, row.after.high]))} />
            </Panel>
            {others.length > 0 && <section className="mt-5" aria-label="Other outcomes">
              <h4 className="mb-1 text-sm font-semibold">Other outcomes</h4>
              <ul className="divide-y divide-ctp-surface1">
                {others.map(row => <li key={row.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h5 className="text-sm font-medium">{row.label}</h5><span className="text-sm font-medium tabular-nums">{impactChange(row)}</span></div>
                  {row.context && <p className="mt-1 text-xs text-ctp-subtext1">{row.context.split(' · paid casts')[0]}</p>}
                </li>)}
              </ul>
            </section>}
          </TabPanel>
        </>}
      </div>
    </div>
  </section>;
}
