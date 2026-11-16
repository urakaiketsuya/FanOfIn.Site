import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card, observedMatchupCohort } from '@gatcg/shared';
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
  return card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${card.name}`} className="block min-h-12 min-w-12 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{art}</Link> : <div>{art}</div>;
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
  const headingId = useId();
  if (!result && error) return <Panel className="mt-4"><p role="alert">Historical results could not be loaded.</p>{onRetry && <Button className="mt-3" onClick={onRetry}>Try again</Button>}</Panel>;
  if (loading || !result) return <div role="status"><InlineState className="mt-4">Loading historical matchups…</InlineState></div>;
  const { classification, performance, matchups, winConditions } = result;
  const cluster = classification.cluster;
  const ordered = [...matchups].sort((a, b) => b.games - a.games || a.opponentClusterName.localeCompare(b.opponentClusterName));
  const visible = expanded ? ordered : ordered.slice(0, preview ? 3 : 6);
  if (!cluster) return <Panel className="mt-4"><h2 className="text-lg font-semibold">No matching archetype yet</h2><p className="mt-2 text-sm text-ctp-subtext1">No observed results for a similar build.</p></Panel>;
  return <div className="mt-4 space-y-6" data-component="AnalysisMatchups">
    <Panel>
      <h2 className="text-lg font-semibold">Observed results · similar decks</h2>
      {observedLabel && <p className="mt-2 break-words text-sm text-ctp-subtext1">{observedLabel}</p>}
      <Link to={`/archetypes/${cluster.id}`} className="inline-flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{cluster.name}</Link>
      <p className="text-xs text-ctp-subtext1">{percent(classification.similarity)} deck similarity{classification.status === 'borderline' ? ' · Loose match' : ''}</p>
      {observed ? <>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div><p className="text-4xl font-semibold tabular-nums">{observed.winRate === null ? '—' : percent(observed.winRate)}</p><p className="mt-1 text-sm">Observed score rate</p></div>
          <div><p className="text-4xl font-semibold tabular-nums">{observed.results.toLocaleString()}</p><p className="mt-1 text-sm">Deck results</p></div>
        </div>
        <p className="mt-3 text-sm text-ctp-subtext1">{observed.decks.toLocaleString()} {observed.decks === 1 ? 'deck' : 'decks'} · {observed.events.toLocaleString()} {observed.events === 1 ? 'event' : 'events'} · Ties count ½</p>
        <p className="mt-1 text-xs text-ctp-subtext1">Completed matches · classified opponents</p>
      </> : performance ? <>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div><p className="text-4xl font-semibold tabular-nums">{percent(performance.winRate)}</p><p className="mt-1 text-sm">Historical win rate</p></div>
          <div><p className="text-4xl font-semibold tabular-nums">{performance.interval95.matches.toLocaleString()}</p><p className="mt-1 text-sm">Recorded matches</p></div>
        </div>
        <p className="mt-3 text-sm text-ctp-subtext1">{performance.deckCount.toLocaleString()} decks · {performance.eventCount.toLocaleString()} events{performance.confidence === 'emerging' ? ' · Limited data' : ''}</p>
      </> : <p className="mt-3 text-sm text-ctp-subtext1">Historical win rate unavailable.</p>}
    </Panel>
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold">Observed matchups</h2><p className="mt-1 text-xs text-ctp-subtext1">Largest samples first · {observed ? 'score rate' : 'win rate'} 0–100%</p>
      {matchupsError && <div className="mt-3"><p role="alert" className="text-sm">{matchups.length ? 'Showing saved matchups. Updated results could not be loaded.' : 'Opponent matchups could not be loaded.'}</p>{onRetryMatchups && <Button className="mt-2" onClick={onRetryMatchups}>Retry matchups</Button>}</div>}
      {!matchups.length && !matchupsError && <p role="status" className="mt-3 text-sm text-ctp-subtext1">{matchupsLoading ? 'Loading opponent matchups…' : observed ? 'No recorded matchups in this selection.' : 'No recorded opponent matchups for this archetype yet.'}</p>}
      <div id={`${headingId}-rows`} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((matchup) => <Panel as="article" key={matchup.opponentClusterId} className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4">
            <div className="min-w-0">
              <ChampionArt name={matchup.opponentChampionName} cards={cards} />
              <p className="mt-2 text-xs text-ctp-subtext1">Against</p>
              <h3 className="break-words text-lg font-semibold">{matchup.opponentChampionName}</h3>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold tabular-nums">{percent(matchup.baselineWinRate)}</p>
              <p className="mt-1 text-xs text-ctp-subtext1">{observed ? 'Observed score rate' : 'Observed win rate'}</p><p className="mt-3 text-xl font-semibold tabular-nums">{matchup.games.toLocaleString()}</p><p className="text-xs text-ctp-subtext1">{observed ? 'Recorded matches' : 'Recorded games'}</p>
            </div>
          </div>
          <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-ctp-surface1" aria-hidden="true"><div className="h-full bg-ctp-blue" style={{ width: `${Math.max(0, Math.min(100, matchup.baselineWinRate * 100))}%` }} /><span className="absolute inset-y-0 left-1/2 border-l border-ctp-text/60" /></div>
          <div className="mt-3">
            <Link to={`/archetypes/${matchup.opponentClusterId}`} className="flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{matchup.opponentClusterName}</Link>
          </div>
        </Panel>)}
      </div>
      {ordered.length > (preview ? 3 : 6) && <Button className="mt-3 flex items-center gap-2" aria-controls={`${headingId}-rows`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Fewer matchups' : `All ${ordered.length} matchups`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
    </section>
    {!preview && winConditions.length > 0 && <section aria-labelledby="analysis-interactions-heading">
      <h2 id="analysis-interactions-heading" className="text-lg font-semibold">Your deck’s card interactions</h2>
      <div className="mt-3 space-y-4">{winConditions.map((interaction) => <Panel key={[interaction.anchorCard, ...interaction.memberCards].join('|')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...new Set([interaction.anchorCard, ...interaction.memberCards])].map((name) => <CardResult key={name} card={cards.get(name)} name={name} newTab />)}</div>
        <p className="mt-3 text-xs text-ctp-subtext1">{interaction.confidence === null ? 'Detected from card text' : `${interaction.matchingDecks.toLocaleString()} supporting decks`}</p>
      </Panel>)}</div>
    </section>}
  </div>;
}
