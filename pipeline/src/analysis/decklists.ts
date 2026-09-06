import type { OmnidexDecklist, OmnidexDecklistEntry, PlayerTopCard } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../cards/catalog.js";

export interface DeckCardLine {
  name: string;
  quantity: number;
}

export interface DeckSignature {
  player: number;
  cardCount: number;
  /** Top classes present in the deck, weighted by copies, most-played first. */
  classes: string[];
  /** Top elements present, "NORM" (colorless) excluded since it doesn't distinguish archetypes. */
  elements: string[];
  /**
   * The Champion's character name (e.g. "Alice"), taken from whichever named CHAMPION printing
   * in the Material Deck has the highest level — see `findChampionName`. Null if no named
   * champion card could be found (e.g. an unmatched/misnamed decklist entry).
   */
  championName: string | null;
  /**
   * The named Spirit companion card in the Material Deck (CHAMPION type, SPIRIT subtype, e.g.
   * "Spirit of Water"), if present — a champion can be built around different Spirits, which
   * pulls the deck toward a different secondary element and can drastically change card choices.
   * Null if no Spirit card was found in the material section.
   */
  spiritName: string | null;
  /** The Spirit card's element (e.g. "WATER", or "NORM" for elementless Spirits like "Spirit of Chess"). Null only if no Spirit was found. */
  spiritElement: string | null;
  mainCards: DeckCardLine[];
  materialCards: DeckCardLine[];
  sideboardCards: DeckCardLine[];
  /** Card names present in the decklist but not found in the card catalog — a data-quality signal. */
  unmatchedCardNames: string[];
}

/** Class/element identity is derived from main+material only — sideboard doesn't define what a deck "is". */
function tally(lines: { card: string; quantity: number }[], cardIndex: Map<string, CardSignature>) {
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();
  const unmatched: string[] = [];
  let cardCount = 0;

  for (const line of lines) {
    cardCount += line.quantity;
    const card = resolveCard(cardIndex, line.card);
    if (!card) {
      unmatched.push(line.card);
      continue;
    }
    for (const c of card.classes) classCounts.set(c, (classCounts.get(c) ?? 0) + line.quantity);
    for (const e of card.elements) elementCounts.set(e, (elementCounts.get(e) ?? 0) + line.quantity);
  }

  return { classCounts, elementCounts, unmatched, cardCount };
}

/**
 * A deck's Champion is the named identity behind its *highest-level* Champion printing in the
 * Material Deck (e.g. "Alice, Trifle's Royalty" at level 3 beats "Alice, Distorted Queen" at
 * level 1) — this is what the player actually built toward, since level-1/2/3 prints of the same
 * character are separate physical cards. Ties (same max level for two identities, e.g. neither
 * got played past level 1) fall back to whichever has more copies in the material deck. Spirit
 * companions (level 0, e.g. "Sabrina, Spirit of Water") only win if nothing else qualifies.
 *
 * Returns null (surfaced in the UI as "Unknown champion") for the ~0.7% of decklists that
 * genuinely have no Champion-type card in either section — verified live against several real
 * examples (e.g. event 60368 player 848): every "Name, Title"-formatted card in those decklists
 * turned out to be a UNIQUE ALLY (e.g. "Blanche, Sheltering Saint"), not a misplaced Champion, so
 * there is nothing to recover here — the submitted decklist is just missing its Champion card, an
 * upstream Omnidex data gap rather than a section-placement bug in our own logic.
 */
