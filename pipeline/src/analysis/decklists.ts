import type { OmnidexDecklist, OmnidexDecklistEntry, PlayerTopCard } from "@gatcg/shared";
import type { CardSignature } from "../cards/catalog.js";

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
   * The Champion's character name (e.g. "Alice"), read off the CHAMPION-typed cards in the
   * Material Deck — verified against live data: a deck's material section holds several
   * alternate-form printings of one named character ("Alice, Distorted Queen" / "Alice, Phantom
   * Monarch" / ...) plus a generic "Spirit of <element>" card, which is excluded here since it
   * doesn't carry a character name. Majority vote by copies in the rare case (~7% of decks in a
   * sampled event) where a deck's material section mixes more than one identity. Null if no
   * named champion card could be found (e.g. an unmatched/misnamed decklist entry).
   */
  championName: string | null;
  /** Display label for grouping decks into archetypes — the champion name, or a class+element fallback when unknown. */
  signature: string;
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

/** Class/element/Champion identity is derived from main+material only — sideboard doesn't define what a deck "is". */
function tally(lines: { card: string; quantity: number }[], cardIndex: Map<string, CardSignature>) {
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();
  const championNameCounts = new Map<string, number>();
  const unmatched: string[] = [];
  let cardCount = 0;

  for (const line of lines) {
    cardCount += line.quantity;
    const card = cardIndex.get(line.card);
    if (!card) {
      unmatched.push(line.card);
      continue;
    }
    for (const c of card.classes) classCounts.set(c, (classCounts.get(c) ?? 0) + line.quantity);
    for (const e of card.elements) elementCounts.set(e, (elementCounts.get(e) ?? 0) + line.quantity);

    if (card.types.includes("CHAMPION") && line.card.includes(",")) {
      const name = line.card.split(",")[0].trim();
      championNameCounts.set(name, (championNameCounts.get(name) ?? 0) + line.quantity);
    }
  }

  return { classCounts, elementCounts, championNameCounts, unmatched, cardCount };
}

function topKeys(counts: Map<string, number>, limit: number, exclude: Set<string> = new Set()): string[] {
  return Array.from(counts.entries())
    .filter(([key]) => !exclude.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function toLines(lines: { card: string; quantity: number }[]): DeckCardLine[] {
  return lines.map((l) => ({ name: l.card, quantity: l.quantity }));
}

/** The Spirit card lives in the Material Deck alongside the Champion's own printings — CHAMPION type, SPIRIT subtype, no comma in name (unlike "Alice, Distorted Queen"). */
function findSpirit(
  materialLines: { card: string; quantity: number }[],
  cardIndex: Map<string, CardSignature>,
): { name: string; element: string | null } | null {
  for (const line of materialLines) {
    const card = cardIndex.get(line.card);
    if (card?.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")) {
      return { name: line.card, element: card.elements[0] ?? null };
    }
  }
  return null;
}

export function buildDeckSignature(
  player: number,
  decklist: OmnidexDecklist,
  cardIndex: Map<string, CardSignature>,
): DeckSignature {
  const { classCounts, elementCounts, championNameCounts, unmatched, cardCount } = tally(
    [...decklist.main, ...decklist.material],
    cardIndex,
  );

  const classes = topKeys(classCounts, 2);
  const elements = topKeys(elementCounts, 2, new Set(["NORM"]));
  const [championName] = topKeys(championNameCounts, 1);

  const fallback = [...classes].sort().concat([...elements].sort()).join("+") || "UNKNOWN";
  const spirit = findSpirit(decklist.material, cardIndex);

  return {
    player,
    cardCount,
    classes,
    elements,
    championName: championName ?? null,
    signature: championName ?? fallback,
    spiritName: spirit?.name ?? null,
    spiritElement: spirit?.element ?? null,
    mainCards: toLines(decklist.main),
    materialCards: toLines(decklist.material),
    sideboardCards: toLines(decklist.sideboard),
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
