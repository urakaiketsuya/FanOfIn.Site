import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import CardResult from '../../components/CardResult';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import { InlineState } from '../../components/ui/ContentState';
import type { DeckTestResult } from '../../lib/deckTestResult';

const percent = (value: number) => `${(value * 100).toFixed(0)}%`;

function ChampionArt({ name, cards }: { name: string; cards: Map<string, Card> }) {
  const card = cards.get(name)
    ?? [...cards.values()].find((candidate) => candidate.types.includes('CHAMPION') && candidate.name.startsWith(`${name}, `));
  const art = <CardArtTile card={card} name={card?.name ?? name} artworkOnly />;
  return card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${card.name}`} className="block min-h-12 min-w-12 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{art}</Link> : <div>{art}</div>;
}

/** Historical archetype results, never an inferred prediction for the user's exact list. */
export default function AnalysisMatchups({ result, loading, cards, error, onRetry, matchupsLoading = false, matchupsError, onRetryMatchups }: {
  result: DeckTestResult | null;
  loading: boolean;
  cards: Map<string, Card>;
  error?: string | null;
  onRetry?: () => void;
  matchupsLoading?: boolean;
  matchupsError?: string | null;
  onRetryMatchups?: () => void;
}) {
  if (!result && error) return <Panel className="mt-4"><p role="alert">Historical results could not be loaded.</p>{onRetry && <Button className="mt-3" onClick={onRetry}>Try again</Button>}</Panel>;
  if (loading || !result) return <div role="status"><InlineState className="mt-4">Loading historical matchups…</InlineState></div>;
  const { classification, performance, matchups, winConditions } = result;
  const cluster = classification.cluster;
  if (!cluster) return <Panel className="mt-4"><h2 className="text-lg font-semibold">No matching archetype yet</h2><p className="mt-2 text-sm text-ctp-subtext1">There aren’t enough similar published decks to show historical matchups for this list.</p></Panel>;
  return <div className="mt-4 space-y-6" data-component="AnalysisMatchups">
    <Panel>
      <h2 className="text-lg font-semibold">Similar decks against the field</h2>
      <Link to={`/archetypes/${cluster.id}`} className="inline-flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{cluster.name}</Link>
      <p className="text-xs text-ctp-subtext1">{percent(classification.similarity)} deck similarity{classification.status === 'borderline' ? ' · Loose match' : ''}</p>
      {performance ? <>
        <p className="mt-4 text-5xl font-semibold tabular-nums">{percent(performance.winRate)}</p>
        <p className="mt-1 text-sm">Historical win rate</p>
        <p className="mt-4 text-xs text-ctp-subtext1">{performance.interval95.matches.toLocaleString()} recorded matches · {performance.deckCount.toLocaleString()} decks · {performance.eventCount.toLocaleString()} events{performance.confidence === 'emerging' ? ' · Limited data' : ''}</p>
      </> : <p className="mt-3 text-sm text-ctp-subtext1">Historical win rate unavailable.</p>}
    </Panel>
    <section aria-labelledby="analysis-matchups-heading">
      <h2 id="analysis-matchups-heading" className="text-lg font-semibold">Against each opponent</h2>
      {matchupsError && <div className="mt-3"><p role="alert" className="text-sm">{matchups.length ? 'Showing saved matchups. Updated results could not be loaded.' : 'Opponent matchups could not be loaded.'}</p>{onRetryMatchups && <Button className="mt-2" onClick={onRetryMatchups}>Retry matchups</Button>}</div>}
      {!matchups.length && !matchupsError && <p role="status" className="mt-3 text-sm text-ctp-subtext1">{matchupsLoading ? 'Loading opponent matchups…' : 'No recorded opponent matchups for this archetype yet.'}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {matchups.map((matchup) => <Panel as="article" key={matchup.opponentClusterId} className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 sm:block">
            <div className="min-w-0">
              <ChampionArt name={matchup.opponentChampionName} cards={cards} />
              <p className="mt-2 text-xs text-ctp-subtext1">Against</p>
              <h3 className="break-words text-lg font-semibold">{matchup.opponentChampionName}</h3>
            </div>
            <div className="text-right sm:mt-5 sm:text-left">
              <p className="text-4xl font-semibold tabular-nums">{percent(matchup.baselineWinRate)}</p>
              <p className="mt-1 text-xs text-ctp-subtext1">Similar decks’ win rate</p>
            </div>
          </div>
          <div className="mt-4 border-t border-ctp-surface1 pt-3">
            <Link to={`/archetypes/${matchup.opponentClusterId}`} className="flex min-h-12 items-center break-words text-sm text-ctp-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">{matchup.opponentClusterName}</Link>
            <p className="mt-2 text-xs text-ctp-subtext1">{matchup.games.toLocaleString()} recorded games</p>
          </div>
        </Panel>)}
      </div>
    </section>
    {winConditions.length > 0 && <section aria-labelledby="analysis-interactions-heading">
      <h2 id="analysis-interactions-heading" className="text-lg font-semibold">Your deck’s card interactions</h2>
      <div className="mt-3 space-y-4">{winConditions.map((interaction) => <Panel key={[interaction.anchorCard, ...interaction.memberCards].join('|')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...new Set([interaction.anchorCard, ...interaction.memberCards])].map((name) => <CardResult key={name} card={cards.get(name)} name={name} newTab />)}</div>
        <p className="mt-3 text-xs text-ctp-subtext1">{interaction.confidence === null ? 'Detected from card text' : `${interaction.matchingDecks.toLocaleString()} supporting decks`}</p>
      </Panel>)}</div>
    </section>}
  </div>;
}
