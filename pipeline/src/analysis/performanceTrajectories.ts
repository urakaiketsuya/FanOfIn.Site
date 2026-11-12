import { computeDefenseReport, computeRaiDamageReport, type AnalyticsDeck, type Card } from '@gatcg/shared';

export const trajectoryFeatures = [
  ...['champion', 'ally', 'wide'].flatMap(scenario => [3, 5].map(turn => `paidDamage_${scenario}_T${turn}`)),
  ...['single', 'repeated', 'recovery'].flatMap(scenario => [3, 5].flatMap(turn => [`defense_${scenario}_T${turn}`, `defenseReady_${scenario}_T${turn}`])),
];

/** Keep missing coverage distinct from a supported zero. Scenarios are alternatives. */
export function trajectoryValues(damage: ReturnType<typeof computeRaiDamageReport>, defense: ReturnType<typeof computeDefenseReport>): (number | null)[] {
  return [
    ...['champion', 'ally', 'wide'].flatMap(id => [3, 5].map(turn => {
      const point = damage.status === 'ready' ? damage.scenarios.find(s => s.id === id)?.points.find(p => p.turn === turn) : undefined;
      // Ally scenarios measure damage to allies, not champion output.
      return (id === 'champion' ? point?.damage : point?.allies)?.median ?? null;
    })),
    ...['single', 'repeated', 'recovery'].flatMap(id => [3, 5].flatMap(turn => {
      const point = defense.status === 'ready' ? defense.scenarios.find(s => s.id === id)?.points.find(p => p.turn === turn) : undefined;
      return [point?.range.median ?? null, point?.ready ?? null];
    })),
  ];
}

export function performanceTrajectories(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>) {
  return trajectoryValues(computeRaiDamageReport(deck, catalog), computeDefenseReport(deck, catalog, 128));
}
