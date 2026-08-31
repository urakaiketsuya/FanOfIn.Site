import type { Card } from "@gatcg/shared";
import { fixedChampionDamageRange } from "./deckIdentity";

export interface AggressionForecastPoint {
  seen: number;
  expectedMin: number;
  expectedMax: number;
  low: number;
  high: number;
  chanceAtLeastFiveMin: number;
  chanceAtLeastFiveMax: number;
  chanceAtLeastTenMin: number;
  chanceAtLeastTenMax: number;
}

export interface AggressionForecast {
  deckSize: number;
  fixedDamageCopies: number;
  variableDamageCopies: number;
  points: AggressionForecastPoint[];
}

const CHECKPOINTS = [7, 10, 15, 20] as const;

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= r; i++) result = (result * (n - r + i)) / i;
  return result;
}

/** Exact damage distribution for drawing `seen` cards without replacement. */
function damageDistribution(groups: { copies: number; damage: number }[], deckSize: number, seen: number): Map<number, number> {
  const draws = Math.min(seen, deckSize);
  const accountedFor = groups.reduce((sum, group) => sum + group.copies, 0);
  const allGroups = [...groups];
  if (accountedFor < deckSize) allGroups.push({ copies: deckSize - accountedFor, damage: 0 });

  let states: Map<number, number>[] = Array.from({ length: draws + 1 }, () => new Map<number, number>());
  states[0].set(0, 1);
  let processed = 0;
  for (const group of allGroups) {
    const next: Map<number, number>[] = Array.from({ length: draws + 1 }, () => new Map<number, number>());
    for (let alreadyDrawn = 0; alreadyDrawn <= Math.min(draws, processed); alreadyDrawn++) {
      for (const [damage, ways] of states[alreadyDrawn]) {
        const maxFromGroup = Math.min(group.copies, draws - alreadyDrawn);
        for (let count = 0; count <= maxFromGroup; count++) {
          const nextDrawn = alreadyDrawn + count;
          const nextDamage = damage + count * group.damage;
          next[nextDrawn].set(nextDamage, (next[nextDrawn].get(nextDamage) ?? 0) + ways * choose(group.copies, count));
        }
      }
    }
    processed += group.copies;
    states = next;
  }

  const totalWays = choose(deckSize, draws);
  return new Map(Array.from(states[draws]).map(([damage, ways]) => [damage, totalWays > 0 ? ways / totalWays : 0]));
}

function expected(distribution: Map<number, number>): number {
  return Array.from(distribution).reduce((sum, [damage, probability]) => sum + damage * probability, 0);
}

function quantile(distribution: Map<number, number>, target: number): number {
  let cumulative = 0;
  for (const [damage, probability] of Array.from(distribution).sort((a, b) => a[0] - b[0])) {
    cumulative += probability;
    if (cumulative + Number.EPSILON >= target) return damage;
  }
  return 0;
}

function chanceAtLeast(distribution: Map<number, number>, threshold: number): number {
  return Array.from(distribution).reduce((sum, [damage, probability]) => sum + (damage >= threshold ? probability : 0), 0);
}

function round(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function computeAggressionForecast(
  mainLines: { name: string; quantity: number }[],
  cardsByName: Map<string, Card>,
): AggressionForecast {
  const listedTotal = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const deckSize = Math.max(60, listedTotal);
  const minGroups: { copies: number; damage: number }[] = [];
  const maxGroups: { copies: number; damage: number }[] = [];
  let fixedDamageCopies = 0;
  let variableDamageCopies = 0;

  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    const range = fixedChampionDamageRange(card);
    if (range) {
      fixedDamageCopies += line.quantity;
      minGroups.push({ copies: line.quantity, damage: range.min });
      maxGroups.push({ copies: line.quantity, damage: range.max });
    } else if (/Deal (?:\d+\+X|X) damage[^.]*champion/i.test((card.effect ?? "").replace(/\*\*/g, ""))) {
      variableDamageCopies += line.quantity;
    }
  }

  const points = CHECKPOINTS.map((seen) => {
    const minDistribution = damageDistribution(minGroups, deckSize, seen);
    const maxDistribution = damageDistribution(maxGroups, deckSize, seen);
    return {
      seen,
      expectedMin: round(expected(minDistribution)),
      expectedMax: round(expected(maxDistribution)),
      low: quantile(minDistribution, 0.1),
      high: quantile(maxDistribution, 0.9),
      chanceAtLeastFiveMin: round(chanceAtLeast(minDistribution, 5), 3),
      chanceAtLeastFiveMax: round(chanceAtLeast(maxDistribution, 5), 3),
      chanceAtLeastTenMin: round(chanceAtLeast(minDistribution, 10), 3),
      chanceAtLeastTenMax: round(chanceAtLeast(maxDistribution, 10), 3),
    };
  });

  return { deckSize, fixedDamageCopies, variableDamageCopies, points };
}
