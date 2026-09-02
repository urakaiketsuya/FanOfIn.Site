import type { Card } from "@gatcg/shared";
import {
  ambiguousFixedChampionDamage,
  fixedChampionDamageRange,
  hasUnquantifiedChampionDamage,
  isSymmetricChampionDamage,
  parseRecurringChampionDamage,
  parseSubtypeScalingDamage,
} from "./deckIdentity";

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
  /** Copies whose damage scales with a subtype-sacrifice combo (e.g. Burst Asunder off Fractals) — folded into `expectedMax`/`high`/the "Max" chance columns as an optimistic estimate sized off this deck's own fodder count, never into the guaranteed `Min` side. */
  scalingDamageCopies: number;
  /** Copies with a fixed printed damage value that isn't guaranteed to reach the champion — either an ambiguous "target unit" clause (e.g. Blazing Throw) or one mode of a "Choose one" modal card (e.g. Vermilion Decree). Folded into the Max side only, same as `scalingDamageCopies`. */
  ambiguousDamageCopies: number;
  /** Of `fixedDamageCopies`, how many also hit the deck's own champion (e.g. Embercrypt Burn's "each champion") — informational only, doesn't change any guaranteed value. */
  symmetricDamageCopies: number;
  /** Fixed champion-reach damage from Material Deck cards with an unconditional per-turn trigger (e.g. Fabled Ruby Fatestone), summed across copies. Material Deck cards are known and in play from the start of the game, not drawn — so this is a flat per-turn figure, deliberately kept separate from `points`' "cards seen" checkpoints rather than folded into them. 0 if the deck runs no such cards. */
  recurringDamagePerTurn: number;
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
  materialLines: { name: string; quantity: number }[] = [],
): AggressionForecast {
  const listedTotal = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const deckSize = Math.max(60, listedTotal);
  const minGroups: { copies: number; damage: number }[] = [];
  const maxGroups: { copies: number; damage: number }[] = [];
  let fixedDamageCopies = 0;
  let variableDamageCopies = 0;
  let scalingDamageCopies = 0;
  let ambiguousDamageCopies = 0;
  let symmetricDamageCopies = 0;

  let recurringDamagePerTurn = 0;
  for (const line of materialLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    const recurring = parseRecurringChampionDamage(card);
    if (recurring !== null) recurringDamagePerTurn += recurring * line.quantity;
  }

  // Real subtype vocabulary for this deck's own cards, gating `parseSubtypeScalingDamage` the same
  // way `cardIntent.ts`'s subtype detection is gated — see that function's doc comment.
  const knownSubtypes = new Set<string>();
  for (const card of cardsByName.values()) for (const s of card.subtypes) knownSubtypes.add(s.toLowerCase());

  // How much of each subtype this specific deck actually runs — the fodder count a scaling combo's
  // ceiling estimate is sized off, so a deck with 0 Fractals gets 0 bonus and one built around them
  // gets a realistic one.
  const subtypeCopyCounts = new Map<string, number>();
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    for (const s of card.subtypes) {
      const key = s.toLowerCase();
      subtypeCopyCounts.set(key, (subtypeCopyCounts.get(key) ?? 0) + line.quantity);
    }
  }

  const scalingSources: { copies: number; perUnitDamage: number; fodderCopies: number }[] = [];

  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    const range = fixedChampionDamageRange(card);
    if (range) {
      fixedDamageCopies += line.quantity;
      if (isSymmetricChampionDamage(card)) symmetricDamageCopies += line.quantity;
      minGroups.push({ copies: line.quantity, damage: range.min });
      maxGroups.push({ copies: line.quantity, damage: range.max });
      continue;
    }

    const scaling = parseSubtypeScalingDamage(card, knownSubtypes);
    if (scaling) {
      scalingDamageCopies += line.quantity;
      // Base clause targets the ambiguous "unit" bucket (may hit an ally instead), so it's not
      // guaranteed — 0 on the Min side, its printed value on the Max side, same as the rest of this
      // group's combinatorics. The fodder-scaled bonus on top is handled separately below.
      minGroups.push({ copies: line.quantity, damage: 0 });
      maxGroups.push({ copies: line.quantity, damage: scaling.baseDamage });
      scalingSources.push({ copies: line.quantity, perUnitDamage: scaling.perUnitDamage, fodderCopies: subtypeCopyCounts.get(scaling.subtype) ?? 0 });
      continue;
    }

    const ambiguous = ambiguousFixedChampionDamage(card);
    if (ambiguous !== null) {
      ambiguousDamageCopies += line.quantity;
      // Not guaranteed — could land on an ally instead of the champion, or (for a modal card) never
      // get chosen at all — so 0 on the Min side, its printed value on the Max side.
      minGroups.push({ copies: line.quantity, damage: 0 });
      maxGroups.push({ copies: line.quantity, damage: ambiguous });
      continue;
    }

    if (hasUnquantifiedChampionDamage(card)) {
      variableDamageCopies += line.quantity;
    }
  }

  const points = CHECKPOINTS.map((seen) => {
    const minDistribution = damageDistribution(minGroups, deckSize, seen);
    const maxDistribution = damageDistribution(maxGroups, deckSize, seen);

    // Expected extra damage from subtype-sacrifice combos (e.g. Burst Asunder off Fractals) at this
    // checkpoint: each source's own expected copies seen so far, times its per-unit bonus, times the
    // expected copies of its fodder subtype seen so far — the same closed-form hypergeometric-mean
    // approximation `drawEffects.ts`'s `expectedExtraDraws` uses (`copies * seen / deckSize`), not an
    // exact joint distribution: it treats the source and its fodder as independently drawn, and
    // doesn't model turn sequencing or fodder shared across multiple combo sources competing for the
    // same sacrifices. Ceiling-only — never added to `expectedMin`/`low`.
    const scalingBonus = scalingSources.reduce((sum, source) => {
      const sourceSeen = (source.copies * Math.min(seen, deckSize)) / deckSize;
      const fodderSeen = (source.fodderCopies * Math.min(seen, deckSize)) / deckSize;
      return sum + sourceSeen * source.perUnitDamage * fodderSeen;
    }, 0);
    const roundedBonus = Math.round(scalingBonus);

    return {
      seen,
      expectedMin: round(expected(minDistribution)),
      expectedMax: round(expected(maxDistribution) + scalingBonus),
      low: quantile(minDistribution, 0.1),
      high: quantile(maxDistribution, 0.9) + roundedBonus,
      chanceAtLeastFiveMin: round(chanceAtLeast(minDistribution, 5), 3),
      chanceAtLeastFiveMax: round(chanceAtLeast(maxDistribution, Math.max(0, 5 - roundedBonus)), 3),
      chanceAtLeastTenMin: round(chanceAtLeast(minDistribution, 10), 3),
      chanceAtLeastTenMax: round(chanceAtLeast(maxDistribution, Math.max(0, 10 - roundedBonus)), 3),
    };
  });

  return {
    deckSize,
    fixedDamageCopies,
    variableDamageCopies,
    scalingDamageCopies,
    ambiguousDamageCopies,
    symmetricDamageCopies,
    recurringDamagePerTurn,
    points,
  };
}
