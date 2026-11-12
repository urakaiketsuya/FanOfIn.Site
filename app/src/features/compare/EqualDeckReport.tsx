import { useEffect, useMemo, useState, useTransition } from 'react';
import type { OmnidexDecklist } from '@gatcg/shared';
import { useCardCatalog } from '../cards/useCardCatalog';
import { ForecastChance, ForecastRange, ReportCards } from '../analytics/ForecastResult';
import Button from '../../components/ui/Button';
import Panel from '../../components/ui/Panel';
import EffectAccessReport from '../analytics/EffectAccessReport';
import CombatRangeComparison from '../analytics/CombatRangeComparison';
import DrawAccessExplorer from './DrawAccessExplorer';
import { automaticForecast, forecastCoverage, visibleForecastMetrics, type DeckForecast } from './automaticForecastModel';
import type { ComparedDeck } from './types';

export default function EqualDeckReport({ decks, decklists, onRetry }: { decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; onRetry: () => void }) {
  const catalog = useCardCatalog();
  const cards = useMemo(() => new Map(catalog.map(c => [c.name, c])), [catalog]);
  const inputs = useMemo(() => decks.map(deck => {
    const list = decklists.get(deck.key);
    return { ...deck, status: list ? undefined : decklists.has(deck.key) ? 'Decklist unavailable' : 'Loading decklist…',
      deck: list ? { main: list.main.map(l => ({ name: l.card, quantity: l.quantity })), material: list.material.map(l => ({ name: l.card, quantity: l.quantity })) } : null };
  }), [decks, decklists]);
  const [result, setResult] = useState<{ inputs: typeof inputs; cards: typeof cards; reports: DeckForecast[] }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    setFailed(false);
    if (!cards.size || inputs.length < 2) return;
    const timer = setTimeout(() => {
      try {
        const coverage = forecastCoverage(inputs.flatMap(i => i.deck ? [i.deck] : []));
        const reports = inputs.map(i => i.deck ? automaticForecast(i.deck, cards, coverage) : { metrics: [], status: i.status });
        startTransition(() => setResult({ inputs, cards, reports }));
      } catch { setFailed(true); }
    }, 0);
    return () => clearTimeout(timer);
  }, [inputs, cards, attempt]);
  const ready = result?.inputs === inputs && result.cards === cards;
  const reports = ready ? result.reports : [];
  const metrics = visibleForecastMetrics(reports, inputs.flatMap(i => i.deck ? [i.deck] : []));
  if (decks.length < 2) return <p>Add at least two decks to compare.</p>;
  return <div data-component="EqualDeckReport" className="space-y-6">
    <h2 className="text-lg font-semibold">Deck comparison report</h2>
    {failed ? <div role="alert"><p>Could not calculate forecasts.</p><Button onClick={() => setAttempt(n => n + 1)}>Retry forecasts</Button></div> : (!ready || pending) && <p role="status">Calculating forecasts…</p>}
    {inputs.some(i => i.status === 'Decklist unavailable') && <Button onClick={onRetry}>Retry unavailable decklists</Button>}
    {ready && <>
      {reports.map((r, i) => r.status && <p key={inputs[i].key} role="status" className="break-words text-sm">{inputs[i].label} · {r.status}</p>)}
      {metrics.filter(m => !((m.id.startsWith('defense-') || m.id.startsWith('reuse-')) && m.id.endsWith('-range'))).map(metric => {
        const values = reports.map(r => r.metrics.find(m => m.id === metric.id));
        const max = Math.max(1, ...values.flatMap(v => v ? [v.early.high, v.late.high] : []));
        const rangeId = metric.id.endsWith('-chance') ? metric.id.replace(/-chance$/, '-range') : null;
        const ranges = reports.map(r => r.metrics.find(m => m.id === rangeId));
        const rangeMax = Math.max(1, ...ranges.flatMap(v => v ? [v.early.high, v.late.high] : []));
        return <Panel key={metric.id} data-forecast={metric.id}>
          <h3 className="text-lg font-semibold">{metric.title}</h3><p className="mt-1 text-xs text-ctp-subtext1">{metric.context}</p>
          <div className="mt-4 grid items-start gap-6 lg:grid-cols-2"><div className="space-y-5">{inputs.map((input, i) => {
            const value = values[i];
            return <section key={input.key} className="min-w-0 border-t border-ctp-surface1 pt-4 first:border-0 first:pt-0" aria-label={`${input.label}: ${metric.title}`}>
              <div className="min-w-0"><h4 className="break-words font-semibold">{input.label}</h4>
                {value ? value.probability ? <div className="mt-3"><ForecastChance early={value.early.median / 100} late={value.late.median / 100} label={metric.title} cumulative={value.cumulative} /></div> : <ForecastRange early={value.early} late={value.late} unit={value.unit} max={max} cumulative={value.cumulative} /> : <p className="mt-3 text-sm text-ctp-subtext1">— · {reports[i].status ?? reports[i].issues?.[metric.id.split('-')[0]] ?? 'Not supported for this deck'}</p>}
                {ranges[i] && <div className="mt-4 border-t border-ctp-surface1 pt-3"><p className="text-sm">{ranges[i]!.title}</p><ForecastRange early={ranges[i]!.early} late={ranges[i]!.late} unit={ranges[i]!.unit} max={rangeMax} cumulative={ranges[i]!.cumulative} /></div>}
              </div>

            </section>;
          })}</div><div className="min-w-0 space-y-5">{inputs.map((input, i) => values[i] && values[i]!.cards.length > 0 && <section key={input.key} aria-label={`${input.label} contributing cards`} className="min-w-0 border-t border-ctp-surface1 pt-4 first:border-0 first:pt-0">
            <h4 className="mb-3 break-words text-sm font-semibold">{input.label} · Cards</h4><div className="[&>div]:grid-cols-3"><ReportCards lines={values[i]!.cards} cardsByName={cards} /></div>
          </section>)}</div></div>
        </Panel>;
      })}
    </>}
    {ready && inputs[0]?.deck && inputs.slice(1).map(input => input.deck && <section key={input.key} className="space-y-4" aria-label={`${inputs[0].label} and ${input.label} card access`}>
      <h3 className="break-words font-semibold">{inputs[0].label} · {input.label}</h3>
      <EffectAccessReport baseline={inputs[0].deck!} deck={input.deck} cardsByName={cards} />
      <CombatRangeComparison baseline={inputs[0].deck!} target={input.deck} cardsByName={cards} />
    </section>)}
    <DrawAccessExplorer decks={decks} decklists={decklists} onRetry={onRetry} cardsOnly />
  </div>;
}
