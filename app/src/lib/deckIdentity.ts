import type { Card } from "@gatcg/shared";
import { computeKeywordComposition } from "@gatcg/shared";

export { computeKeywordComposition };
export { cardPillarScore, computeDeckRating } from "@gatcg/shared";
export type { DeckRating, DeckRatingSignals, RatingPillar } from "@gatcg/shared";

export interface DeckIdentity {
  classes: string[];
  elements: string[];
}

interface NamedLine {
  name: string;
  quantity: number;
}

function topKeys(counts: Map<string, number>, limit: number, exclude: Set<string> = new Set()): string[] {
  return Array.from(counts.entries())
    .filter(([key]) => !exclude.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/**
 * A decklist's class/element makeup, weighted by copies — same "top 2, NORM excluded for
 * elements" convention the pipeline uses for archetype signatures (pipeline/src/analysis/decklists.ts),
 * just computed client-side from whatever cards are already resolved. Takes `{name, quantity}`
 * lines (matches DeckCardIndexLine directly; OmnidexDecklistCardLine callers map `card` -> `name`)
 * so it works for any decklist shape — real sightings, popular-deck groups, and pasted/custom decks alike.
 */
export function computeDeckIdentity(lines: NamedLine[], cardsByName: Map<string, Card>): DeckIdentity {
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    for (const c of card.classes) classCounts.set(c, (classCounts.get(c) ?? 0) + line.quantity);
    for (const e of card.elements) elementCounts.set(e, (elementCounts.get(e) ?? 0) + line.quantity);
  }

  return {
    classes: topKeys(classCounts, 2),
    elements: topKeys(elementCounts, 2, new Set(["NORM"])),
  };
}

export interface DeckComposition {
  types: Map<string, number>;
  elements: Map<string, number>;
  subtypes: Map<string, number>;
}

/**
 * Full (not top-N) type/element/subtype tallies weighted by copies, for the deck composition
 * charts on a deck's dedicated page (unlike `computeDeckIdentity`, this keeps every value,
 * including NORM — a composition chart should be an honest complete breakdown, not a "what
 * archetype is this" signature).
 */
export function computeDeckComposition(lines: NamedLine[], cardsByName: Map<string, Card>): DeckComposition {
  const types = new Map<string, number>();
  const elements = new Map<string, number>();
  const subtypes = new Map<string, number>();

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    for (const t of card.types) types.set(t, (types.get(t) ?? 0) + line.quantity);
    for (const e of card.elements) elements.set(e, (elements.get(e) ?? 0) + line.quantity);
    for (const s of card.subtypes) subtypes.set(s, (subtypes.get(s) ?? 0) + line.quantity);
  }

  return { types, elements, subtypes };
}

export interface FloatingMemoryStats {
  /** Cards with an unconditional **Floating Memory** keyword — always counts. */
  base: number;
  /** Cards where Floating Memory is gated behind "[Class Bonus]" or a specific champion's name (e.g. "[Vanitas Bonus]") — counted only when the deck's own champion/class satisfies it. */
  classBonus: number;
}

/**
 * Floating Memory (rules.gatcg.com/game-mechanics/game-mechanics-playing-cards/playing-cards-costs-and-memory):
 * "While paying for a memory cost, you may banish this card from your graveyard to pay for 1 of
 * that cost." Printed on cards as a bare `**Floating Memory**` keyword, sometimes gated behind a
 * bracketed condition — `[Class Bonus]` (card's class matches the champion's class) or a specific
 * champion's name (`[Vanitas Bonus]`). A few instances are gated behind in-game state instead
 * (`[Level 2+]`, `[Sheen 6+]`) — those aren't derivable from a static decklist, so they're
 * deliberately left uncounted rather than guessed at.
 */
const FLOATING_MEMORY_RE = /(\[([^\]]+)\]\s*)?\*\*Floating Memory\*\*/g;

export function computeFloatingMemory(
  lines: NamedLine[],
  cardsByName: Map<string, Card>,
  championName: string | null,
  championClasses: string[],
): FloatingMemoryStats {
  let base = 0;
  let classBonus = 0;

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card?.effect) continue;

    FLOATING_MEMORY_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FLOATING_MEMORY_RE.exec(card.effect)) !== null) {
      const condition = match[2];
      if (!condition) {
        base += line.quantity;
      } else if (condition === "Class Bonus") {
        if (card.classes.some((c) => championClasses.includes(c))) classBonus += line.quantity;
      } else if (condition.endsWith(" Bonus")) {
        const name = condition.slice(0, -" Bonus".length);
        if (name === championName) classBonus += line.quantity;
      }
    }
  }

  return { base, classBonus };
}

export interface AllyPowerStats {
  allyCopies: number;
  totalPower: number;
  averagePower: number;
  /** Power value (as a plain number, e.g. 3) -> ally copy count at that power. */
  byPower: Map<number, number>;
}

