import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BattleChartEntry, FieldWeight } from '@gatcg/shared';
import type { EquilibriumInput, EquilibriumResponse } from './fieldEquilibrium.worker';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import CardArtTile from '../../components/CardArtTile';
import { useChampionCardImages } from '../players/useChampionCardImages';
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function FieldEquilibrium({ field, chart, valid, description }: { field: FieldWeight[]; chart: BattleChartEntry[]; valid: boolean; description: string }) {
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const input = useMemo(() => ({ field, chart }), [field, chart]);
  const [state, setState] = useState<{ input: EquilibriumInput; response: EquilibriumResponse } | null>(null);
  const names = useMemo(() => field.map(row => row.champion), [field]);
  const cards = useChampionCardImages(names);
  useEffect(() => {
    if (!enabled || !valid || !field.length) return;
    let active = true;
    let worker: Worker | undefined;
    const fail = () => { if (active) setState({ input, response: { error: 'Equilibrium benchmark could not run. Try again.' } }); worker?.terminate(); };
    try {
      worker = new Worker(new URL('./fieldEquilibrium.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<EquilibriumResponse>) => { if (active) setState({ input, response: event.data }); worker?.terminate(); };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage(input);
    } catch { fail(); }
    return () => { active = false; worker?.terminate(); };
  }, [enabled, valid, field.length, input, attempt]);
  const response = enabled && state?.input === input ? state.response : null;
  const result = response?.result;
  const artwork = (champion: string) => {
    const card = cards.get(champion);
    return <div className="w-16 shrink-0">{card ? <Link to={`/cards/${card.slug}`} aria-label={`View ${card.name}`}><CardArtTile card={card} name={card.name} /></Link> : <CardArtTile card={undefined} name={champion} />}</div>;
  };
  return <section id="field-benchmark" aria-label="Equilibrium benchmark" className="scroll-mt-24 space-y-3">
    <Button aria-expanded={enabled} aria-controls="field-equilibrium-results" onClick={() => setEnabled(value => !value)}>{enabled ? 'Hide equilibrium benchmark' : 'Explore equilibrium benchmark'}</Button>
    {enabled && <Panel id="field-equilibrium-results">
      <h2 className="text-lg font-semibold">Equilibrium benchmark</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">{description}</p>
      <p className="mt-1 text-xs text-ctp-subtext0">Published shares select the pool. Your opponent weights and stress test do not change this benchmark.</p>
      {!valid ? <p role="status" className="mt-3">Choose valid event dates.</p> : !field.length ? <p role="status" className="mt-3">No public Champion decks in this scope.</p> : response?.error ? <p role="alert" className="mt-3">{response.error} <Button onClick={() => { setState(null); setAttempt(value => value + 1); }}>Retry benchmark</Button></p> : !result ? <p role="status" className="mt-3">Calculating equilibrium benchmark…</p> : !result.benchmark ? <p role="status" className="mt-3">Not enough qualifying matchups for a pool of two or more Champions.</p> : <>
        <p className="mt-3 font-medium">{result.pool.included.length} Champions · {percent(result.pool.retainedFieldShare)} of published decks · every pair covered</p>
        <p className="mt-1 text-sm text-ctp-subtext1">Restricted-pool strategy · model estimate, not a field forecast</p>
        {result.responses.some(row => row.lower > .5) && <p className="mt-1 text-sm text-ctp-subtext1">Excluded Champions score above 50% against this mix. See their responses below.</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...result.benchmark.strategies].sort((a, b) => b.conservativeShare - a.conservativeShare).map(row => <article key={row.champion} className="flex min-w-0 gap-3 rounded-lg bg-ctp-base p-3">
            {artwork(row.champion)}<div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{row.champion}</h3><p className="text-xl tabular-nums">{percent(row.conservativeShare)}</p><p className="text-xs text-ctp-subtext1">Strategy share</p><div aria-hidden="true" className="mt-2 h-2 rounded bg-ctp-surface1"><div className="h-full rounded bg-ctp-blue" style={{ width: percent(row.conservativeShare) }} /></div></div>
          </article>)}
        </div>
        <p className="mt-3 text-xs text-ctp-subtext1">Numerical gap: {(result.benchmark.pessimistic.gap * 100).toFixed(2)} percentage points. Statistical confidence is unvalidated.</p>
        <h3 className="mt-5 font-semibold">Outside the pool · {result.pool.excluded.length} Champions</h3>
        <p className="mt-1 text-sm text-ctp-subtext1">Scores below test excluded Champions against this strategy. Above 50% can expose a weakness outside the pool.</p>
        {!result.pool.excluded.length ? <p className="mt-2 text-sm">All Champions in this scope are included.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {result.responses.map(row => <article key={row.champion} className="rounded-lg bg-ctp-base p-3">
            <div className="flex gap-3">{artwork(row.champion)}<div className="min-w-0"><h4 className="break-words font-semibold">{row.champion}</h4><p className="text-lg tabular-nums">{percent(row.lower)}–{percent(row.upper)}</p><p className="text-xs text-ctp-subtext1">Score against strategy · {row.games} observed matches</p></div></div>
            <p className="mt-2 text-xs text-ctp-subtext1">Excluded: missing matchups against {result.pool.excluded.find(excluded => excluded.champion === row.champion)?.missingAgainst.join(', ')}.</p>
          </article>)}
        </div>}
      </>}
    </Panel>}
  </section>;
}
