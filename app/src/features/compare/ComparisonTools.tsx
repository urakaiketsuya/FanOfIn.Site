import { useEffect, useState } from 'react';
import type { OmnidexDecklist } from '@gatcg/shared';
import ComparisonSummary from './ComparisonSummary';
import MatchupPlanning from './MatchupPlanning';
import type { ComparedDeck } from './types';

/** Keep visited scenario tools mounted while switching comparison views. */
export default function ComparisonTools({ active, decks, decklists, baselineKey, onViewAllDifferences, onExplore }: {
  active: string; decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; baselineKey: string | null; onViewAllDifferences: () => void; onExplore: () => void;
}) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (active === 'forecasts' || active === 'calculators' || active === 'matchup') setVisited(previous => previous.has(active) ? previous : new Set([...previous, active]));
  }, [active]);
  return <>
    <div hidden={active !== 'forecasts'}>{(active === 'forecasts' || visited.has('forecasts')) && <ComparisonSummary decks={decks} decklists={decklists} baselineKey={baselineKey} mode="forecasts" onExplore={onExplore} onViewAllDifferences={onViewAllDifferences} />}</div>
    <div hidden={active !== 'calculators'}>{(active === 'calculators' || visited.has('calculators')) && <ComparisonSummary decks={decks} decklists={decklists} baselineKey={baselineKey} mode="calculators" onViewAllDifferences={onViewAllDifferences} />}</div>
    <div hidden={active !== 'matchup'}>{(active === 'matchup' || visited.has('matchup')) && <MatchupPlanning decks={decks} decklists={decklists} baselineKey={baselineKey} />}</div>
  </>;
}
