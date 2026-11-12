import { computeSingleCardImpact, weightedJaccard, type CardSectionRow } from '@gatcg/shared';
import type { DeckBuilderRow } from '../useDeckBuilderPopulation';

type Section = 'main' | 'material' | 'sideboard';
export type ReviewLine = { cardName: string; quantity: number; section: Section };

export { engineDependencies } from "@gatcg/shared";

/** Compare the remaining main deck, with the tested card removed from both sides. */
export function comparableReviewRows(rows: DeckBuilderRow[], main: ReadonlyMap<string, number>, excluded = '') {
  const reference = new Map([...main].filter(([n, q]) => n !== excluded && q > 0));
  if ([...reference.values()].reduce((a, b) => a + b, 0) < 30) return [];
  return rows.filter(row => weightedJaccard(reference, new Map([...row.main].filter(([n]) => n !== excluded))) >= 0.6);
}

export function contextualCutImpact(rows: DeckBuilderRow[], main: ReadonlyMap<string, number>, name: string, section: Section) {
  const peers = comparableReviewRows(rows, main, name);
  if (!peers.length) return null;
  // Keep section presence separate: a sideboard copy does not count as a main-deck observation.
  const samples: CardSectionRow[] = peers.map(row => ({ outcome: row.winRate, sections: {
    main: section === 'main' ? new Set(row.main.keys()) : new Set<string>(),
    material: section === 'material' ? new Set(row.material.keys()) : new Set<string>(),
    sideboard: section === 'sideboard' ? new Set(row.sideboard.keys()) : new Set<string>(),
  } }));
  return computeSingleCardImpact(samples, name, peers.reduce((n, r) => n + r.winRate, 0) / peers.length, 10, 5);
}
