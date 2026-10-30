import type { Card } from "./api-types.js";
export const FORESE_NAME = "Forese, Fervid Cantor";
const BASIC = new Set(["NORM", "FIRE", "WATER", "WIND"]);
export function isForeseTarget(card: Card): boolean {
  return card.types.includes("ALLY") && card.subtypes.includes("RESONATOR") && card.elements.length > 0
    && card.elements.every(e => BASIC.has(e)) && card.cost_reserve !== null && card.cost_reserve <= 3;
}
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let value = 1;
  for (let i = 1, r = Math.min(k, n - k); i <= r; i++) value = value * (n - r + i) / i;
  return value;
}
/** Exact access + first-trigger Scavenge, accounting for targets already drawn.
 * Four disjoint categories: Forese, Melody/Harmony, eligible Resonators, other.
 * Catalog templates are checked for overlap before using the distribution. */
export function computeForeseForecast(lines: { name: string; quantity: number }[], cards: Map<string, Card>, cardsSeen: number) {
  const counts = new Map<string, number>();
  for (const line of lines) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const foreseCopies = counts.get(FORESE_NAME) ?? 0;
  const targets: { name: string; quantity: number }[] = [];
  let songs = 0, eligible = 0, listed = 0, overlap = false, missing = false;
  for (const [name, quantity] of counts) {
    listed += quantity;
    const card = cards.get(name);
    if (!card) { missing = true; continue; }
    const song = card.subtypes.some(s => s === "HARMONY" || s === "MELODY");
    const target = isForeseTarget(card);
    if (song) songs += quantity;
    if (target) { eligible += quantity; targets.push({ name, quantity }); }
    if ((song && target) || (name === FORESE_NAME && (song || target))) overlap = true;
  }
  const deckSize = listed;
  const seen = Math.max(0, Math.min(deckSize, Math.floor(cardsSeen)));
  const other = deckSize - foreseCopies - songs - eligible;
  let accessChance = 0, deploymentChance = 0;
  if (!overlap && !missing && other >= 0) {
    const denominator = choose(deckSize, seen);
    for (let f = 1; f <= Math.min(foreseCopies, seen); f++) {
      for (let s = 1; s <= Math.min(songs, seen - f); s++) {
        for (let t = 0; t <= Math.min(eligible, seen - f - s); t++) {
          const weight = choose(foreseCopies, f) * choose(songs, s) * choose(eligible, t) * choose(other, seen - f - s - t) / denominator;
          accessChance += weight;
          const remaining = deckSize - seen, reveal = Math.min(5, remaining);
          const hit = remaining > 0 ? 1 - choose(remaining - eligible + t, reveal) / choose(remaining, reveal) : 0;
          deploymentChance += weight * hit;
        }
      }
    }
  }
  return { foreseCopies, songCopies: songs, targets, eligibleCopies: eligible, deckSize, seen,
    accessChance: Math.min(1, accessChance), deploymentChance: Math.min(1, deploymentChance),
    hitChanceGivenAccess: accessChance > 0 ? deploymentChance / accessChance : 0,
    unavailable: missing || overlap };
}
