import type { Card } from './api-types.js';
import { BOOLEAN_SCENARIOS, calculateCardScenarios, SCENARIO_FIELDS, type CardScenario, type CardScenarioResult, type ScenarioKey } from './cardScenarios.js';
import { aggregateLines, copies, fixtureAccess, type AnalyticsDeck, type AnalyticsLine } from './fixtureResources.js';

/** Checkpoints vary one resource at a time; they are conditional outcomes, never expected play. */
const CHECKPOINTS: Partial<Record<ScenarioKey, number[]>> = {
  tokens: [0, 2, 4, 7], shields: [0, 1, 2], guides: [0, 1, 2],
  fractals: [0, 1, 2], waterGrave: [0, 2, 3], floating: [0, 1, 2], omens: [0, 1, 2],
  windAllies: [0, 1, 2], memory: [3, 4, 5], allies: [0, 1, 2], sheen: [6, 7], level: [1, 2, 3],
};
export function scenarioConditions(row: CardScenarioResult, state: CardScenario) {
  return [...new Set(row.fields)].filter(key => key !== 'seen').map(key =>
    `${SCENARIO_FIELDS[key][0]}: ${BOOLEAN_SCENARIOS.has(key) ? (state[key] ? 'Yes' : 'No') : state[key]}`).join(' · ');
}
export function cardReportCheckpoints(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, state: CardScenario, row: CardScenarioResult) {
  if (row.group === 'packages' || row.id === 'floating') return [];
  if (row.id.endsWith(':prevent')) return [{ label: 'Three 2-damage hits', damage: 2, events: 3 }, { label: 'One 8-damage hit', damage: 8, events: 1 }].map(point => {
    const result = calculateCardScenarios(deck, catalog, { ...state, damage: point.damage, events: point.events }).find(candidate => candidate.id === row.id)!;
    return { label: point.label, value: result.value, unit: result.unit };
  });
  const key = row.fields.find(field => CHECKPOINTS[field] || BOOLEAN_SCENARIOS.has(field));
  if (!key) return [];
  return (CHECKPOINTS[key] ?? [0, 1]).map(value => {
    const result = calculateCardScenarios(deck, catalog, { ...state, [key]: value }).find(candidate => candidate.id === row.id)!;
    return { label: `${SCENARIO_FIELDS[key][0]}: ${BOOLEAN_SCENARIOS.has(key) ? (value ? 'Yes' : 'No') : value}`, value: result.value, unit: result.unit };
  });
}
export function reportDeltaChanged(delta: { before?: CardScenarioResult; after?: CardScenarioResult }) {
  const { before, after } = delta;
  if (!before || !after) return true;
  const membership = (lines: CardScenarioResult['lines'] = []) => JSON.stringify([...lines].sort((a, b) => a.name.localeCompare(b.name)));
  return before.value !== after.value || before.access !== after.access || before.detail !== after.detail || membership(before.lines) !== membership(after.lines) || membership(before.support) !== membership(after.support);
}

/** Main-library access, independent of catalog coverage and game-state assumptions. */
export const REPORT_DRAW_CHECKPOINTS = [7, 10, 15, 20] as const;

export function drawAccessReport(main: AnalyticsLine[]) {
  const lines = aggregateLines(main).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  const size = copies(lines);
  return { size, rows: lines.map(line => ({ ...line, points: REPORT_DRAW_CHECKPOINTS.map(seen => ({
    seen, probability: fixtureAccess(size, line.quantity, seen),
  })) })) };
}

export function compareDrawAccess(before: AnalyticsLine[], after: AnalyticsLine[]) {
  const a = drawAccessReport(before), b = drawAccessReport(after);
  const aRows = new Map(a.rows.map(row => [row.name, row]));
  const bRows = new Map(b.rows.map(row => [row.name, row]));
  return [...new Set([...aRows.keys(), ...bRows.keys()])].sort().flatMap(name => {
    const old = aRows.get(name), next = bRows.get(name);
    const points = REPORT_DRAW_CHECKPOINTS.map((seen, i) => ({ seen,
      before: old?.points[i].probability ?? 0, after: next?.points[i].probability ?? 0,
    }));
    if (old?.quantity === next?.quantity && points.every(point => Math.abs(point.after - point.before) < 1e-12)) return [];
    return [{ name, beforeCopies: old?.quantity ?? 0, afterCopies: next?.quantity ?? 0, points }];
  }).sort((a, b) => Number(b.beforeCopies !== b.afterCopies) - Number(a.beforeCopies !== a.afterCopies)
    || Math.abs(b.points[2].after - b.points[2].before) - Math.abs(a.points[2].after - a.points[2].before)
    || a.name.localeCompare(b.name));
}