function findChampionName(
  materialLines: { card: string; quantity: number }[],
  cardIndex: Map<string, CardSignature>,
): string | null {
  const byName = new Map<string, { maxLevel: number; copies: number }>();

  for (const line of materialLines) {
    const card = resolveCard(cardIndex, line.card);
    // Spirit companions are also CHAMPION-typed, and 13 of the 31 have a comma in their name
    // (e.g. "Kaze, Spirit of Wind") -- without this exclusion they get mistaken for the deck's
    // actual Champion. Verified live: real archetype data had a "Gwendolyn" (from "Gwendolyn,
    // Spirit of Wind") signature with 16 decks, none of which were actually built around a
    // Champion named Gwendolyn.
    if (!card || !card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) continue;
    // Named champions are "Name, Title" and the identity is the part before the comma. "Nameless
    // Champion" (verified as the only comma-less, non-Spirit Champion card in the whole catalog)
    // has no title to split off, so use its full name as-is rather than excluding it entirely.
    // Split the catalog's canonical `card.name`, not the raw `line.card` — a mis-cased submission
    // ("guo jia, blessed scion") would otherwise create its own separate, wrongly-cased identity
    // bucket instead of joining the real "Guo Jia" group.
    const name = card.name.includes(",") ? card.name.split(",")[0].trim() : card.name;
    const level = card.level ?? 0;
    const entry = byName.get(name) ?? { maxLevel: -1, copies: 0 };
    entry.maxLevel = Math.max(entry.maxLevel, level);
    entry.copies += line.quantity;
    byName.set(name, entry);
  }

  let best: string | null = null;
  let bestLevel = -1;
  let bestCopies = -1;
  for (const [name, { maxLevel, copies }] of byName) {
    if (maxLevel > bestLevel || (maxLevel === bestLevel && copies > bestCopies)) {
      best = name;
      bestLevel = maxLevel;
      bestCopies = copies;
    }
  }
  return best;
}

