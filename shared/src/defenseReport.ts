import { reviewedChampionAccess, reviewedElementMinimumLevel } from './championAccess.js';
import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';
import { createRaiDrawPolicy } from './raiDrawPolicy.js';
import { estimateDrawAndDamageInfluence, supportedDrawEffect, type InfluenceDrawSource } from './drawInfluence.js';
import { computeTonorisDrawReport } from './tonorisDrawReport.js';
import { DEFENSE_CARDS, DEFENSE_SCENARIOS, evaluateDefenseWindow, type DefenseState } from './defenseWindow.js';

const range = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
  return { low: at(.1), median: at(.5), high: at(.9) };
};
export function hasDefenseSources(deck: AnalyticsDeck) {
  return deck.main.some(line => line.quantity > 0 && DEFENSE_CARDS.some(name => name === line.name));
}

/** Supported draw trajectories plus an independent, shared-payment defense window.
 * Checkpoint responses are alternatives, never carried into the next checkpoint.
 */
export function computeDefenseReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 512) {
  const main = aggregateLines(deck.main).sort((a, b) => a.name.localeCompare(b.name));
  if ([...main, ...deck.material].some(line => line.quantity > 0 && !catalog.has(line.name))) return { status: 'missing' as const };
  const sources = main.filter(line => DEFENSE_CARDS.some(name => name === line.name));
  if (sources.some(line => catalog.get(line.name)!.cost_reserve == null)) return { status: 'missing' as const };
  const count = Math.max(1, Math.floor(samples));
  const results = DEFENSE_SCENARIOS.map(scenario => ({ ...scenario, samples: Array.from({ length: 5 }, () => [] as ReturnType<typeof evaluateDefenseWindow>[]) }));
  const collect = (turn: number, state: DefenseState) => {
    for (const result of results) result.samples[turn - 1].push(evaluateDefenseWindow(state, result, catalog));
  };
  const policy = createRaiDrawPolicy(main, deck.material, catalog);
  if (policy) {
    const spirit = policy.access.spirit;
    // Keep Ward available for a response rather than spending it solely for its draw.
    const cards = policy.main.map(source => DEFENSE_CARDS.some(name => name === source.name)
      ? { ...source, draws: 0, drawSteps: [], conditionalDraw: undefined, mechanic: undefined } : source);
    estimateDrawAndDamageInfluence(cards, [], Math.min(7, main.reduce((sum, line) => sum + line.quantity, 0)), 'first', 5, count, policy.progression, undefined,
      state => collect(state.turn, { ...state, hand: state.hand.map(c => c.name), memory: state.memory.map(c => c.name), graveyard: state.graveyard.map(c => c.name), element: catalog.get(spirit.name)!.element, advanced: 'ARCANE', mage: true, diao: false }));
  } else {
    const diao = reviewedChampionAccess(deck.material, catalog, 'diao');
    if (diao) {
      const { element, lineage } = diao;
      // Reviewed baseline: natural draws, fixed draw Actions, Guide and Institute.
      // No phantasias are played, so inherited glimmer remains the two entry counters.
      const cards: InfluenceDrawSource[] = main.map(line => {
        const card = catalog.get(line.name)!;
        const minimumLevel = reviewedElementMinimumLevel(card.element, element, diao.advanced);
        const enabled = Number.isFinite(minimumLevel);
        const effect = enabled ? supportedDrawEffect(card) : null;
        return { ...line, minimumLevel, reserve: card.cost_reserve, draws: effect?.steps.reduce((n, step) => n + step.count, 0) ?? 0,
          drawSteps: effect?.steps ?? [], discard: effect?.discard ?? 0,
          resolvesTo: card.types.includes('ACTION') ? 'graveyard' : 'field',
          mechanic: enabled && line.name === 'Academy Guide' ? 'academy-guide' : enabled && line.name === 'Epicurean Institute' ? 'recollection-hand' : undefined };
      });
      estimateDrawAndDamageInfluence(cards, [], Math.min(7, main.reduce((n, l) => n + l.quantity, 0)), 'first', 5, count, { rai: false, lineage }, undefined,
        state => collect(state.turn, { ...state, hand: state.hand.map(c => c.name), memory: state.memory.map(c => c.name), graveyard: state.graveyard.map(c => c.name), element, advanced: 'TERA', mage: false, diao: true }));
    } else {
      const access = reviewedChampionAccess(deck.material, catalog, 'tonoris');
      if (!access) return { status: 'unsupported' as const };
      const tonoris = computeTonorisDrawReport({ ...deck, main }, catalog, count, state => collect(state.turn, { ...state, graveyard: [], element: access.element, advanced: access.advanced, mage: false, diao: false }));
      if (!tonoris) return { status: 'unsupported' as const };
      if (tonoris.missing.length) return { status: 'missing' as const };
    }
  }
  return { status: 'ready' as const, sources, scenarios: results.map(result => ({ id: result.id, label: result.label,
    metric: result.hits.length ? 'prevention' as const : 'recovery' as const,
    cards: sources.filter(line => ['Flourishing Restoration', 'Restoring Embers', 'Innervate Knowledge'].includes(line.name) === !result.hits.length),
    points: result.samples.map((values, i) => ({ turn: i + 1,
      range: range(values.map(value => result.hits.length ? value.prevented : value.recovered)),
      ready: values.filter(value => (result.hits.length ? value.prevented : value.recovered) > 0).length / count,
      sources: [...new Set(values.flatMap(value => value.sources))].sort(),
    })) })) };
}

export function compareDefenseReports(before: AnalyticsDeck, after: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 512) {
  const baseline = computeDefenseReport(before, catalog, samples), target = computeDefenseReport(after, catalog, samples);
  if (baseline.status === 'missing' || target.status === 'missing') return { status: 'missing' as const };
  if (baseline.status !== 'ready' || target.status !== 'ready') return { status: 'unsupported' as const };
  return { status: 'ready' as const, scenarios: baseline.scenarios.map((scenario, i) => ({ id: scenario.id, label: scenario.label, metric: scenario.metric, cards: aggregateLines([...scenario.cards, ...target.scenarios[i].cards]),
    points: [3, 5].map(turn => ({ turn, before: scenario.points[turn - 1], after: target.scenarios[i].points[turn - 1] })) })) };
}
