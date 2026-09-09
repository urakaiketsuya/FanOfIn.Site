import type { OmnidexDecklist } from "@gatcg/shared";

export type DeckSection = keyof OmnidexDecklist;
export interface DeckQuantityChange { cardName: string; section: DeckSection; delta: number }

export function applyDeckQuantityChanges(decklist: OmnidexDecklist, changes: DeckQuantityChange[]): OmnidexDecklist {
  const next: OmnidexDecklist = {
    main: decklist.main.map((line) => ({ ...line })),
    material: decklist.material.map((line) => ({ ...line })),
    sideboard: decklist.sideboard.map((line) => ({ ...line })),
  };
  for (const change of changes) {
    if (!Number.isInteger(change.delta) || change.delta === 0) continue;
    const line = next[change.section].find((candidate) => candidate.card === change.cardName);
    if (line) line.quantity = Math.max(0, line.quantity + change.delta);
    else if (change.delta > 0) next[change.section].push({ card: change.cardName, quantity: change.delta });
    next[change.section] = next[change.section].filter((candidate) => candidate.quantity > 0);
  }
  return next;
}

export function chanceAtLeastOne(deckSize: number, copies: number, seen: number): number {
  if (deckSize <= 0 || copies <= 0 || seen <= 0) return 0;
  const draws = Math.min(seen, deckSize);
  const misses = Math.max(0, deckSize - copies);
  let missChance = 1;
  for (let draw = 0; draw < draws; draw++) missChance *= Math.max(0, misses - draw) / (deckSize - draw);
  return 1 - missChance;
}