function topKeys(counts: Map<string, number>, limit: number, exclude: Set<string> = new Set()): string[] {
  return Array.from(counts.entries())
    .filter(([key]) => !exclude.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/** `name` is the catalog's canonical `card.name` when the line matches (even loosely, via `resolveCard`'s case/quote folding) — falls back to the raw string only for a genuinely unrecognized card, so a mis-cased submission of a real card joins the same identity as every correctly-cased one instead of forming its own disconnected entry. */
function toLines(lines: { card: string; quantity: number }[], cardIndex: Map<string, CardSignature>): DeckCardLine[] {
  return lines.map((l) => ({ name: resolveCard(cardIndex, l.card)?.name ?? l.card, quantity: l.quantity }));
}

/** The Spirit card lives in the Material Deck alongside the Champion's own printings — CHAMPION type, SPIRIT subtype, no comma in name (unlike "Alice, Distorted Queen"). */
function findSpirit(
  materialLines: { card: string; quantity: number }[],
  cardIndex: Map<string, CardSignature>,
): { name: string; element: string | null } | null {
  for (const line of materialLines) {
    const card = resolveCard(cardIndex, line.card);
    if (card?.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")) {
      return { name: card.name, element: card.elements[0] ?? null };
    }
  }
  return null;
}

export function buildDeckSignature(
  player: number,
  decklist: OmnidexDecklist,
  cardIndex: Map<string, CardSignature>,
): DeckSignature {
  const { classCounts, elementCounts, unmatched, cardCount } = tally([...decklist.main, ...decklist.material], cardIndex);

  const classes = topKeys(classCounts, 2);
  const elements = topKeys(elementCounts, 2, new Set(["NORM"]));
  const championName = findChampionName(decklist.material, cardIndex);
  const spirit = findSpirit(decklist.material, cardIndex);

  return {
    player,
    cardCount,
    classes,
    elements,
    championName,
    spiritName: spirit?.name ?? null,
    spiritElement: spirit?.element ?? null,
    mainCards: toLines(decklist.main, cardIndex),
    materialCards: toLines(decklist.material, cardIndex),
    sideboardCards: toLines(decklist.sideboard, cardIndex),
    unmatchedCardNames: unmatched,
  };
}

export function buildEventDeckSignatures(
  decklists: OmnidexDecklistEntry[],
  cardIndex: Map<string, CardSignature>,
): Map<number, DeckSignature> {
  const byPlayer = new Map<number, DeckSignature>();
  for (const entry of decklists) {
    byPlayer.set(entry.player, buildDeckSignature(entry.player, entry.decklist, cardIndex));
  }
  return byPlayer;
}

export interface SectionCardCount {
  deckCount: number;
  totalCopies: number;
}

/** Tallies one deck's card lines from a single section into a running per-card count map (in place). */
export function tallySectionCounts(counts: Map<string, SectionCardCount>, lines: DeckCardLine[]): void {
  const copiesByName = new Map<string, number>();
  for (const line of lines) copiesByName.set(line.name, (copiesByName.get(line.name) ?? 0) + line.quantity);
  for (const [name, copies] of copiesByName) {
    const c = counts.get(name) ?? { deckCount: 0, totalCopies: 0 };
    c.deckCount += 1;
    c.totalCopies += copies;
    counts.set(name, c);
  }
}

/** Ranks a section's tallied counts into a capped top-N list, resolving each card's slug. */
export function topCardsFromCounts(
  counts: Map<string, SectionCardCount>,
  limit: number,
  cardIndex: Map<string, CardSignature>,
): PlayerTopCard[] {
  return Array.from(counts.entries())
    .sort((x, y) => y[1].deckCount - x[1].deckCount)
    .slice(0, limit)
    .map(([name, c]) => ({ name, slug: cardIndex.get(name)?.slug ?? null, deckCount: c.deckCount, totalCopies: c.totalCopies }));
}

/**
 * "Type" tags that ride alongside a card's real type rather than naming one themselves (e.g.
 * Apotheosis Rite's `types` is `["REGALIA", "ITEM"]`, not a Regalia-typed card with no other
 * type — see `app/src/lib/cardTypeIcon.ts`'s identical finding). Confirmed against the full card
 * catalog: none of these three ever appear as a card's only type, so `types[0]` alone silently
 * mis-bucketed every Regalia/Unique/Token card (2,495-card catalog: 378 Regalia, 197 Unique, 41
 * Token cards affected — not a rare edge case).
 */
const NON_TYPE_TAGS = new Set(["REGALIA", "UNIQUE", "TOKEN"]);

/** The type that actually names what a card is, ignoring tags from `NON_TYPE_TAGS`. Falls back to `types[0]` if every entry is a tag (shouldn't happen in practice — verified 0 such cards in the real catalog). */
function primaryCardType(types: string[]): string | undefined {
  return types.find((t) => !NON_TYPE_TAGS.has(t)) ?? types[0];
}

/**
 * Same ranking as `topCardsFromCounts`, but regrouped by each card's own primary type (e.g.
 * "ALLY"/"ATTACK"/"DOMAIN") and capped independently per type, instead of one flat top-N — a type
 * that appears in fewer decks overall (e.g. Domain) would otherwise get crowded out of a flat list
 * by a more numerous one (e.g. Ally). Cards with no resolvable type are omitted rather than lumped
 * into a fake bucket. Empty groups are omitted entirely.
 */
export function topCardsByTypeFromCounts(
  counts: Map<string, SectionCardCount>,
  perTypeLimit: number,
  cardIndex: Map<string, CardSignature>,
): Record<string, PlayerTopCard[]> {
  const byType = new Map<string, [string, SectionCardCount][]>();
  for (const entry of counts.entries()) {
    const [name] = entry;
    const type = primaryCardType(cardIndex.get(name)?.types ?? []);
    if (!type) continue;
    const list = byType.get(type) ?? [];
    list.push(entry);
    byType.set(type, list);
  }
  const result: Record<string, PlayerTopCard[]> = {};
  for (const [type, entries] of byType) {
    result[type] = entries
      .sort((x, y) => y[1].deckCount - x[1].deckCount)
      .slice(0, perTypeLimit)
      .map(([name, c]) => ({ name, slug: cardIndex.get(name)?.slug ?? null, deckCount: c.deckCount, totalCopies: c.totalCopies }));
  }
  return result;
}
