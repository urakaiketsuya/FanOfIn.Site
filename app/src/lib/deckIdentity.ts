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
  /**
   * Ceiling total/average power once board-state-scaled allies (e.g. Maiden of Primal Virtue's
   * "+1 [POWER] for each phantasia you control") are sized off this deck's own count of whatever
   * they scale with — same optimistic-ceiling convention `aggressionForecast.ts`'s subtype-scaling
   * damage uses: a floor from the printed base stat (0 for most of these), a ceiling from "every
   * copy of the scaling type/subtype this list runs were simultaneously in play." Never how many
   * will actually be alive on board at once — equal to `totalPower`/`averagePower` when the deck
   * runs no such cards.
   */
  totalPowerMax: number;
  averagePowerMax: number;
  /** Of `allyCopies`, how many have board-state-scaled power rather than a fixed printed number — so callers can flag `averagePower` as a floor, not the card's real battlefield stat. */
  scalingPowerCopies: number;
  /** Power value (as a plain number, e.g. 3) -> ally copy count at that power. Bucketed by printed floor even for scaling allies, since their real power isn't a fixed number. */
  byPower: Map<number, number>;
}

/**
 * "Whenever X you control" board-state noun this deck's own cards (main + material) actually run,
 * gating `parseSubtypeScalingStat` the same way `aggressionForecast.ts`'s `knownSubtypes` gates its
 * own subtype-scaling damage detection — so a generic capitalized word can't misfire as a real
 * identity-scaling subject. Built from both `types` and `subtypes` since the scaling noun can be
 * either (e.g. "phantasia" is a card *type*, not a subtype).
 */
function vocabularyCopyCounts(lines: NamedLine[], cardsByName: Map<string, Card>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    for (const word of [...card.types, ...card.subtypes]) {
      const key = word.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + line.quantity);
    }
  }
  return counts;
}

export interface SubtypeScalingStat {
  /** Extra power per copy of `subtype` this deck controls. */
  perUnitPower: number;
  /** Normalized (lowercase) type/subtype name the card scales with. */
  subtype: string;
}

/**
 * Nouns too broad to mean anything as an "identity" count — nearly every creature is an "ally",
 * and "token"/"card" don't correspond to a fixed number of printed copies in a decklist the way a
 * real type/subtype like "phantasia" or "Fractal" does. Excluded even though they'd otherwise pass
 * the `knownVocabulary` check (every deck's own cards are almost all type ALLY).
 */
const EXCLUDED_SCALING_SUBJECTS = new Set(["ally", "allies", "champion", "champions", "unit", "units", "token", "tokens", "card", "cards"]);

/**
 * Matches the narrow, unambiguous "gets +N [POWER] (and +N [LIFE]) for each <single word> you
 * control" shape (e.g. Maiden of Primal Virtue). Deliberately requires the scaling noun to be one
 * bare word directly followed by "you control" — real cards with a qualifier in between (a named
 * unique, a capped "up to N", a compound noun like "token object") don't match and are silently
 * excluded rather than misparsed, since none of those represent a plain per-copy count this
 * function's ceiling estimate could size correctly.
 */
const SCALING_STAT_RE = /gets? \+(\d+) \[POWER\](?:\s*and\s*\+\d+ \[LIFE\])?\s*for each ([a-zA-Z]+) you control/i;

export function parseSubtypeScalingStat(card: Pick<Card, "effect">, knownVocabulary: ReadonlySet<string>): SubtypeScalingStat | null {
  if (!card.effect) return null;
  const match = SCALING_STAT_RE.exec(card.effect.replace(/\*\*/g, ""));
  if (!match) return null;
  const subtype = match[2].toLowerCase();
  if (EXCLUDED_SCALING_SUBJECTS.has(subtype) || !knownVocabulary.has(subtype)) return null;
  return { perUnitPower: Number(match[1]), subtype };
}

