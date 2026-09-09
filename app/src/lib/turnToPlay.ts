import type { Card } from "@gatcg/shared";

/**
 * Grand Archive's starting hand size — not encoded in any card data, so this is a plain constant
 * rather than something derived. Kept as an exported default so the UI can still let a viewer
 * override it (e.g. after a mulligan) rather than baking it in silently.
 */
export const DEFAULT_STARTING_HAND_SIZE = 6;

/** How far ahead this ever bothers projecting — well past any real game's relevant turn range. */
const MAX_TURN = 20;

/**
 * A champion's own printed level, materializing normally, advances by exactly one per turn —
 * verified against the official comprehensive rules (rules.gatcg.com, "Leveling Up" and
 * "Materialize Phase" sections): leveling happens "as a result of materializing a champion card
 * during the materialize phase," only a Champion/Regalia can be materialized that way, and "the
 * materialize phase is skipped on each player's first turn." So a champion starts the game at
 * level 1 and, with no acceleration, first reaches level N on turn N (the materialize phase on
 * turn 2 is the first chance to reach level 2, turn 3 for level 3, and so on).
 */
export function naturalLevelByTurn(turn: number): number {
  return 1 + Math.max(0, turn - 1);
}

/**
 * Earliest turn a champion could reach `requiredLevel`, given a set of turns on which a "level up
 * your champion" accelerant becomes usable (see `isSimpleLevelUpAccelerant`) — each one, fired as
 * early as possible, adds one level beyond the natural one-per-turn pace starting the turn it's
 * used. Assumes the deck actually has a champion print at every level up to `requiredLevel` to
 * materialize into (true for essentially every real deck, but not enforced here) and that every
 * listed accelerant is actually drawn — a real assumption, not a guarantee, same as this whole
 * calculator.
 */
export function earliestLevelTurn(requiredLevel: number, accelerantAvailableTurns: number[] = []): number {
  if (requiredLevel <= 1) return 1;
  for (let turn = 1; turn <= MAX_TURN; turn++) {
    const fired = accelerantAvailableTurns.filter((t) => t <= turn).length;
    if (naturalLevelByTurn(turn) + fired >= requiredLevel) return turn;
  }
  return MAX_TURN;
}

/**
 * Heuristic ceiling on hand size by a given turn: starting hand plus one drawn card per turn
 * (Draw Phase draws exactly one card — rules.gatcg.com's Draw Phase page), ignoring anything
 * already spent that turn on other costs. A real upper bound, not a promise — the actual hand at
 * any specific moment in a real game is usually smaller once other plays are accounted for.
 */
function handSizeCeiling(turn: number, startingHandSize: number): number {
  return startingHandSize + Math.max(0, turn - 1);
}

/**
 * Earliest turn a Reserve cost of `reserveCost` could plausibly be paid — the first turn the hand
 * -size ceiling above reaches it. Reserve costs are paid by moving that many cards from hand into
 * memory (rules.gatcg.com's "Costs and Memory" page) — a real, immediate resource question, unlike
 * a Memory cost (see this module's own doc comment on `isSimpleLevelUpAccelerant` for why that one
 * isn't modeled the same way). Ordinary Main Deck cards are never gated by a Memory cost of their
 * own in this game's card pool — every real playable card's own activation cost is Reserve (or
 * free); `cost_memory` only ever appears on Champion/Regalia prints, always equal to that print's
 * own level, which is a Materialize Phase turn-based action rather than a paid activation cost.
 */
export function earliestReserveCostTurn(reserveCost: number | null, startingHandSize: number): number {
  if (!reserveCost || reserveCost <= 0) return 1;
  for (let turn = 1; turn <= MAX_TURN; turn++) if (handSizeCeiling(turn, startingHandSize) >= reserveCost) return turn;
  return MAX_TURN;
}

const LEVEL_UP_RE = /\blevel up your champion\b/i;
/**
 * Excludes "level up your champion" cards whose own trigger needs something built up over
 * multiple turns or outside the player's own resources — counters accumulated over time (Radiant
 * Origin of Cleric/Mage/..., Discover the Divine's enlighten counters), cards already banished to
 * a graveyard (Fireblooded Oath), or a condition about the opponent's board/lineage (Heavenly
 * Guide, Eminence in Fury's "only if" trigger) — verified against every real "level up your
 * champion" card in the corpus (`pipeline/.cache/cards.json`): this excludes exactly the ones with
 * a real multi-turn or external dependency, and keeps the genuinely self-contained ones (Dungeon
 * Guide, Flagrant Guide, Discover the... no: Discover the Divine is excluded via "counters").
 * Not modeled at all for the excluded set — they're surfaced but left for the viewer to reason
 * about by hand, rather than guessing a turn number for a condition this calculator can't verify.
 */
const NOT_SIMPLE_RE = /\bcounters?\b|graveyard|\bonly if\b|opponent controls|lineage/i;

/** Does this card's own printed text grant a "level up your champion" effect this calculator can
 * safely treat as available as soon as its own Reserve cost is payable? See `NOT_SIMPLE_RE`. */
export function isSimpleLevelUpAccelerant(card: Card): boolean {
  const effect = card.effect ?? "";
  return LEVEL_UP_RE.test(effect) && !NOT_SIMPLE_RE.test(effect);
}

export interface TurnToPlayResult {
  /** Earliest turn the card's own Reserve cost could plausibly be paid. */
  costTurn: number;
  /** Earliest turn the required champion level could plausibly be reached. Same as `costTurn`'s
   * turn 1 when no level is required. */
  levelTurn: number;
  /** The later of the two — the earliest turn this card could reasonably be played at all. */
  earliestTurn: number;
}

export function computeTurnToPlay(reserveCost: number | null, requiredLevel: number, accelerantAvailableTurns: number[], startingHandSize: number): TurnToPlayResult {
  const costTurn = earliestReserveCostTurn(reserveCost, startingHandSize);
  const levelTurn = earliestLevelTurn(requiredLevel, accelerantAvailableTurns);
  return { costTurn, levelTurn, earliestTurn: Math.max(costTurn, levelTurn) };
}
