import type { Card, CardEdition } from "../../shared/src/api-types.js";
import type { OmnidexDecklistCardLine } from "../../shared/src/omnidex-types.js";
import type { PublicDeck } from "../../shared/src/saved-deck-types.js";
import { readBytes } from "./http-response.js";

const IMAGE_PATH = /^\/cards\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;
const CARD_API = "https://api.gatcg.com";
const SECTIONS = ["main", "material", "sideboard"] as const;
const LOOKUP_CONCURRENCY = 6;

export interface TtsDeckCard {
  name: string;
  quantity: number;
  /** Catalog-owned image URL. Null when the card is not in the catalog. */
  imageUrl: string | null;
  /** Back face of a flip card. Null for single-faced cards. */
  backImageUrl: string | null;
  cardId: string | null;
}
export interface TtsDeck {
  title: string;
  author: string;
  championName: string | null;
  format: string;
  publicSlug: string;
  main: TtsDeckCard[];
  material: TtsDeckCard[];
  sideboard: TtsDeckCard[];
}

type Face = { image: string; back: string | null };
type Resolved = { cardId: string; fallback: Face; editions: Map<string, Face> };

const safeImage = (path: string | undefined): string | null => (path && IMAGE_PATH.test(path) ? path : null);
/** The first alternate face with a catalog-owned image. Only flip editions carry one. */
const backFace = (edition: CardEdition): string | null =>
  safeImage(edition.other_orientations?.find(face => safeImage(face.edition?.image))?.edition.image);

/** Exact name match only. A fuzzy search hit must never replace the requested card. */
export function resolveCard(name: string, cards: Card[]): Resolved | undefined {
  const card = cards.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (!card) return undefined;
  const editions = new Map<string, Face>();
  for (const edition of card.editions) {
    const image = safeImage(edition.image);
    if (edition.uuid && image) editions.set(edition.uuid, { image, back: backFace(edition) });
  }
  // The API marks the default printing; a few cards do not list it first.
  const marked = card.editions.find(edition => (edition as { is_default?: boolean }).is_default) ?? card.editions[0];
  const fallback = marked ? editions.get(marked.uuid) : undefined;
  if (!fallback) return undefined;
  return { cardId: card.uuid, fallback, editions };
}

async function lookup(name: string, fetcher: typeof fetch): Promise<Resolved | undefined> {
  try {
    const params = new URLSearchParams({ name, page_size: "50" });
    const result = await fetcher(`${CARD_API}/cards/search?${params}`, { redirect: "error", signal: AbortSignal.timeout(5000) });
    const body = JSON.parse((await readBytes(result, 3_000_000)).toString()) as { data?: Card[] };
    return resolveCard(name, body.data ?? []);
  } catch { return undefined; }
}

function expand(lines: OmnidexDecklistCardLine[] | undefined, resolved: Map<string, Resolved | undefined>): TtsDeckCard[] {
  const result: TtsDeckCard[] = [];
  const url = (path: string | null) => (path ? CARD_API + path : null);
  for (const line of lines ?? []) {
    if (line.quantity <= 0) continue;
    const card = resolved.get(line.card);
    // Chosen printings become separate rows so each copy keeps its art.
    let remaining = line.quantity;
    for (const printing of line.printings ?? []) {
      const face = card?.editions.get(printing.editionUuid);
      if (!face || printing.quantity <= 0) continue;
      const quantity = Math.min(printing.quantity, remaining);
      if (quantity <= 0) break;
      result.push({ name: line.card, quantity, imageUrl: url(face.image), backImageUrl: url(face.back), cardId: card!.cardId });
      remaining -= quantity;
    }
    if (remaining > 0) result.push({
      name: line.card, quantity: remaining, imageUrl: url(card?.fallback.image ?? null),
      backImageUrl: url(card?.fallback.back ?? null), cardId: card?.cardId ?? null,
    });
  }
  return result;
}

/** Resolves each unique card once, with bounded parallel requests. */
export async function buildTtsDeck(deck: PublicDeck, fetcher: typeof fetch = fetch): Promise<TtsDeck> {
  const names = [...new Set(SECTIONS.flatMap(section => (deck.decklist[section] ?? []).filter(line => line.quantity > 0).map(line => line.card)))];
  const resolved = new Map<string, Resolved | undefined>();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(LOOKUP_CONCURRENCY, names.length) }, async () => {
    while (next < names.length) {
      const name = names[next++]!;
      resolved.set(name, await lookup(name, fetcher));
    }
  }));
  return {
    title: deck.title,
    author: deck.owner.displayName,
    championName: deck.championName,
    format: deck.format,
    publicSlug: deck.publicSlug,
    main: expand(deck.decklist.main, resolved),
    material: expand(deck.decklist.material, resolved),
    sideboard: expand(deck.decklist.sideboard, resolved),
  };
}
