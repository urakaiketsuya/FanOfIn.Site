import type { Card } from "@gatcg/shared";

export interface GlimpseSource { name: string; copies: number; glimpse: number; reserveCost: number | null; }
export interface GlimpseAdjustedOdds { natural: number; setup: number; combined: number; sourceAvailable: number; revealHit: number; expectedActivations: number; }

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const smaller = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= smaller; i++) result = (result * (n - smaller + i)) / i;
  return result;
}

/** Fixed Glimpse values only. Variable X/LV effects need game-state input and are not guessed. */
export function fixedGlimpseValue(card: Card | undefined): number {
  if (!card?.effect) return 0;
  let largest = 0;
  for (const match of card.effect.matchAll(/\bglimpse\s+(\d+)\b(?!\s*\+)/gi)) largest = Math.max(largest, Number(match[1]));
  return largest;
}

export function glimpseSources(lines: { name: string; quantity: number }[], cards: Map<string, Card>): GlimpseSource[] {
  return lines.flatMap((line) => {
    const card = cards.get(line.name);
    const glimpse = fixedGlimpseValue(card);
    return glimpse > 0 ? [{ name: line.name, copies: line.quantity, glimpse, reserveCost: card?.cost_reserve ?? null }] : [];
  }).sort((a, b) => b.glimpse - a.glimpse || b.copies - a.copies || a.name.localeCompare(b.name));
}

/** Exact capped multi-activation setup odds for disjoint target and Glimpse-source cards. */
export function glimpseAdjustedOdds(deckSize: number, targetCopies: number, sourceCopies: number, seen: number, glimpse: number, overlaps = false, maxActivations = 1): GlimpseAdjustedOdds {
  const n = Math.max(0, Math.floor(deckSize));
  const s = Math.max(0, Math.min(n, Math.floor(seen)));
  const targets = Math.max(0, Math.min(n, Math.floor(targetCopies)));
  const sources = Math.max(0, Math.min(n - targets, Math.floor(sourceCopies)));
  const denominator = choose(n, s);
  if (n === 0 || denominator === 0 || targets === 0) return { natural: 0, setup: 0, combined: 0, sourceAvailable: 0, revealHit: 0, expectedActivations: 0 };

  const noTarget = choose(n - targets, s) / denominator;
  const natural = 1 - noTarget;
  const sourceAvailable = overlaps ? 0 : Math.max(0, (choose(n - targets, s) - choose(n - targets - sources, s)) / denominator);
  const remaining = n - s;
  const activationCap = Math.max(1, Math.min(sources, Math.floor(maxActivations)));
  let setup = 0;
  let weightedActivations = 0;
  if (!overlaps && remaining > 0) {
    for (let drawnSources = 1; drawnSources <= Math.min(sources, s); drawnSources++) {
      const stateProbability = choose(sources, drawnSources) * choose(n - targets - sources, s - drawnSources) / denominator;
      const activations = Math.min(drawnSources, activationCap);
      const inspected = Math.min(remaining, Math.floor(glimpse) * activations);
      const hit = 1 - choose(remaining - targets, inspected) / choose(remaining, inspected);
      setup += stateProbability * hit;
      weightedActivations += stateProbability * activations;
    }
  }
  const revealHit = sourceAvailable > 0 ? setup / sourceAvailable : 0;
  const expectedActivations = sourceAvailable > 0 ? weightedActivations / sourceAvailable : 0;
  return { natural, setup, combined: Math.min(1, natural + setup), sourceAvailable, revealHit, expectedActivations };
}
