import { computeSingleCardImpact, weightedJaccard, type Card, type CardSectionRow } from '@gatcg/shared';
import type { DeckBuilderRow } from '../useDeckBuilderPopulation';

type Section = 'main' | 'material' | 'sideboard';
export type ReviewLine = { cardName: string; quantity: number; section: Section };

/** Reviewed catalog contracts. These are dependency guards, never performance scores. */
export function engineDependencies(lines: ReviewLine[], catalog: ReadonlyMap<string, Card>): Set<string> {
  const active = lines.filter(l => l.quantity > 0 && l.section !== 'sideboard');
  const names = new Set(active.map(l => l.cardName));
  const protectedNames = new Set<string>();
  const link = (a: string[], b: string[]) => {
    if (!a.length || !b.length || !a.some(x => b.some(y => x !== y))) return;
    for (const name of [...a, ...b]) protectedNames.add(name);
  };
  const tokens = active.filter(l => /\bsummon\b[^.\n]*\btoken/i.test(catalog.get(l.cardName)?.effect ?? '')).map(l => l.cardName);
  const domains = active.filter(l => catalog.get(l.cardName)?.types.includes('DOMAIN')).map(l => l.cardName);
  // Exact reviewed consumers avoid treating incidental keyword reminder text as an engine.
  link(tokens, ['Automata Genesis', 'Cordelia, Aurous Kaiser', 'Blade of Creation', 'Archon Broadsword', 'Neos Sight'].filter(n => names.has(n)));
  link(domains, ['The Eternal Kingdom', 'Edge of Tomorrow'].filter(n => names.has(n)));
  link(['Atmos Armor Type-Ares'].filter(n => names.has(n)), ['Blade of Creation', 'Archon Broadsword', 'Automata Genesis', 'Cordelia, Aurous Kaiser'].filter(n => names.has(n)));
  // Altar consumes both ally types. Token producers can supply Automata; use the catalog
  // for Humans. Keep the consumer and present sources together, not a single preferred source.
  const humans = active.filter(l => { const c = catalog.get(l.cardName); return c?.types.includes('ALLY') && c.subtypes.includes('HUMAN'); }).map(l => l.cardName);
  const automata = ['Cordelia, Aurous Kaiser', 'Automata Genesis', 'Tonoris, Genesis Aegis'].filter(n => names.has(n));
  if (names.has('Dormant Sacrificial Altar') && humans.length && automata.length) {
    link(['Dormant Sacrificial Altar'], [...humans, ...automata]);
  }
  return protectedNames;
}

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