/** `power` is populated on every ALLY card (verified against the synced catalog), so no null-handling surprises here. Scoped to ALLY specifically, not ATTACK, per how the stat was asked for. */
export function computeAllyPower(lines: NamedLine[], cardsByName: Map<string, Card>): AllyPowerStats {
  let allyCopies = 0;
  let totalPower = 0;
  const byPower = new Map<number, number>();

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || !card.types.includes("ALLY") || card.power === null) continue;
    allyCopies += line.quantity;
    totalPower += card.power * line.quantity;
    byPower.set(card.power, (byPower.get(card.power) ?? 0) + line.quantity);
  }

  return { allyCopies, totalPower, averagePower: allyCopies > 0 ? totalPower / allyCopies : 0, byPower };
}

interface DamageClause {
  target: "Champion" | "Ally" | "Unit" | "Self" | "Other";
  kind: "fixed" | "variable";
  value: number | null;
}

/** Matches "Deal N damage", "Deal X damage", or "Deal N+X damage" after stripping markdown bold, capturing the trailing target text up to the next sentence. */
const DEAL_DAMAGE_RE = /Deal (\d+(?:\+X)?|X) damage\s*([^.]*)/gi;

/** "your champion"/"own champion" is the caster paying a cost against themselves, not reach damage at an opponent — must be stripped before scanning for "champion" so it can't masquerade as a Champion-target clause. */
const SELF_CHAMPION_RE = /\b(your|own) champion\b/g;

function classifyTarget(rawTargetText: string): { target: DamageClause["target"]; isSelf: boolean } {
  const targetText = rawTargetText.toLowerCase();
  const isSelf = SELF_CHAMPION_RE.test(targetText);
  SELF_CHAMPION_RE.lastIndex = 0;
  // Strip self-champion mentions before locating the earliest remaining target noun, so a clause like
  // "target ally attacking your champion" resolves to Ally (the actual target) instead of Champion.
  const scanText = targetText.replace(SELF_CHAMPION_RE, "");

  // "Unit" is Grand Archive's shared supertype for allies AND champions (rules.gatcg.com) — text that
  // says "champion"/"ally" explicitly is unambiguous; bare "target unit" genuinely could resolve to
  // either at play time, so it gets its own bucket rather than guessing. Pick whichever noun appears
  // first in the text, since that's the one "target"/"deal damage to" is actually modifying.
  const candidates = [
    { target: "Champion" as const, index: scanText.indexOf("champion") },
    { target: "Ally" as const, index: scanText.indexOf("ally") },
    { target: "Ally" as const, index: scanText.indexOf("allies") },
    { target: "Unit" as const, index: scanText.indexOf("unit") },
  ].filter((c) => c.index >= 0);

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.index - b.index);
    return { target: candidates[0].target, isSelf: false };
  }
  return { target: isSelf ? "Self" : "Other", isSelf };
}

function parseDamageClauses(rawEffect: string): DamageClause[] {
  const effect = rawEffect.replace(/\*\*/g, "");
  const clauses: DamageClause[] = [];

  DEAL_DAMAGE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DEAL_DAMAGE_RE.exec(effect)) !== null) {
    const rawValue = match[1];
    const isVariable = rawValue.toUpperCase() === "X" || rawValue.includes("+");
    const { target } = classifyTarget(match[2]);

    clauses.push({ target, kind: isVariable ? "variable" : "fixed", value: isVariable ? null : Number(rawValue) });
  }

  return clauses;
}

/**
 * Fixed printed damage a single copy can deal to an opposing champion. The two values differ when
 * a card has multiple fixed champion-damage clauses (usually level- or state-gated). Variable-X
 * clauses and damage to the controller's own champion are intentionally excluded.
 */
export function fixedChampionDamageRange(card: Pick<Card, "effect">): DamageRange | null {
  if (!card.effect) return null;
  const values = parseDamageClauses(card.effect)
    .filter((clause) => clause.target === "Champion" && clause.kind === "fixed")
    .map((clause) => clause.value!);
  return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

export interface DamageRange {
  min: number;
  max: number;
}

/**
 * Memory cost distribution across main+material, weighted by copies — the direct Grand Archive
 * equivalent of a "mana curve" (what you'll actually draw and cast, not just what's on the list
 * once). Champions are excluded: they start in play from the lineage rather than being drawn and
 * cast like everything else, so their memory cost answers a different question (deck-building
 * budget, not "what will I actually be casting turn to turn"). Cards with an X memory cost
 * (cost_memory encoded as -1) are excluded too, same reasoning as the damage classifier — not a
 * fixed number to bucket. Costs above 6 are rare outliers (verified against the real catalog: only
 * a handful of non-champion cards exceed 3, topping out at 12) and are folded into a "6+" bucket so
 * the chart stays a fixed, readable width.
 */
export function computeMemoryCostCurve(lines: NamedLine[], cardsByName: Map<string, Card>): { label: string; value: number }[] {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || card.types.includes("CHAMPION")) continue;
    if (card.cost_memory === null || card.cost_memory < 0) continue;
    const bucket = Math.min(card.cost_memory, 6);
    counts.set(bucket, (counts.get(bucket) ?? 0) + line.quantity);
  }

  return Array.from({ length: 7 }, (_, cost) => ({
    label: cost === 6 ? "6+" : String(cost),
    value: counts.get(cost) ?? 0,
  }));
}

