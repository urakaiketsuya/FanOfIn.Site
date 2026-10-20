import type { Card } from './api-types.js';

export type AnalyticsLine = { name: string; quantity: number };
export type AnalyticsDeck = { main: AnalyticsLine[]; material: AnalyticsLine[] };
export function whole(value: number): number { return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; }
export function aggregateLines(lines: AnalyticsLine[]): AnalyticsLine[] {
  const counts = new Map<string, number>();
  for (const line of lines) if (whole(line.quantity)) counts.set(line.name, (counts.get(line.name) ?? 0) + whole(line.quantity));
  return [...counts].map(([name, quantity]) => ({ name, quantity }));
}
export function copies(lines: AnalyticsLine[]): number { return lines.reduce((sum, line) => sum + whole(line.quantity), 0); }
/** Draw access only, never a probability of playing or placing a card in the graveyard. */
export function fixtureAccess(size: number, hits: number, seen: number): number {
  size = whole(size); hits = Math.min(size, whole(hits)); seen = Math.min(size, whole(seen));
  if (!size || !hits || !seen) return 0;
  let miss = 1;
  for (let i = 0; i < seen; i++) miss *= Math.max(0, size - hits - i) / (size - i);
  return 1 - miss;
}
/** Inclusion-exclusion handles a physical card that belongs to both pools once. */
export function fixturePairAccess(main: AnalyticsLine[], payoff: AnalyticsLine[], support: AnalyticsLine[], seen: number): number {
  const size = Math.max(60, copies(main));
  const union = new Set([...payoff, ...support].map(line => line.name));
  return Math.max(0, fixtureAccess(size, copies(payoff), seen) + fixtureAccess(size, copies(support), seen)
    - fixtureAccess(size, copies(main.filter(line => union.has(line.name))), seen));
}

// Reviewed gaFloatingPays positive/negative contracts in norm-floating.php and wind-floating.php.
export const FIXTURE_FLOATING: Readonly<Record<string, string | null>> = {
  'Combat Training': 'WARRIOR', 'Fortification': 'GUARDIAN', 'Equip with Courage': null,
  'Exorcise Curses': null, 'Feed Nourishment': null, 'Manifest Threat': null, 'Reprogram': null,
  'Right of Realm': null, 'Summon Pawn': null, 'Tune Up': null, 'Ameliorating Mantra': null,
  'Deploy Gunshield': null, 'Fast Cure': null, 'Floral Arrangement': null, 'Incantation of Prosperity': null,
  'Leading Charge': 'WARRIOR', 'March On': null, 'Organize the Alliance': 'GUARDIAN', 'Savage Arrow': null,
  'Seal the Past': null, 'Angelic Channeling': null, 'Harness Mana': 'MAGE', 'Maiden of Shimmering Air': null,
  'Ordinary Bear': 'TAMER', 'Ordinary Horse': null, 'Raze the Land': null, 'Five of Spades': null,
  'Hefty Hammering': 'WARRIOR', 'Navigate the Streets': null, 'Unwelcome Fortune': null,
  'Galed Erasure': null, 'Welcome Merriment': null, 'Repelling Palmblast': null, 'Lunge of Evoking Winds': null,
  'Channel the Wind': 'MAGE', 'Evanescent Winds': 'CLERIC', 'Infusion of Crescent Jade': 'WARRIOR',
  'Updraft Slice': 'WARRIOR', 'Cell Vanguard': 'WARRIOR', 'Shu Frontliner': 'WARRIOR',
  'Winbless Rangefinder': 'RANGER', 'Menagerie Beastbonder': 'TAMER', 'Ensnaring Fumes': 'ASSASSIN',
  'Skilled Aerotheurge': 'RANGER',
};
export function fixtureFloating(main: AnalyticsLine[], classes: string[]) {
  return aggregateLines(main).filter(line => Object.hasOwn(FIXTURE_FLOATING, line.name)
    && (FIXTURE_FLOATING[line.name] === null || classes.includes(FIXTURE_FLOATING[line.name]!)));
}
export function floatingPayment(available: number, cost: number) {
  const paid = Math.min(whole(available), whole(cost));
  return { paid, remainingCost: whole(cost) - paid, remainingCards: whole(available) - paid };
}
export function hasType(card: Card | undefined, type: string): boolean { return Boolean(card?.types?.includes(type)); }