/** `power` is populated on every ALLY card (verified against the synced catalog), so no null-handling surprises here. Scoped to ALLY specifically, not ATTACK, per how the stat was asked for. */
export function computeAllyPower(lines: NamedLine[], cardsByName: Map<string, Card>): AllyPowerStats {
  let allyCopies = 0;
  let totalPower = 0;
  let totalPowerMax = 0;
  let scalingPowerCopies = 0;
  const byPower = new Map<number, number>();

  const knownVocabulary = new Set<string>();
  for (const card of cardsByName.values()) for (const word of [...card.types, ...card.subtypes]) knownVocabulary.add(word.toLowerCase());
  const vocabCounts = vocabularyCopyCounts(lines, cardsByName);

  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || !card.types.includes("ALLY") || card.power === null) continue;
    allyCopies += line.quantity;
    totalPower += card.power * line.quantity;
    byPower.set(card.power, (byPower.get(card.power) ?? 0) + line.quantity);

    const scaling = parseSubtypeScalingStat(card, knownVocabulary);
    if (scaling) {
      scalingPowerCopies += line.quantity;
      totalPowerMax += (card.power + scaling.perUnitPower * (vocabCounts.get(scaling.subtype) ?? 0)) * line.quantity;
    } else {
      totalPowerMax += card.power * line.quantity;
    }
  }

  return {
    allyCopies,
    totalPower,
    averagePower: allyCopies > 0 ? totalPower / allyCopies : 0,
    totalPowerMax,
    averagePowerMax: allyCopies > 0 ? totalPowerMax / allyCopies : 0,
    scalingPowerCopies,
    byPower,
  };
}

/** "1.5" for a deck with no board-state-scaled allies, "1.5–3.2" once `computeAllyPower` finds some — so a single flat number never quietly stands in for what's really a floor. */
export function formatAllyPower(stats: AllyPowerStats): string {
  if (stats.scalingPowerCopies === 0) return stats.averagePower.toFixed(1);
  return `${stats.averagePower.toFixed(1)}–${stats.averagePowerMax.toFixed(1)}`;
}

interface DamageClause {
  target: "Champion" | "Ally" | "Unit" | "Self" | "Other";
  kind: "fixed" | "variable";
  value: number | null;
}

/**
 * Matches "Deal N damage", "Deal X damage", "Deal N+X damage", or the same forms preceded by
 * "an additional"/"a further" (e.g. Burst Asunder's "deal an additional 2 damage to that unit"),
 * after stripping markdown bold, capturing the trailing target text up to the next sentence. The
 * additional-damage prefix is common on scaling/combo clauses layered onto a card's base damage —
 * without it, that second clause silently fails to match at all rather than just misclassifying.
 * A single adjective word is allowed between the number and "damage" (e.g. Spark Alight's "Deal 2
 * unpreventable damage") — without this, the whole clause silently fails to match, not just its
 * unpreventable-ness; the real card pool has been checked for how many distinct modifier words
 * actually appear (one, "unpreventable", as of this writing) so this stays generalized rather than
 * hardcoded to that word specifically.
 */
const DEAL_DAMAGE_RE = /Deal (?:an additional |a further )?(\d+(?:\+X)?|X)(?: [a-zA-Z]+)? damage\s*([^.]*)/gi;

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

/** "Choose one. ... —" modal framing (e.g. Vermilion Decree) — every bullet is one of several
 * mutually-exclusive options, so a Champion-damage clause inside one is a possible mode, not a
 * guarantee the way a plain "Deal N damage to target champion" clause is. */
const MODAL_RE = /\bChoose one\b/i;

/**
 * Fixed printed damage a single copy can deal to an opposing champion. The two values differ when
 * a card has multiple fixed champion-damage clauses (usually level- or state-gated). Variable-X
 * clauses, damage to the controller's own champion, and Champion-damage clauses that are only one
 * mode of a "Choose one" modal card are intentionally excluded — none of those are guaranteed the
 * way this range's callers (the forecast's Min/guaranteed side) require. See
 * `ambiguousFixedChampionDamage` for the non-guaranteed counterpart.
 */
