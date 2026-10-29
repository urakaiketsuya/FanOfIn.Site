import type { Card } from './api-types.js';
import type { DeckLine } from './shoutatyourdecks-types.js';
import { basicDeckStats } from './basicDeckStats.js';
import { reportDistribution, type ReportDistribution } from './archetypeReport.js';
import { MIN_QUANTITY_EVIDENCE_LISTS, type DeckBuildCohort } from './deckQuantityEvidence.js';

export type BuildComparisonSection = 'main' | 'material';
export interface BuildComparisonMetric {
  group: 'size' | 'types' | 'elements' | 'reserve' | 'memory' | 'progression';
  label: string;
  current: number;
  reference: ReportDistribution | null;
  eligible: number;
  lines: { name: string; quantity: number }[];
}
export interface BuildComparisonCard {
  name: string;
  current: number;
  included: number;
  lists: number;
  reference: ReportDistribution | null;
}

/** A shared projection for target-scoped deck and archetype consumers. No population reselection. */
export function deckBuildComparison(target: { main: DeckLine[]; material: DeckLine[] }, cohort: DeckBuildCohort, catalog: Map<string, Card>) {
  const sections = (['main', 'material'] as const).map(section => {
    const cached = new Map<string, ReturnType<typeof basicDeckStats>>();
    const stats = (lines: DeckLine[]) => {
      const key = JSON.stringify(lines.map(line => [line.name, line.quantity]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
      let result = cached.get(key);
      if (!result) {
        result = basicDeckStats(lines.map(line => ({ card: line.name, quantity: line.quantity })), catalog, 'composition');
        cached.set(key, result);
      }
      return result;
    };
    const current = stats(target[section]);
    const validTarget = target[section].length > 0 && target[section].every(line => line.name && Number.isSafeInteger(line.quantity) && line.quantity > 0);
    const references = cohort.status === 'ready' || cohort.status === 'sparse' ? cohort.records.map(record => stats(record[section])) : [];
    const complete = references.filter(row => row.unresolved === 0);
    const distribution = (values: number[], resolved = true) => validTarget && resolved && values.length >= MIN_QUANTITY_EVIDENCE_LISTS ? reportDistribution(values) : null;
    const metrics: BuildComparisonMetric[] = [{ group: 'size', label: 'Cards', current: current.total,
      reference: distribution(references.map(row => row.total)), eligible: references.length, lines: target[section] }];
    for (const group of ['types', 'elements', 'reserve', 'memory', 'progression'] as const) {
      const labels = new Set([...current[group], ...complete.flatMap(row => row[group])].map(row => row.label));
      for (const label of [...labels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
        const row = current[group].find(row => row.label === label);
        metrics.push({ group, label, current: row?.count ?? 0, lines: row?.lines ?? [], eligible: complete.length,
          reference: distribution(complete.map(stat => stat[group].find(row => row.label === label)?.count ?? 0), current.unresolved === 0) });
      }
    }
    const quantities = (lines: DeckLine[]) => {
      const result = new Map<string, number>();
      for (const line of lines) result.set(line.name, (result.get(line.name) ?? 0) + line.quantity);
      return result;
    };
    const targetCounts = quantities(target[section]);
    const otherCounts = cohort.status === 'ready' || cohort.status === 'sparse' ? cohort.records.map(record => quantities(record[section])) : [];
    const names = new Set([...targetCounts.keys(), ...otherCounts.flatMap(row => [...row.keys()])]);
    const cards: BuildComparisonCard[] = [...names].sort((a, b) => a.localeCompare(b)).map(name => {
      const values = otherCounts.map(row => row.get(name) ?? 0);
      return { name, current: targetCounts.get(name) ?? 0, included: values.filter(value => value > 0).length,
        lists: values.length, reference: distribution(values) };
    });
    return { section, unresolved: current.unresolved, complete: complete.length, metrics, cards };
  });
  return { status: cohort.status, cluster: cohort.cluster, lists: cohort.lists, sightings: cohort.sightings,
    excluded: cohort.excluded, missing: cohort.missing, conflicts: cohort.conflicts, period: cohort.period, sections };
}
