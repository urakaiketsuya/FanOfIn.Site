import { useId, useState } from 'react';
import type { deckBuildComparison, BuildComparisonMetric, Card } from '@gatcg/shared';
import DeckBuildCards from './DeckBuildCards';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';

const groups = { size: 'Deck size', types: 'Card types', elements: 'Elements', reserve: 'Reserve cost', memory: 'Memory cost', progression: 'Champion memory cost' };
const number = (value: number) => Number(value.toFixed(1)).toString();

function Metric({ row, maximum }: { row: BuildComparisonMetric; maximum: number }) {
  const reference = row.reference;
  const position = (value: number) => `${value / maximum * 100}%`;
  return <div className="grid grid-cols-[minmax(0,1fr)_3rem_6rem] items-center gap-x-3 gap-y-1 py-2 text-xs">
    <span className="break-words">{row.label}</span>
    <strong className="text-right tabular-nums">{row.current}</strong>
    <span className="text-right tabular-nums">{reference ? number(reference.median) : '—'}</span>
    <div aria-hidden="true" className="relative col-span-3 mx-1 h-3 rounded bg-ctp-surface0">
      {reference && <><span className="absolute top-1 h-1 rounded bg-ctp-overlay1" style={{ left: position(reference.low), width: position(reference.high - reference.low) }} /><span className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-ctp-subtext1" style={{ left: position(reference.median) }} /></>}
      <span className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-ctp-base bg-ctp-blue" style={{ left: position(row.current) }} />
    </div>
    <span className="col-span-3 text-right text-ctp-subtext1">{reference ? `Middle 50%: ${number(reference.low)}–${number(reference.high)}` : 'Comparison unavailable'}</span>
  </div>;
}

export default function DeckBuildSummary({ comparison, cardsByName }: { comparison: ReturnType<typeof deckBuildComparison>; cardsByName: Map<string, Card> }) {
  const [section, setSection] = useState<'main' | 'material'>('main');
  const baseId = useId();
  const [group, setGroup] = useState('types');
  const [allCategories, setAllCategories] = useState(false);
  return <div className="space-y-3">
    <Tabs baseId={baseId} label="Comparison section" active={section} onChange={setSection} tabs={[{ key: 'main', label: 'Main' }, { key: 'material', label: 'Material' }]} />
    {comparison.sections.map(result => <TabPanel key={result.section} baseId={baseId} tab={result.section} active={section}>
      <DeckBuildCards key={result.section} rows={result.cards} cardsByName={cardsByName} />
      <p className="mb-3 text-xs text-ctp-subtext1">● Your deck · │ Build median · ━ Middle 50%</p>
      {result.unresolved > 0 && <p role="status" className="mb-3 text-xs text-ctp-yellow">{result.unresolved} copies missing card data.</p>}
      {result.complete < comparison.lists && <p className="mb-3 text-xs text-ctp-yellow">Composition coverage: {result.complete}/{comparison.lists} lists.</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm tabular-nums">{result.metrics[0].current} cards · build median {result.metrics[0].reference ? number(result.metrics[0].reference.median) : '—'}</p>
        <label className="flex items-center gap-2 text-sm">Compare
          <select value={group} onChange={event => setGroup(event.target.value)} className="min-h-control max-w-full rounded border border-ctp-surface1 bg-ctp-base px-2 focus-visible:outline-2 focus-visible:outline-ctp-blue">
            {Object.entries(groups).filter(([key]) => key !== 'size').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>
      {(() => {
        const categories = result.metrics.filter(row => row.group === group);
        const rows = allCategories ? categories : categories.filter(row => row.current > 0 || !row.reference || row.reference.high > 0);
        const maximum = Math.max(1, ...rows.flatMap(row => [row.current, row.reference?.high ?? 0, row.reference?.median ?? 0]));
        return <section aria-label={groups[group as keyof typeof groups]} className="min-w-0 rounded-lg border border-ctp-surface1 p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_3rem_6rem] gap-3 text-xs text-ctp-subtext1"><span>{group === 'types' ? 'Type' : group === 'elements' ? 'Element' : 'Cost'}</span><span className="text-right">Yours</span><span className="text-right">Build median</span></div>
          {rows.length ? rows.map(row => <Metric key={row.label} row={row} maximum={maximum} />) : <p role="status" className="py-3 text-sm text-ctp-subtext1">{categories.length ? 'Zero copies in your deck and the build’s middle 50%.' : 'No matching cards in these lists.'}</p>}
          {(allCategories || rows.length < categories.length) && <Button aria-pressed={allCategories} onClick={() => setAllCategories(value => !value)}>{allCategories ? 'Hide zero-range categories' : `Show all ${categories.length} categories`}</Button>}
        </section>;
      })()}

    </TabPanel>)}
  </div>;
}