export function fixedChampionDamageRange(card: Pick<Card, "effect">): DamageRange | null {
  if (!card.effect) return null;
  if (MODAL_RE.test(card.effect)) return null;
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
 * Fixed printed damage a single copy could deal to an opposing champion, but isn't guaranteed to —
 * either because the clause targets the ambiguous "unit" bucket (legally includes champions, so
 * genuinely could go to face even though it might land on an ally instead — e.g. Blazing Throw's
 * "Deal 4 damage to target unit"), or because the clause sits inside a "Choose one" modal card
 * (e.g. Vermilion Decree's "Deal 3 damage to up to one target champion" bullet — a mode the
 * controller might not pick). Returns the highest such value on the card, for sizing an optimistic
 * ceiling estimate — never a guarantee, so callers must never fold this into a Min/guaranteed
 * number. Excludes anything `parseSubtypeScalingDamage` already accounts for via its own base
 * clause, since that combo shape gets a richer (fodder-scaled) estimate instead.
 */
export function ambiguousFixedChampionDamage(card: Pick<Card, "effect">): number | null {
  if (!card.effect) return null;
  const modal = MODAL_RE.test(card.effect);
  const clauses = parseDamageClauses(card.effect).filter(
    (clause) => clause.kind === "fixed" && (clause.target === "Unit" || (modal && clause.target === "Champion")),
  );
  return clauses.length > 0 ? Math.max(...clauses.map((clause) => clause.value!)) : null;
}

/**
 * Does this card deal champion-reach damage that no other export here can put a number on — a
 * variable-X clause targeting Champion or Unit? (Fixed-value clauses always land in
 * `fixedChampionDamageRange`, `parseSubtypeScalingDamage`, or `ambiguousFixedChampionDamage`
 * instead, so they never reach this fallback.) This is what keeps a card like Chronicle's
 * X-damage burn visible as excluded-because-unquantifiable, rather than not surfacing at all.
 * Deliberately excludes Ally/Self-only clauses, which never reach the champion.
 */
export function hasUnquantifiedChampionDamage(card: Pick<Card, "effect">): boolean {
  if (!card.effect) return false;
  return parseDamageClauses(card.effect).some((clause) => clause.kind === "variable" && (clause.target === "Champion" || clause.target === "Unit"));
}

/** "At the beginning of your <phase>, Deal N damage to ..." with "Deal" appearing immediately after
 * the trigger's comma — an unconditional recurring trigger, as opposed to the many state-gated
 * variants in the real card pool (e.g. Ashwick Cremator's "...if you have no cards in your
 * hand..."), which this deliberately excludes since a forecast can't evaluate an arbitrary
 * board-state condition: requiring "Deal" to directly follow the comma means any intervening
 * "if"/condition clause breaks the match rather than being silently ignored. */
const RECURRING_DAMAGE_RE = /At the beginning of your [^,]*phase,\s*Deal (\d+) damage to ([^.]*)\./i;

/**
 * Fixed damage a Material Deck card deals to an opposing champion every one of the controller's
 * turns, unconditionally, once it's in play — e.g. Fabled Ruby Fatestone's "At the beginning of
 * your recollection phase, deal 1 damage to each champion." Material Deck cards are known and in
 * play from the start of the game rather than drawn at random (same convention
 * `drawEffects.ts`'s `materialDrawBonus` uses), so this is a flat per-turn number, not something
 * the "cards seen" hypergeometric model applies to — see `computeAggressionForecast`, which
 * surfaces it as a separate per-turn figure rather than folding it into the seen-based table.
 * Excludes damage to the controller's own champion only (reuses `classifyTarget`'s "your/own
 * champion" stripping), same as every other export here.
 */
export function parseRecurringChampionDamage(card: Pick<Card, "effect">): number | null {
  if (!card.effect) return null;
  const clean = card.effect.replace(/\*\*/g, "");
  const match = RECURRING_DAMAGE_RE.exec(clean);
  if (!match) return null;
  const { target } = classifyTarget(match[2]);
  return target === "Champion" || target === "Unit" ? Number(match[1]) : null;
}

/** Does this card's damage clause say "each champion" — hitting the controller's own champion too,
 * not just the opponent's (e.g. Embercrypt Burn's "deal 2 damage to each champion")? Doesn't change
 * any guaranteed value: the opponent's champion still takes the full amount regardless of who else
 * it hits. This just flags the real cost to the card's own controller, so a forecast reader isn't
 * left thinking a "guaranteed" damage source is free. */
const EACH_CHAMPION_RE = /\beach champion\b/i;

export function isSymmetricChampionDamage(card: Pick<Card, "effect">): boolean {
  if (!card.effect) return false;
  return EACH_CHAMPION_RE.test(card.effect.replace(/\*\*/g, ""));
}

export interface SubtypeScalingDamage {
  /** This card's own printed base damage, before any subtype-sacrifice bonus (e.g. Burst Asunder's base 2). */
  baseDamage: number;
  /** Extra damage per copy of `subtype` sacrificed (e.g. Burst Asunder's "additional 2 damage" per Fractal). */
  perUnitDamage: number;
  /** Normalized (lowercase, singular) subtype name sacrificed to fuel the bonus — matches `card.subtypes` case-insensitively once pluralization is stripped. */
  subtype: string;
}

const SACRIFICE_ANY_AMOUNT_RE = /sacrifice\s+any amount of\s+([A-Za-z]+)/i;

/**
 * Detects the "Deal N damage to target unit. ...sacrifice any amount of <Subtype>s... deal an
 * additional M damage..." combo shape (e.g. Burst Asunder feeding off Fractal tokens) — damage that
 * genuinely scales with deck composition, not just a fixed number. `fixedChampionDamageRange`
 * correctly excludes this from its *guaranteed* range (the "unit" target is ambiguous, and neither
 * clause is a flat number a champion is certain to take), but for a deck actually built around the
 * combo it is real, sizeable reach damage that a forecast reporting flat zero would misrepresent —
 * see `computeAggressionForecast`, which uses this to size an optimistic (not guaranteed) estimate
 * from how much of the named subtype the deck actually runs.
 *
 * `knownSubtypes` (real subtype strings, lowercased) gates the match the same way `cardIntent.ts`'s
 * `extractConsumedSubtypes` gates its own subtype detection, so a generic capitalized word after
 * "sacrifice any amount of" can't misfire as a subtype trigger. Restricted to clauses targeting
 * Champion/Unit (never Ally/Self), so an ally-buff or self-damage clause sharing the sentence can't
 * be mistaken for reach damage.
 */
export function parseSubtypeScalingDamage(card: Pick<Card, "effect">, knownSubtypes: ReadonlySet<string>): SubtypeScalingDamage | null {
  if (!card.effect) return null;
  const clean = card.effect.replace(/\*\*/g, "");
  const sacMatch = SACRIFICE_ANY_AMOUNT_RE.exec(clean);
  if (!sacMatch) return null;
  const subtype = sacMatch[1].replace(/s$/i, "").toLowerCase();
  if (!knownSubtypes.has(subtype)) return null;

  const clauses = parseDamageClauses(clean).filter((clause) => clause.target === "Champion" || clause.target === "Unit");
  if (clauses.length < 2) return null;
  const [baseClause, ...rest] = clauses;
  const scalingClause = rest[rest.length - 1];
  if (baseClause.kind !== "fixed" || baseClause.value === null) return null;
  if (scalingClause.kind !== "fixed" || scalingClause.value === null) return null;

  return { baseDamage: baseClause.value, perUnitDamage: scalingClause.value, subtype };
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
