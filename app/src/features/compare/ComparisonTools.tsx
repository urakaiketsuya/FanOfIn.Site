import { useEffect, useState } from 'react';
import type { OmnidexDecklist } from '@gatcg/shared';
import ComparisonSummary from './ComparisonSummary';
import MatchupPlanning from './MatchupPlanning';
import type { ComparedDeck } from './types';

/** Keep visited scenario tools mounted while switching comparison views. */
export default function ComparisonTools({ active, decks, decklists, baselineKey, onViewAllDifferences }: {
  active: string; decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; baselineKey: string | null; onViewAllDifferences: () => void;
}) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (active === 'forecasts' || active === 'matchup') setVisited(previous => previous.has(active) ? previous : new Set([...previous, active]));
  }, [active]);
  return <>
    <div hidden={active !== 'forecasts'}>{(active === 'forecasts' || visited.has('forecasts')) && <ComparisonSummary decks={decks} decklists={decklists} baselineKey={baselineKey} mode="forecasts" onViewAllDifferences={onViewAllDifferences} />}</div>
    <div hidden={active !== 'matchup'}>{(active === 'matchup' || visited.has('matchup')) && <MatchupPlanning decks={decks} decklists={decklists} baselineKey={baselineKey} />}</div>
  </>;
}
