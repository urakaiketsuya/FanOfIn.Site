import { useMemo } from 'react';
import type { AnalyticsDeck, Card } from '@gatcg/shared';
import DeckAccessSummary from '../account/DeckAccessSummary';
import DamageStatisticalReport from './DamageStatisticalReport';
import CardScenarios from './CardScenarios';
import CombatAccessReport from './CombatAccessReport';
import { computeAggressionForecast } from '../../lib/aggressionForecast';
import Panel from '../../components/ui/Panel';

/** Automatic reports accept deck/catalog data only, never calculator state. */
export default function DeckReport({ deck, cardsByName, onExplore }: {
  deck: AnalyticsDeck; cardsByName: Map<string, Card>; onExplore?: (name: string) => void;
}) {
  const forecast = useMemo(() => computeAggressionForecast(deck.main, cardsByName, deck.material), [deck.main, deck.material, cardsByName]);
  return <div data-component="DeckReport" className="mt-4 space-y-4">
    <DeckAccessSummary mainLines={deck.main} cardsByName={cardsByName} onExplore={onExplore} />
    <Panel><DamageStatisticalReport forecast={forecast} cardsByName={cardsByName} /></Panel>
    <CombatAccessReport deck={deck} cardsByName={cardsByName} />
    <CardScenarios deck={deck} cardsByName={cardsByName} />
  </div>;
}
