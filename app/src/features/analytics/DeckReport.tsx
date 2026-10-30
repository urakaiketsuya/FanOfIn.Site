import EffectAccessReport from './EffectAccessReport';
import { useMemo } from 'react';
import type { AnalyticsDeck, Card } from '@gatcg/shared';
import DamageStatisticalReport from './DamageStatisticalReport';
import CardScenarios from './CardScenarios';
import CombatAccessReport from './CombatAccessReport';
import { computeAggressionForecast } from '../../lib/aggressionForecast';
import Panel from '../../components/ui/Panel';

/** Automatic reports accept deck/catalog data only, never calculator state. */
export default function DeckReport({ deck, cardsByName }: {
  deck: AnalyticsDeck; cardsByName: Map<string, Card>;
}) {
  const forecast = useMemo(() => computeAggressionForecast(deck.main, cardsByName, deck.material), [deck.main, deck.material, cardsByName]);
  return <div data-component="DeckReport" className="mt-4 space-y-4">
    <Panel><DamageStatisticalReport forecast={forecast} cardsByName={cardsByName} /></Panel>
    <CombatAccessReport deck={deck} cardsByName={cardsByName} />
    <EffectAccessReport deck={deck} cardsByName={cardsByName} />
    <CardScenarios deck={deck} cardsByName={cardsByName} />
  </div>;
}
