import type { DeckLine, SleevedDeck } from "@gatcg/shared";
import { SLEEVED_AUTHOR_PLACEHOLDER } from "@gatcg/shared";
import type { CardSignature } from "../cards/catalog.js";
import type { SleevedApiDeck } from "./client.js";

/** Known Grand Archive zoneIds, confirmed live (2026-08-27) against real public decks. Anything else
 * (there's currently just `extra` — e.g. a champion-specific Regalia/Item like "Powercell") is
 * bucketed into `extraDeck` rather than dropped, so a zoneId Sleeved adds later doesn't silently
 * lose cards. */
type KnownZone = "main" | "material" | "sideboard";

/** A DeckLine plus the slug it was resolved from, for findChampionName's slug-keyed lookup. */
interface ResolvedDeckLine extends DeckLine {
  slug: string;
}

/**
 * Same "highest-level Champion printing, ties broken by copy count" rule as
 * `pipeline/src/analysis/decklists.ts`'s `findChampionName` — reimplemented standalone rather than
 * imported, deliberately keeping this source fully decoupled from the Omnidex-derived analysis
 * module, same precedent as `shoutatyourdecks/analytics/archetypeClustering.ts`'s `canonicalSignature`.
 * Verified live against real Sleeved decks: e.g. "Static Lorraine"'s material zone contains three
 * Champion printings (a level-1 and two level-2s) and correctly resolves to "Lorraine".
 */
function findChampionName(materialLines: ResolvedDeckLine[], slugIndex: Map<string, CardSignature>): string | null {
  const byName = new Map<string, { maxLevel: number; copies: number }>();

  for (const line of materialLines) {
    const card = slugIndex.get(line.slug);
    if (!card || !card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) continue;
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

/** Pantheon = singleton 60+ card main+material identity, else Standard — same inferred-only
 * heuristic `shoutatyourdecks/format.ts`'s `classifyDeckFormat` uses for its fallback branch, since
 * Sleeved (confirmed live) gives no declared-format field at all, unlike ShoutAtYourDecks. */
function classifySleevedFormat(mainDeck: DeckLine[], materialDeck: DeckLine[]): "STANDARD" | "PANTHEON" {
  const identity = [...mainDeck, ...materialDeck];
  const mainCount = mainDeck.reduce((sum, l) => sum + l.quantity, 0);
  if (mainCount >= 60 && identity.length > 0 && identity.every((line) => line.quantity === 1)) return "PANTHEON";
  return "STANDARD";
}

export interface TransformResult {
  deck: SleevedDeck;
  /** cardIds the slug index couldn't resolve — tracked for visibility, same "resolved" flag spirit
   * used elsewhere, not silently dropped. Each still ends up in its zone under its raw slug as `name`. */
  unresolvedCardIds: string[];
}

/**
 * Resolves an API deck's `{cardId, quantity, zoneId}` entries (cardId is Sleeved's card *slug*,
 * e.g. "spirit-of-fire" — confirmed live, NOT the `cardNumber`/set-collector-number join key used
 * elsewhere in this codebase) into our `DeckLine{name, quantity}` shape via `slugIndex`, buckets by
 * zone, and derives champion + format the same way the rest of this codebase does (Sleeved supplies
 * neither field).
 */
export function transformSleevedDeck(api: SleevedApiDeck, slugIndex: Map<string, CardSignature>, fetchedAt: string): TransformResult {
  const zones: Record<KnownZone, ResolvedDeckLine[]> = { main: [], material: [], sideboard: [] };
  const extra: DeckLine[] = [];
  const unresolvedCardIds: string[] = [];

  for (const line of api.cards) {
    const card = slugIndex.get(line.cardId);
    if (!card) unresolvedCardIds.push(line.cardId);
    const resolved: ResolvedDeckLine = { slug: line.cardId, name: card?.name ?? line.cardId, quantity: line.quantity };
    const zone = line.zoneId as KnownZone;
    if (zone === "main" || zone === "material" || zone === "sideboard") zones[zone].push(resolved);
    else extra.push({ name: resolved.name, quantity: resolved.quantity });
  }

  const champion = findChampionName(zones.material, slugIndex);
  const format = classifySleevedFormat(zones.main, zones.material);
  const strip = ({ slug: _slug, ...rest }: ResolvedDeckLine): DeckLine => rest;

  const deck: SleevedDeck = {
    id: api.id,
    url: `https://sleeved.gg/decks/${api.id}`,
    title: api.name || "Untitled Deck",
    author: SLEEVED_AUTHOR_PLACEHOLDER,
    champion,
    priceLow: null,
    materialCount: zones.material.reduce((sum, l) => sum + l.quantity, 0),
    mainCount: zones.main.reduce((sum, l) => sum + l.quantity, 0),
    sideCount: zones.sideboard.reduce((sum, l) => sum + l.quantity, 0),
    fetchedAt,
    format,
    formatConfidence: "inferred",
    materialDeck: zones.material.map(strip),
    mainDeck: zones.main.map(strip),
    sideDeck: zones.sideboard.map(strip),
    extraDeck: extra,
  };

  return { deck, unresolvedCardIds };
}
