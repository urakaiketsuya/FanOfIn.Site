import { probabilityOfRecipe } from './comboOdds';
import { probabilityAtLeast } from '../features/deckbuilder/synergyReadiness';

export interface CalculatorLine { name: string; quantity: number }
export const countSelectedCopies = (lines: readonly CalculatorLine[], names: readonly string[]) => {
  const selected = new Set(names);
  return lines.reduce((sum, line) => sum + (selected.has(line.name) ? line.quantity : 0), 0);
};

/** Minimum interchangeable copies at a fixed deck size, not a per-card legality recommendation. */
export function minimumCopies(deckSize: number, seen: number, required: number, target: number): number | null {
  if (![deckSize, seen, required].every(Number.isInteger) || deckSize < 1 || seen < 0 || required < 1 || !Number.isFinite(target) || target <= 0 || target > 1) return null;
  for (let copies = required; copies <= deckSize; copies++) {
    if (probabilityAtLeast(deckSize, copies, seen, required) + 1e-12 >= target) return copies;
  }
  return null;
}

/** A preview only. Preserve deck size, reject unavailable cuts and never mutate the source. */
export function previewCalculatorSwap(lines: readonly CalculatorLine[], out: string, incoming: string, quantity: number): CalculatorLine[] | null {
  if (!out || !incoming || out === incoming || !Number.isInteger(quantity) || quantity < 1) return null;
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  if ((counts.get(out) ?? 0) < quantity) return null;
  counts.set(out, counts.get(out)! - quantity);
  counts.set(incoming, (counts.get(incoming) ?? 0) + quantity);
  return [...counts].filter(([, count]) => count > 0).map(([name, count]) => ({ name, quantity: count }));
}

export function selectedRecipeOdds(lines: readonly CalculatorLine[], groups: readonly (readonly string[])[], seen: number): number | null {
  const active = groups.filter((group) => group.length);
  if (!active.length) return null;
  const used = new Set<string>();
  for (const group of active) for (const name of new Set(group)) {
    if (used.has(name)) return null;
    used.add(name);
  }
  const size = lines.reduce((sum, line) => sum + line.quantity, 0);
  return probabilityOfRecipe(size, active.map((names) => ({ copies: countSelectedCopies(lines, names), required: 1 })), seen);
}

/** Conditional next-card probability after removing known cards from a shuffled deck. */
export function nextDrawOdds(deckSize: number, copies: number, removed: number, matchingRemoved: number): number | null {
  if (![deckSize, copies, removed, matchingRemoved].every(Number.isInteger) || deckSize < 1 || copies < 0 || copies > deckSize || removed < 0 || removed >= deckSize || matchingRemoved < 0 || matchingRemoved > copies || matchingRemoved > removed || removed - matchingRemoved > deckSize - copies) return null;
  return (copies - matchingRemoved) / (deckSize - removed);
}
