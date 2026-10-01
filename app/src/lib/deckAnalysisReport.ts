import type { Card } from '@gatcg/shared';
import { probabilityAtLeast } from '../features/deckbuilder/synergyReadiness';
import { drawEngineSources, computeDrawEngineTiming } from '../features/deckbuilder/drawEffects';
import { inferStartingHandSize, naturalCardsSeenByTurn } from './turnToPlay';
import { selectedRecipeOdds, type CalculatorLine } from './calculatorDashboard';
import type { AnalysisPlan } from './analysisProfile';

/** Read-only report. Fixed checkpoints describe access, never successful plays. */
export function computeDeckAnalysisReport(main: CalculatorLine[], material: CalculatorLine[], catalog: ReadonlyMap<string, Card>, plan?: AnalysisPlan | null, reviewed = false) {
  const counts = new Map<string, number>();
  for (const line of main) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const lines = [...counts].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
  const size = lines.reduce((sum, line) => sum + line.quantity, 0);
  const opening = Math.min(size, inferStartingHandSize(material, catalog));
  const lineage = material.filter((line) => catalog.get(line.name)?.types.includes('CHAMPION')).sort((a, b) => (catalog.get(a.name)?.level ?? 0) - (catalog.get(b.name)?.level ?? 0));
  const startingCard = lineage.find((line) => catalog.get(line.name)?.level === 0);
  const openingInferred = !!startingCard && /\bdraw\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+cards?\b/i.test(catalog.get(startingCard.name)?.effect ?? '');
  // Starting Spirit draws are already included in the opening hand, not bonus draws.
  const sources = drawEngineSources(lines, material.filter((line) => catalog.get(line.name)?.level !== 0), catalog);
  const checkpoints = ([3, 5] as const).flatMap((turn) => (['first', 'second'] as const).map((order) => {
    const seen = Math.min(size, naturalCardsSeenByTurn(turn, opening, order));
    const timing = computeDrawEngineTiming(sources, size, seen, opening, { turn, order });
    return { turn, order, seen, extra: timing.expectedActiveDraws, adjustedSeen: Math.min(size, seen + Math.round(timing.expectedActiveDraws)) };
  }));
  const cards = lines.map((line) => ({ ...line, opening: probabilityAtLeast(size, line.quantity, opening, 1), duplicate: probabilityAtLeast(size, line.quantity, opening, 2), checkpoints: checkpoints.map((point) => ({ natural: probabilityAtLeast(size, line.quantity, point.seen, 1), modeled: probabilityAtLeast(size, line.quantity, point.adjustedSeen, 1) })) }));
  const costs = new Map<string, number>();
  for (const line of lines) { const cost = catalog.get(line.name)?.cost_reserve; const label = cost == null ? 'Unknown or no fixed Reserve cost' : String(cost); costs.set(label, (costs.get(label) ?? 0) + line.quantity); }
  const groups = ['enabler', 'payoff'].map((role) => lines.filter((line) => plan?.roles[line.name] === role).map((line) => line.name));
  const planReady = reviewed && groups.every((group) => group.length > 0);
  return { size, opening, openingInferred, lineage, sources, checkpoints, cards, costs: [...costs].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })), unresolved: [...new Set([...main, ...material].filter((line) => !catalog.has(line.name)).map((line) => line.name))], plan: planReady ? { name: plan!.name, opening: selectedRecipeOdds(lines, groups, opening), checkpoints: checkpoints.map((point) => selectedRecipeOdds(lines, groups, point.seen)) } : null };
}
