import { useEffect, useState, useTransition } from 'react';
import { packageReport, type Card } from '@gatcg/shared';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import type { DeckBuilderPopulation } from '../deckbuilder/useDeckBuilderPopulation';
import type { DeckTestResult } from '../../lib/deckTestResult';
import { usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { shortHash } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import PackageDecisionReport from './PackageDecisionReport';
import { ComparableBuildReport, MatchupCoverageReport, ResourceExecutionReport } from './ReportEvidence';
import ReportTesting from './ReportTesting';
import ReportSuggestions from './ReportSuggestions';
import { comparableReportDecks, type ComparableDeck, type ReportSwap } from './reportModel';

export default function DeckDecisionReport({ deck, cards, population, result, membership, loading, onExplore, onApply }: {
  deck: DeckWorkspace; cards: Map<string, Card>; population: DeckBuilderPopulation; result: DeckTestResult | null;
  membership: Record<string, string> | undefined; loading: boolean; onExplore: (name: string) => void; onApply: (swap: ReportSwap) => string | null;
}) {
  const [referenceState, setReferenceState] = useState<{ deck: DeckWorkspace; rows: ComparableDeck[] } | null>(null), [pending, startTransition] = useTransition();
  const references = referenceState?.deck === deck ? referenceState.rows : [];
  const hash = shortHash(deck.championName ?? 'Unknown');
  const source = usePublishedDataStatus(`champion-decks-${hash}`, `/data/analysis/champion-decks/${hash}.json`, !!deck.championName);
  const taxonomy = usePublishedDataStatus('analysis-archetype-taxonomy', '/data/analysis/archetype-taxonomy.json');
  const impacts = usePublishedDataStatus('analysis-card-impact', '/data/analysis/card-impact.json');
  const matchupsStatus = usePublishedDataStatus('analysis-matchup-card-impact', '/data/analysis/matchup-card-impact.json');
  const cluster = deck.format === 'STANDARD' && result?.classification.status === 'matched' ? result.classification.cluster : null;
  useEffect(() => { startTransition(() => setReferenceState({ deck, rows: comparableReportDecks(deck, population.rows, membership ?? {}, cluster?.id, cards) })); }, [deck, population.rows, membership, cluster?.id, cards]);
  const packages = packageReport(deck);
  const unresolved = [...deck.main, ...deck.material].filter(line => !cards.has(line.name));
  const incomplete = packages.filter(row => !row.requirementsMet);
  const matchups = cluster ? result?.matchups ?? [] : [];
  const tasks = [
    ...incomplete.slice(0, 1).map(row => `Missing support · ${row.definition.label}`),
    ...packages.filter(row => row.requirementsMet).slice(0, 1).map(row => `Activation · ${row.definition.label}`),
    ...(matchups[0] ? [`Matchup · ${matchups[0].opponentChampionName}`] : []),
    'Setup delays',
  ].slice(0, 3);
  const error = source.error || taxonomy.error || impacts.error;
  const ready = referenceState?.deck === deck && !loading && !population.loading && !pending && !!membership && !error;
  if (!cards.size) return <Panel className="mt-4"><p role="status">Loading card data for deck findings…</p></Panel>;
  return <div className="mt-4 space-y-4" data-component="DeckDecisionReport">
    <Panel><div className="grid grid-cols-3 gap-3 text-center">
      <div><p className="text-2xl font-semibold tabular-nums">{packages.length - incomplete.length}/{packages.length}</p><p className="mt-1 text-xs">Packages supported</p></div>
      <div><p className="text-2xl font-semibold tabular-nums">{loading || population.loading ? '…' : references.length}</p><p className="mt-1 text-xs">Comparable lists</p></div>
      <div><p className="text-2xl font-semibold tabular-nums">{loading ? '…' : matchups.length}</p><p className="mt-1 text-xs">Recorded matchups</p></div>
    </div>{!!unresolved.length && <p role="status" className="mt-3 text-sm text-ctp-yellow">{unresolved.length} unknown cards · suggestions unavailable</p>}{deck.main.reduce((sum, line) => sum + line.quantity, 0) < 60 && <p role="status" className="mt-3 text-sm text-ctp-yellow">Incomplete Main list · current-size odds</p>}</Panel>
    <PackageDecisionReport deck={deck} cards={cards} onExplore={onExplore} />
    {deck.format === 'PANTHEON' ? <Panel><p>Tournament guidance · Standard only</p></Panel> : <>
      <ReportSuggestions key={JSON.stringify([deck.main, deck.material])} deck={deck} cards={cards} references={references} matchups={matchups} ready={ready} onApply={onApply} />
      {pending && <p role="status">Recalculating comparable builds…</p>}
      <ComparableBuildReport deck={deck} references={references} cards={cards} loading={loading || population.loading || !membership} error={error} onRetry={() => { source.retry(); taxonomy.retry(); impacts.retry(); }} />
      <MatchupCoverageReport deck={deck} matchups={matchups} cards={cards} loading={loading || matchupsStatus.phase === 'loading'} error={taxonomy.error || matchupsStatus.error} onRetry={() => { taxonomy.retry(); matchupsStatus.retry(); }} />
    </>}
    <ResourceExecutionReport deck={deck} cards={cards} onExplore={onExplore} />
    <ReportTesting deck={deck} tasks={tasks} />
  </div>;
}
