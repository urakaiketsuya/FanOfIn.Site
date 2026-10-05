import { useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { publishedField, scoreExpectedField, type ArchetypeData } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import { useChampionCardImages } from '../players/useChampionCardImages';

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ExpectedField({ data }: { data: ArchetypeData }) {
  const defaults = useMemo(() => publishedField(data.archetypes), [data]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const names = useMemo(() => defaults.map(row => row.champion), [defaults]);
  const cards = useChampionCardImages(names);
  const field = useMemo(() => defaults.map(row => ({ ...row, weight: Number(applied[row.champion] ?? row.weight) })), [defaults, applied]);
  const results = useMemo(() => scoreExpectedField(names, field, data.battleChart), [names, field, data.battleChart]);
  const invalid = Object.values(draft).some(value => value.trim() !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0));
  const total = field.reduce((sum, row) => sum + row.weight, 0);

  function update(champion: string, value: string) {
    const next = { ...draft, [champion]: value };
    setDraft(next);
    startTransition(() => setApplied(next));
  }

  return <div className="mt-6 space-y-5">
    <div>
      <h2 className="text-xl font-semibold">Explore a field</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Champion-level estimates · published deck shares · updated {data.generatedAt.slice(0, 10)}</p>
      <a href="#expected-opponents" className="inline-flex min-h-control items-center text-sm text-ctp-blue underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Edit expected opponents</a>
      <p className="mt-1 text-sm text-ctp-subtext0">Draws count as half. Ordered by the lower score bound; ranges show missing matchups, not statistical confidence.</p>
    </div>
    <div role="status" aria-live="polite" className="text-sm text-ctp-subtext1">{pending ? 'Recalculating…' : invalid ? 'Enter a non-negative number for every field weight.' : total <= 0 ? 'Add a positive field weight to see results.' : `${results.length} Champions compared`}</div>
    {!invalid && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
      {(showAll ? results : results.slice(0, 6)).map(result => {
        const card = cards.get(result.champion);
        return <Panel key={result.champion} as="article" padding="sm">
          <div className="flex items-start gap-3">
            <div className="w-20 shrink-0">{card ? <Link to={`/cards/${card.slug}`} aria-label={`View ${card.name}`}><CardArtTile card={card} name={card.name} /></Link> : <CardArtTile card={undefined} name={result.champion} />}</div>
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-semibold">{result.champion}</h3>
              <div className="mt-2 text-xl font-semibold tabular-nums">{result.missing.length ? `${percent(result.lower)}–${percent(result.upper)}` : percent(result.lower)}</div>
              <p className="text-xs text-ctp-subtext1">{result.missing.length ? 'Possible score range' : 'Estimated score'}</p>
              <p className="mt-2 text-xs text-ctp-subtext1">{percent(result.coverage)} field covered · {result.games.toLocaleString()} observed matches</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-ctp-surface0" aria-hidden="true"><div className="h-full bg-ctp-blue" style={{ width: percent(result.coverage) }} /></div>
          {result.missing.length > 0 && <p className="mt-2 text-xs text-ctp-subtext0">Missing: {result.missing.join(', ')}</p>}
        </Panel>;
      })}
    </div>}
    {!invalid && results.length > 6 && <Button aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? "Show fewer Champions" : `Show all ${results.length} Champions`}</Button>}
    <Panel id="expected-opponents" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Expected opponents</h2><p className="text-sm text-ctp-subtext1">Relative weights become shares automatically. Set 0 to exclude.</p></div>
        <Button onClick={() => { setDraft({}); startTransition(() => setApplied({})); }}>Reset to published shares</Button>
      </div>
      {invalid && <p role="alert" className="mt-3 text-sm text-ctp-red">Use non-negative numbers for field weights.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {defaults.map(row => <label key={row.champion} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-ctp-base p-2">
          <span className="min-w-0 break-words text-sm">{row.champion}<span className="block text-xs text-ctp-subtext0">{!invalid && total > 0 ? percent(Number(applied[row.champion] ?? row.weight) / total) : '—'} of field</span></span>
          <input type="number" min="0" step="any" inputMode="decimal" aria-label={`${row.champion} field weight`} aria-invalid={Number(draft[row.champion] ?? row.weight) < 0 || !Number.isFinite(Number(draft[row.champion] ?? row.weight))} value={draft[row.champion] ?? row.weight} onChange={event => update(row.champion, event.target.value)} className="min-h-control w-24 shrink-0 rounded border border-ctp-surface1 bg-ctp-mantle px-3 text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue" />
        </label>)}
      </div>
    </Panel>
  </div>;
}
