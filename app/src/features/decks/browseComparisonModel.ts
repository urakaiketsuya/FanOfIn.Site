import type { DeckSighting, PublicDeckSummary } from "@gatcg/shared";
import type { ComparedDeck } from "../compare/types";
import type { PopularDeck } from "../popular/useDeckPopularity";
import { shortHash } from "../../lib/hash";

export type BrowseComparisonDeck = ComparedDeck | {
  key: string;
  label: string;
  source: { kind: "public"; slug: string };
};

export function sightingComparison(deck: DeckSighting, player: string): BrowseComparisonDeck {
  return { key: deck.deckId, label: `${deck.championName ?? "Deck"} · ${player} @ ${deck.eventName}`, source: { kind: "sighting", eventId: deck.eventId, player: deck.player } };
}

export function publicComparison(deck: PublicDeckSummary): BrowseComparisonDeck {
  return { key: `public:${deck.publicSlug}`, label: `${deck.title} · ${deck.owner.displayName}`, source: { kind: "public", slug: deck.publicSlug } };
}

export function buildComparison(deck: PopularDeck): BrowseComparisonDeck {
  const hash = shortHash(deck.signature);
  return { key: `build:${hash}`, label: `${deck.championName ?? "Unknown Champion"} · Build ${hash} (Main + Material)`, format: "STANDARD", source: { kind: "custom", decklist: {
    main: deck.main.map(line => ({ card: line.name, quantity: line.quantity })),
    material: deck.material.map(line => ({ card: line.name, quantity: line.quantity })),
    sideboard: [],
  } } };
}

/** Validate browser-stored drafts before using them as deck sources. */
export function readBrowseComparison(value: unknown): BrowseComparisonDeck[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((deck): deck is BrowseComparisonDeck => {
    if (!deck || typeof deck.key !== "string" || typeof deck.label !== "string" || !deck.source || seen.has(deck.key)) return false;
    const source = deck.source;
    const valid = source.kind === "public" ? typeof source.slug === "string" && !!source.slug
      : source.kind === "sighting" ? Number.isSafeInteger(source.eventId) && source.eventId > 0 && Number.isSafeInteger(source.player) && source.player > 0
      : source.kind === "custom" && ["main", "material", "sideboard"].every(section => Array.isArray(source.decklist?.[section]) && source.decklist[section].every((line: { card?: unknown; quantity?: unknown }) => line && typeof line.card === "string" && typeof line.quantity === "number" && Number.isSafeInteger(line.quantity) && line.quantity > 0));
    if (valid) seen.add(deck.key);
    return Boolean(valid);
  });
}
