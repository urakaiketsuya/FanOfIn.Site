import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { forecastDeck, type DeckForecastModel, type DeckFormat, type OmnidexDecklist } from '@gatcg/shared';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useCardsByNames } from '../events/useCardsByNames';
import CardArtTile from '../../components/CardArtTile';
import DisclosureChevron from '../../components/DisclosureChevron';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import { orderMatchups, type MatchupOrder } from './expectedResultsPresentation';

const key = 'analysis-deck-forecast', url = '/data/analysis/deck-forecast.json';
const percent = (n: number) => `${Math.round(n * 100)}%`;
const orders: { key: MatchupOrder; label: string }[] = [
  { key: 'common', label: 'Common' },
  { key: 'lowest', label: 'Lowest' },
  { key: 'highest', label: 'Highest' },
];

export default function DeckExpectedResults({ decklist, championName, format, legal = true }: { decklist: OmnidexDecklist; championName: string | null; format: DeckFormat; legal?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [order, setOrder] = useState<MatchupOrder>('common');
  const baseId = useId();
  const enabled = format === 'STANDARD';
  const model = usePublishedData<DeckForecastModel>(key, url, enabled, true);
  const status = usePublishedDataStatus(key, url, enabled);
  const deck = useMemo(() => ({ champion: championName?.split(',')[0].trim() ?? '', cards: [...decklist.main, ...decklist.material].map(l => [l.card, l.quantity] as [string, number]) }), [decklist, championName]);
  const [result, setResult] = useState<ReturnType<typeof forecastDeck>>();
  const [pending, startTransition] = useTransition();
  useEffect(() => { startTransition(() => setResult(model ? forecastDeck(deck, model, format) : undefined)); }, [deck, model, format]);
  const names = useMemo(() => result?.status === 'ready' ? result.matchups.map(r => r.card) : [], [result]);
  const cards = useCardsByNames(names);
  const matchups = useMemo(() => orderMatchups(result?.status === 'ready' ? result.matchups : [], order), [result, order]);
  let message: string | null = null;
  if (!enabled) message = 'Standard decks only';
  else if (!legal || !deck.champion || !decklist.main.length) message = 'Complete a legal deck';
  else if (status.phase === 'error' && !model) message = 'Expected results unavailable';
  else if (!model || !result) message = 'Loading expected results…';
  else if (result.status === 'unsupported-champion') message = 'Champion not yet supported';
  else if (result.status === 'incomplete') message = 'Complete a deck';
  else if (result.status !== 'ready') message = 'Field update needed';
  return <Panel>
    <section data-component="DeckExpectedResults" aria-label="Expected results" aria-busy={pending} className="@container min-w-0">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ctp-text">Expected results</h3><span className="rounded bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext0">Beta</span></div>
      {message ? <div className="mt-3 text-sm text-ctp-subtext0" role="status">{message}{status.phase === 'error' && enabled && <Button onClick={status.retry} className="ml-2">Retry</Button>}</div> : result?.status === 'ready' && model && <>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1"><strong className="text-5xl tabular-nums text-ctp-blue">{percent(result.score)}</strong><div className="pb-1 text-sm"><div>Expected match score</div><div className="text-ctp-subtext0">Equal skill · Sampled field</div></div></div>
        <p className="mt-3 text-xs text-ctp-subtext0">{model.season} · {model.asOf} · {model.coverage.modeledEntrants.toLocaleString()} decks</p>
        {result.cardCoverage < 1 && <p className="mt-1 text-xs text-ctp-yellow">{percent(result.cardCoverage)} card coverage</p>}
        <div role="status" className="text-xs text-ctp-subtext0">{pending ? 'Recalculating…' : ''}</div>
        <div className="mb-2 mt-5 flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-medium">Matchup scores</h4><span className="text-xs text-ctp-subtext0">Scale 0–100%</span></div>
        <Tabs tabs={orders} active={order} onChange={setOrder} label="Matchup order" baseId={baseId} variant="pill" wrap />
        <TabPanel baseId={baseId} tab={order} active={order} className="mt-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ctp-blue">
          <div id={`${baseId}-matchups`} className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {(expanded ? matchups : matchups.slice(0, 6)).map(row => {
              const card = cards.get(row.card);
              const art = <CardArtTile card={card} name={row.card} artworkOnly />;
              return <div key={row.champion} className="flex min-w-0 items-center gap-3 rounded-lg border border-ctp-surface1 p-3">
                {card ? <Link to={`/cards/${card.slug}`} aria-label={row.card} className="block min-h-control w-20 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{art}</Link> : <div className="w-20 shrink-0">{art}</div>}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium">{row.card}</div>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-1"><strong className="text-xl tabular-nums">{percent(row.score)}<span className="sr-only"> expected match score</span></strong><span className="text-xs text-ctp-subtext0">{row.share > 0 && row.share < .005 ? '<1%' : percent(row.share)} of field</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-ctp-surface1" aria-hidden="true"><div className="h-full rounded bg-ctp-blue" style={{ width: `${row.score * 100}%` }} /></div>
                </div>
              </div>;
            })}
          </div>
          {matchups.length > 6 && <Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} aria-controls={`${baseId}-matchups`} onClick={() => setExpanded(v => !v)}>{expanded ? 'Fewer matchups' : `All ${matchups.length} matchups`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
        </TabPanel>
      </>}
    </section>
  </Panel>;
}
