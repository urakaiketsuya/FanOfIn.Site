import type { Card, OmnidexDecklist } from "@gatcg/shared";

export type LockedSection = "main" | "material" | "sideboard";

/** Packs locked cards into one URL-safe query param for sharing — `section:qty:name` entries joined
 * by `;`. Real card names haven't been seen using either separator, and a stray one just produces a
 * slightly malformed shared link rather than breaking anything, so no escaping beyond what
 * URLSearchParams already does for the param value as a whole. */
export function encodeLockedCards(lockedCards: Map<string, number>, lockedSections: Map<string, LockedSection>): string {
  return Array.from(lockedCards.entries())
    .map(([name, qty]) => `${lockedSections.get(name) ?? "main"}:${qty}:${name}`)
    .join(";");
}

export function decodeLockedCards(encoded: string): { lockedCards: Map<string, number>; lockedSections: Map<string, LockedSection> } {
  const lockedCards = new Map<string, number>();
  const lockedSections = new Map<string, LockedSection>();
  for (const entry of encoded.split(";")) {
    if (!entry) continue;
    const [section, qtyStr, ...nameParts] = entry.split(":");
    const name = nameParts.join(":");
    const qty = Number(qtyStr);
    if (!name || !Number.isFinite(qty) || qty < 1) continue;
    lockedCards.set(name, qty);
    if (section === "main" || section === "material" || section === "sideboard") lockedSections.set(name, section);
  }
  return { lockedCards, lockedSections };
}

/** Just the path + query (`/deck-builder?...`) — for an in-app `<Link>`, which needs a relative
 * path, not an absolute URL. */
export function buildDeckBuilderPath(
  championName: string,
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  lockedSections: Map<string, LockedSection>,
  options?: { mode?: "improve"; sourceDeckId?: string },
): string {
  const params = new URLSearchParams();
  params.set("champion", championName);
  if (spiritFilter) params.set("spirit", spiritFilter);
  const locked = encodeLockedCards(lockedCards, lockedSections);
  if (locked) params.set("locked", locked);
  if (options?.mode === "improve") {
    params.set("tab", "review");
    if (options.sourceDeckId) params.set("improveDeck", options.sourceDeckId);
  }
  return `/deck-builder?${params.toString()}`;
}

/** Absolute URL (with origin) — for copying to the clipboard as a shareable link. */
export function buildDeckBuilderUrl(
  championName: string,
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  lockedSections: Map<string, LockedSection>,
): string {
  return `${window.location.origin}${buildDeckBuilderPath(championName, spiritFilter, lockedCards, lockedSections)}`;
}

export interface DeckBuilderParams {
  championName: string;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
}

/** Derives Champion/Spirit/locked-cards from an already-resolved decklist — same detection rules
 * the Guided Deck Builder's paste-import uses (material CHAMPION-type card for Champion,
 * CHAMPION+SPIRIT for Spirit), just applied to a structured decklist instead of raw pasted text.
 * Null when no Champion card is found (the decklist can't seed a build). */
export function deckBuilderParamsFromDecklist(decklist: OmnidexDecklist, cardsByName: Map<string, Card>): DeckBuilderParams | null {
  let championName: string | null = null;
  let spiritFilter: string | null = null;
  const lockedCards = new Map<string, number>();
  const lockedSections = new Map<string, LockedSection>();

  for (const section of ["main", "material", "sideboard"] as const) {
    for (const line of decklist[section]) {
      const card = cardsByName.get(line.card);
      if (card?.types.includes("CHAMPION")) {
        if (card.subtypes.includes("SPIRIT")) {
          spiritFilter = line.card;
          continue;
        }
        if (!championName) championName = card.name.split(",")[0].trim();
      }
      lockedCards.set(line.card, (lockedCards.get(line.card) ?? 0) + line.quantity);
      lockedSections.set(line.card, section);
    }
  }

  if (!championName) return null;
  return { championName, spiritFilter, lockedCards, lockedSections };
}