/**
 * Reserve cost distribution across main+material, weighted by copies — the other half of Grand
 * Archive's two resource costs (memory vs. reserve; a card only ever pays one). Same exclusions as
 * `computeMemoryCostCurve`: no champions (none actually carry a reserve cost in the current
 * catalog, but excluded for the same "not something you cast" reasoning) and no X-cost cards
 * (cost_reserve encoded as -1). Real catalog costs run 0-16 with a long thin tail past 8, so values
 * above 8 fold into an "8+" bucket.
 */
export function computeReserveCostCurve(lines: NamedLine[], cardsByName: Map<string, Card>): { label: string; value: number }[] {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || card.types.includes("CHAMPION")) continue;
    if (card.cost_reserve === null || card.cost_reserve < 0) continue;
    const bucket = Math.min(card.cost_reserve, 8);
    counts.set(bucket, (counts.get(bucket) ?? 0) + line.quantity);
  }

  return Array.from({ length: 9 }, (_, cost) => ({
    label: cost === 8 ? "8+" : String(cost),
    value: counts.get(cost) ?? 0,
  }));
}

/**
 * Rarity distribution across main+material, weighted by copies — rarity is per-edition, so this
 * uses each card's first edition (same "representative printing" convention as `CardImage`/
 * `DecklistView`, which already do this for images/pricing) rather than trying to track which
 * specific printing a player owns.
 */
export function computeRarityBreakdown(lines: NamedLine[], cardsByName: Map<string, Card>): Map<number, number> {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    const rarity = card?.editions[0]?.rarity;
    if (rarity === undefined) continue;
    counts.set(rarity, (counts.get(rarity) ?? 0) + line.quantity);
  }
  return counts;
}

export interface DamageComposition {
  /** Weighted card count per target category — a card can land in more than one bucket if it has clauses hitting different target types. */
  targets: Map<string, number>;
  /** Weighted card count per certainty level: "Fixed" (single plain number), "Conditional" (multiple damage clauses on one card — usually an escalating if/level-gated effect), "Variable" (scales with an X that depends on game state). */
  conditionality: Map<string, number>;
  /**
   * Guaranteed-to-best-case damage range, summed only from clauses that unambiguously target a
   * champion (excludes "target unit"/"target ally"/variable-X clauses entirely, rather than
   * guess) — min is the lowest number on a card's champion-targeting clauses, max the highest
   * (equal for cards with just one fixed clause), weighted by copies.
   */
  championRange: DamageRange;
  /** Same as `championRange` but scoped to unambiguous "target ally"/"all allies" clauses — direct removal capacity, tracked separately since it's a different question from reach damage. */
  allyRange: DamageRange;
}

export function computeDamageComposition(lines: NamedLine[], cardsByName: Map<string, Card>): DamageComposition {
  const targets = new Map<string, number>();
  const conditionality = new Map<string, number>();
  let championMin = 0;
  let championMax = 0;
  let allyMin = 0;
  let allyMax = 0;

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card?.effect) continue;

    const clauses = parseDamageClauses(card.effect);
    if (clauses.length === 0) continue;

    for (const target of new Set(clauses.map((c) => c.target))) {
      targets.set(target, (targets.get(target) ?? 0) + line.quantity);
    }

    const hasVariable = clauses.some((c) => c.kind === "variable");
    const condLabel = hasVariable ? "Variable" : clauses.length > 1 ? "Conditional" : "Fixed";
    conditionality.set(condLabel, (conditionality.get(condLabel) ?? 0) + line.quantity);

    const championDamage = fixedChampionDamageRange(card);
    if (championDamage) {
      championMin += championDamage.min * line.quantity;
      championMax += championDamage.max * line.quantity;
    }

    const allyValues = clauses.filter((c) => c.target === "Ally" && c.kind === "fixed").map((c) => c.value!);
    if (allyValues.length > 0) {
      allyMin += Math.min(...allyValues) * line.quantity;
      allyMax += Math.max(...allyValues) * line.quantity;
    }
  }

  return {
    targets,
    conditionality,
    championRange: { min: championMin, max: championMax },
    allyRange: { min: allyMin, max: allyMax },
  };
}
