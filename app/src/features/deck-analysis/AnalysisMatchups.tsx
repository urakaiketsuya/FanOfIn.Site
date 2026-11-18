import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card, observedMatchupCohort } from '@gatcg/shared';
import RateTrack, { EventRangeLabel, rangeLegend } from './ObservedRateTrack';
import CardArtTile from '../../components/CardArtTile';
import CardResult from '../../components/CardResult';
import DisclosureChevron from '../../components/DisclosureChevron';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import { InlineState } from '../../components/ui/ContentState';
import type { DeckTestResult } from '../../lib/deckTestResult';

const percent = (value: number) => `${(value * 100).toFixed(0)}%`;

export function ChampionArt({ name, cards }: { name: string; cards: Map<string, Card> }) {
  const card = cards.get(name)
    ?? [...cards.values()].find((candidate) => candidate.types.includes('CHAMPION') && candidate.name.startsWith(`${name}, `));
  const art = <CardArtTile card={card} name={card?.name ?? name} artworkOnly />;
  return card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${card.name} (opens in a new tab)`} className="block min-h-12 min-w-12 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{art}</Link> : <div>{art}</div>;
}

/** Historical archetype results, never an inferred prediction for the user's exact list. */
export default function AnalysisMatchups({ result, loading, cards, error, onRetry, matchupsLoading = false, matchupsError, onRetryMatchups, preview = false, observed, observedLabel }: {
  observedLabel?: string;
  observed?: ReturnType<typeof observedMatchupCohort>;
  preview?: boolean;
  result: DeckTestResult | null;
  loading: boolean;
  cards: Map<string, Card>;
  error?: string | null;
  onRetry?: () => void;
  matchupsLoading?: boolean;
  matchupsError?: string | null;
  onRetryMatchups?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [interactionsExpanded, setInteractionsExpanded] = useState(false);
  const interactionsId = useId();
  const headingId = useId();
  if (!result && error) return <Panel className="mt-4"><p role="alert">Historical results could not be loaded.</p>{onRetry && <Button className="mt-3" onClick={onRetry}>Try again</Button>}</Panel>;
  if (loading || !result) return <div role="status"><InlineState className="mt-4">Loading historical matchups…</InlineState></div>;
  const { classification, performance, matchups, winConditions } = result;
  const cluster = classification.cluster;
  const ordered = [...matchups].sort((a, b) => b.games - a.games || a.opponentClusterName.localeCompare(b.opponentClusterName));
  const visible = expanded ? ordered : ordered.slice(0, preview ? 3 : 6);
  if (!cluster || (observed && !observed.results && !matchups.length)) return null;
  return <div className="mt-4 space-y-6" data-component="AnalysisMatchups">
    {Boolean(observed ? observed.results : performance) && <Panel>
      <h2 className="text-lg font-semibold">Observed results · similar decks</h2>
      {observedLabel && <p className="mt-2 break-words text-sm text-ctp-subtext1">{observedLabel}</p>}
      <Link to={`/archetypes/${cluster.id}`} className="inline-flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{cluster.name}</Link>
      <p className="text-xs text-ctp-subtext1">{percent(classification.similarity)} deck similarity{classification.status === 'borderline' ? ' · Loose match' : ''}</p>
      {observed ? <>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8em),1fr))] gap-4">
          <div><p className="text-4xl font-semibold tabular-nums">{observed.winRate === null ? '—' : percent(observed.winRate)}</p><p className="mt-1 text-sm">Observed score rate</p></div>
          <div><p className="text-4xl font-semibold tabular-nums">{observed.results.toLocaleString()}</p><p className="mt-1 text-sm">Deck results</p></div>
        </div>
        <p className="mt-3 text-sm text-ctp-subtext1">{observed.decks.toLocaleString()} {observed.decks === 1 ? 'deck' : 'decks'} · {observed.events.toLocaleString()} {observed.events === 1 ? 'event' : 'events'} · Ties count ½</p>
        <p className="mt-1 text-xs text-ctp-subtext1">Completed matches · classified opponents</p>
      </> : performance ? <>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8em),1fr))] gap-4">
          <div><p className="text-4xl font-semibold tabular-nums">{percent(performance.winRate)}</p><p className="mt-1 text-sm">Historical win rate</p></div>
          <div><p className="text-4xl font-semibold tabular-nums">{performance.interval95.matches.toLocaleString()}</p><p className="mt-1 text-sm">Recorded matches</p></div>
        </div>
        <p className="mt-3 text-sm text-ctp-subtext1">{performance.deckCount.toLocaleString()} decks · {performance.eventCount.toLocaleString()} events{performance.confidence === 'emerging' ? ' · Limited data' : ''}</p>
      </> : <p className="mt-3 text-sm text-ctp-subtext1">Historical win rate unavailable.</p>}
    </Panel>}
    {(matchups.length > 0 || matchupsLoading || matchupsError) && <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold">Observed matchups</h2><p className="mt-1 text-xs text-ctp-subtext1">Largest samples first · {observed ? 'score rate' : 'win rate'}</p>
      {observed?.matchups.some(row => row.eventRange && row.eventRange.events > 1) && <p className="mt-1 text-xs text-ctp-subtext1">{rangeLegend}</p>}
      {matchupsError && <div className="mt-3"><p role="alert" className="text-sm">{matchups.length ? 'Showing saved matchups. Updated results could not be loaded.' : 'Opponent matchups could not be loaded.'}</p>{onRetryMatchups && <Button className="mt-2" onClick={onRetryMatchups}>Retry matchups</Button>}</div>}
      {!matchups.length && !matchupsError && <p role="status" className="mt-3 text-sm text-ctp-subtext1">{matchupsLoading ? 'Loading opponent matchups…' : observed ? 'No recorded matchups in this selection.' : 'No recorded opponent matchups for this archetype yet.'}</p>}
      <div id={`${headingId}-rows`} className="mt-3 divide-y divide-ctp-surface1 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle">
        {visible.map((matchup) => {
          const range = observed?.matchups.find(row => row.id === matchup.opponentClusterId)?.eventRange;
          return <article key={matchup.opponentClusterId} className="grid min-w-0 gap-x-6 gap-y-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:px-4" aria-label={`Against ${matchup.opponentClusterName}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-20 shrink-0"><ChampionArt name={matchup.opponentChampionName} cards={cards} /></div>
              <div className="min-w-0">
                <h3 className="break-words font-semibold">{matchup.opponentChampionName}</h3>
                <Link to={`/archetypes/${matchup.opponentClusterId}`} className="flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{matchup.opponentClusterName}</Link>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-2xl tabular-nums"><span className="sr-only">{observed ? 'Score rate' : 'Win rate'} </span>{percent(matchup.baselineWinRate)}</strong>
                <span className="text-xs text-ctp-subtext1 tabular-nums">{matchup.games.toLocaleString()} {observed ? matchup.games === 1 ? 'match' : 'matches' : matchup.games === 1 ? 'game' : 'games'}{range ? ` · ${range.events} ${range.events === 1 ? 'event' : 'events'}` : ''}</span>
              </div>
              <RateTrack value={matchup.baselineWinRate} range={range} />
              <EventRangeLabel range={range} />
              <div aria-hidden="true" className="flex justify-between text-xs text-ctp-subtext1 tabular-nums"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>
          </article>;
        })}
      </div>
      {ordered.length > (preview ? 3 : 6) && <Button className="mt-3 flex items-center gap-2" aria-controls={`${headingId}-rows`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Fewer matchups' : `All ${ordered.length} matchups`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
    </section>}
    {!preview && winConditions.length > 0 && <section aria-labelledby={`${interactionsId}-heading`}>
      <h2 id={`${interactionsId}-heading`} className="text-lg font-semibold">Your deck’s card interactions</h2>
      <div id={interactionsId} className="mt-3 space-y-4">{(interactionsExpanded ? winConditions : winConditions.slice(0, 3)).map((interaction) => <Panel key={[interaction.anchorCard, ...interaction.memberCards].join('|')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...new Set([interaction.anchorCard, ...interaction.memberCards])].map((name) => <CardResult key={name} card={cards.get(name)} name={name} newTab />)}</div>
        <p className="mt-3 text-xs text-ctp-subtext1">{interaction.confidence === null ? 'Detected from card text' : `${interaction.matchingDecks.toLocaleString()} supporting decks`}</p>
      </Panel>)}</div>
      {winConditions.length > 3 && <Button className="mt-3 flex items-center gap-2" aria-expanded={interactionsExpanded} aria-controls={interactionsId} onClick={() => setInteractionsExpanded(value => !value)}>{interactionsExpanded ? 'Fewer card interactions' : `All ${winConditions.length} card interactions`}<DisclosureChevron className={interactionsExpanded ? 'rotate-180' : ''} /></Button>}
    </section>}
  </div>;
}
