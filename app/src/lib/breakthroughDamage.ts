import type { Card } from "@gatcg/shared";

interface NamedLine {
  name: string;
  quantity: number;
}

/** Attacks in this game target the champion directly — there is no MTG-style universal blocking.
 * The only redirect is the **Intercept** keyword ("Whenever your champion is attacked while this
 * ally is awake, you may redirect that attack to this ally"), and **Unblockable** explicitly means
 * "can't be intercepted" (verified against real card text: Weiss Knight/Shadowstrike/Ominous
 * Shadow's reminder text all read "...can't be intercepted and ignores taunt"). Note **Ranged N**
 * is NOT an evasion keyword despite the (hidden, unused) DIAO score's own `diao.ts` treating it as
 * one — verified against the real card pool it is purely a power buff ("as long as this unit is
 * distant, its attacks get +N power"), so it's deliberately not checked here. */
function isUnblockable(card: Card): boolean {
  return /unblockable/i.test(card.effect ?? "");
}

function isIntercept(card: Card): boolean {
  return /intercept/i.test(card.effect ?? "");
}

function expandAllyPower(lines: NamedLine[], cardsByName: Map<string, Card>): { power: number; unblockable: boolean }[] {
  const instances: { power: number; unblockable: boolean }[] = [];
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || !card.types.includes("ALLY") || card.power === null) continue;
    for (let i = 0; i < line.quantity; i++) instances.push({ power: card.power, unblockable: isUnblockable(card) });
  }
  return instances;
}

function countIntercept(lines: NamedLine[], cardsByName: Map<string, Card>): number {
  let count = 0;
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (card && card.types.includes("ALLY") && isIntercept(card)) count += line.quantity;
  }
  return count;
}

export interface BreakthroughDamageResult {
  /** Total power that reaches the defending champion: Unblockable attackers' power plus whatever
   * interceptable attackers exceeded the defender's Intercept-ally count. The headline number. */
  breakthroughTotal: number;
  /** Portion of `breakthroughTotal` that got through purely because it can't be intercepted at
   * all, independent of how many Intercept allies the defender has. */
  unblockablePower: number;
  /** Interceptable attacker power the defender's Intercept allies redirected away from the
   * champion. */
  interceptedPower: number;
  attackerCount: number;
  interceptAllyCount: number;
  totalAttackPower: number;
}

function computeBreakthroughDamageCore(attackers: { power: number; unblockable: boolean }[], interceptAllyCount: number): BreakthroughDamageResult {
  const totalAttackPower = attackers.reduce((sum, a) => sum + a.power, 0);
  const unblockablePower = attackers.filter((a) => a.unblockable).reduce((sum, a) => sum + a.power, 0);
  const interceptable = attackers.filter((a) => !a.unblockable).sort((a, b) => b.power - a.power);

  const intercepted = interceptable.slice(0, interceptAllyCount);
  const gotThrough = interceptable.slice(interceptAllyCount);
  const interceptedPower = intercepted.reduce((sum, a) => sum + a.power, 0);
  const unblockedPower = gotThrough.reduce((sum, a) => sum + a.power, 0);

  return {
    breakthroughTotal: unblockablePower + unblockedPower,
    unblockablePower,
    interceptedPower,
    attackerCount: attackers.length,
    interceptAllyCount,
    totalAttackPower,
  };
}

/** Median count of Intercept-keyword Allies (main + material) across 57,713 real tournament deck
 * sightings — computed once from `data/analysis/deck-card-index.json` cross-referenced against
 * `pipeline/.cache/cards.json`'s effect text (2026-09-07), not guessed. Per-deck distribution:
 * {0: 15063, 1: 1565, 2: 2812, 3: 8129, 4: 19706, 5: 2606, 6: 2352, 7: 1931, 8: 2232, 9+: ~1300}
 * — 4 is both the median and the mode; the raw mean (~3.27) is pulled down by the large 0-Intercept
 * cohort and pulled around by a single corrupted-quantity outlier, so the median is the more
 * trustworthy round number here. Used as a stand-in "average opponent" wherever there's no second
 * deck to compute real breakthrough damage against (see `computeBreakthroughDamageVsAverage`). */
export const AVERAGE_DECK_INTERCEPT_ALLY_COUNT = 4;

/**
 * A single-direction combat estimate: if every Ally in `attackerLines` attacked the champion at
 * once, and every Intercept-keyword Ally in `defenderLines` redirected one attack each (biggest
 * first, since a defender minimizing damage protects against the biggest hits), how much power
 * reaches the defending champion? Run once per direction for a compared pair — attacker→defender
 * and defender→attacker are two different numbers, not one symmetric figure, since Intercept-ally
 * count differs per deck.
 *
 * A heuristic, not a claimed simulation, in the same spirit as `aggressionForecast.ts`'s own
 * explicit exclusions:
 * - **Assumes every Ally in both main + material decks is simultaneously in play and awake.** A
 *   theoretical ceiling, not a real board state — no per-turn/board-size/tap-state data exists
 *   anywhere in this codebase to ground a smaller number.
 * - **Each Intercept ally is assumed to redirect exactly one attack.** Intercept's own text has no
 *   stated once-per-turn limit and a surviving ally could plausibly redirect more than one, but
 *   modeling that needs a life/damage simulation this function doesn't attempt — one-for-one is the
 *   simpler, more conservative (i.e. it doesn't overstate how much a small Intercept package can
 *   absorb) assumption.
 * - **No removal, combat tricks, champion-side combat, or non-Intercept mitigation** (e.g. flat
 *   damage-prevention effects like "prevent the next 3 damage") — only printed Ally power vs. a
 *   count of Intercept-keyword Allies.
 * - **Only Unblockable is modeled as bypassing Intercept.** Taunt, Bulwark, Cleave, and every other
 *   combat-relevant keyword are real and excluded, not silently ignored.
 */
export function computeBreakthroughDamage(attackerLines: NamedLine[], defenderLines: NamedLine[], cardsByName: Map<string, Card>): BreakthroughDamageResult {
  const attackers = expandAllyPower(attackerLines, cardsByName);
  const interceptAllyCount = countIntercept(defenderLines, cardsByName);
  return computeBreakthroughDamageCore(attackers, interceptAllyCount);
}

/**
 * Same estimate as `computeBreakthroughDamage`, but against `AVERAGE_DECK_INTERCEPT_ALLY_COUNT`
 * instead of a second real deck's actual Intercept count. Meant for contexts with only one deck to
 * analyze — e.g. a deck's own Analysis tab, which has no second decklist to compare against, but
 * where "this deck has no printed damage" would otherwise read as "this deck can't deal damage" when
 * really its plan is combat. Not a substitute for `computeBreakthroughDamage` wherever a real
 * opposing decklist is actually available (Compare) — the average is a rough stand-in only.
 */
export function computeBreakthroughDamageVsAverage(attackerLines: NamedLine[], cardsByName: Map<string, Card>): BreakthroughDamageResult {
  const attackers = expandAllyPower(attackerLines, cardsByName);
  return computeBreakthroughDamageCore(attackers, AVERAGE_DECK_INTERCEPT_ALLY_COUNT);
}
