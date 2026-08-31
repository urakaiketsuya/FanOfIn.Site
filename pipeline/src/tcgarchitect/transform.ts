import type { DeckLine, TcgArchitectDeck } from "@gatcg/shared";
import type { TcgArchitectApiCard, TcgArchitectApiDeck } from "./client.js";
import { BASE_URL } from "./client.js";

const DECK_TYPE_TO_ZONE: Record<string, "materialDeck" | "mainDeck" | "sideDeck" | "pantheonDeck"> = {
  material: "materialDeck",
  main: "mainDeck",
  sideboard: "sideDeck",
  // Pantheon format's Boon zone — same concept as ShoutAtYourDecks' pantheonDeck (see shared types doc comment).
  boons: "pantheonDeck",
  // `maybeboard` (a wishlist zone, not committed deck content) is deliberately not mapped —
  // dropped below, same as any future unrecognized deck_type.
};

/**
 * The deck's starting champion: the Material zone's CHAMPION-type card at level 1+ (the other
 * CHAMPION-type material card, the level-0 "Spirit of <element>", is the deck's spirit/element
 * marker, not its champion — confirmed against real decks: every Material zone carries exactly
 * one of each). Null for the rare deck with no resolvable champion card.
 */
function deriveChampion(cards: TcgArchitectApiCard[]): string | null {
  const champion = cards.find((c) => c.pivot.deck_type === "material" && c.types.includes("CHAMPION") && c.level !== null && c.level > 0);
  return champion?.name ?? null;
}

function mapFormat(rawFormat: string): { format: "STANDARD" | "PANTHEON" | "UNKNOWN"; formatConfidence: "declared" | "unknown" } {
  if (rawFormat === "standard") return { format: "STANDARD", formatConfidence: "declared" };
  if (rawFormat === "pantheon") return { format: "PANTHEON", formatConfidence: "declared" };
  return { format: "UNKNOWN", formatConfidence: "unknown" };
}

export function transformTcgArchitectDeck(apiDeck: TcgArchitectApiDeck, fetchedAt: string): TcgArchitectDeck {
  const zones: Record<"materialDeck" | "mainDeck" | "sideDeck" | "pantheonDeck", DeckLine[]> = {
    materialDeck: [],
    mainDeck: [],
    sideDeck: [],
    pantheonDeck: [],
  };

  for (const card of apiDeck.cards) {
    const zoneKey = DECK_TYPE_TO_ZONE[card.pivot.deck_type];
    if (!zoneKey) continue; // maybeboard or an unrecognized future deck_type — not deck identity, see README
    zones[zoneKey].push({ name: card.name, quantity: card.pivot.quantity });
  }

  const { format, formatConfidence } = mapFormat(apiDeck.format);
  const sumQty = (lines: DeckLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

  return {
    id: apiDeck.id,
    url: `${BASE_URL}/grand-archive/decks/${apiDeck.id}`,
    title: apiDeck.name,
    author: apiDeck.user.username,
    champion: deriveChampion(apiDeck.cards),
    priceLow: null,
    materialCount: sumQty(zones.materialDeck),
    mainCount: sumQty(zones.mainDeck),
    sideCount: sumQty(zones.sideDeck),
    fetchedAt,
    format,
    formatConfidence,
    likeCount: apiDeck.like_count,
    createdAt: apiDeck.created_at,
    updatedAt: apiDeck.updated_at,
    materialDeck: zones.materialDeck,
    mainDeck: zones.mainDeck,
    sideDeck: zones.sideDeck,
    ...(zones.pantheonDeck.length > 0 ? { pantheonDeck: zones.pantheonDeck } : {}),
  };
}
