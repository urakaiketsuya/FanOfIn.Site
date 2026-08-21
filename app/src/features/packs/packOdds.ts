import type { Card, CardEdition } from "@gatcg/shared";

/**
 * Rarity IDs as returned by the Grand Archive API (`CardEdition.rarity`, confirmed live against
 * `GET /option/search`'s `rarity` option values) — there's no local label cache for these today
 * (CardDetail.tsx/DeckDetail.tsx fetch the display names live each session), so this is a small
 * hardcoded copy covering just the rarities a standard booster can contain. 6 (Promotional Rare)
 * and 9 (Collector Promo Rare) are deliberately omitted — those are promo-only prints, never sold
 * in boosters, and are excluded from every pool this module builds.
 */
export const RARITY_LABELS: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
  5: "Ultra Rare",
  7: "Collector Super Rare",
  8: "Collector Ultra Rare",
};

export const RARITY_COLOR: Record<number, string> = {
  1: "border-ctp-surface1",
  2: "border-ctp-green",
  3: "border-ctp-blue",
  4: "border-ctp-mauve",
  5: "border-ctp-yellow",
  7: "border-ctp-peach",
  8: "border-ctp-red",
};

export const PACK_SIZE = 12;
const COMMON_SLOTS = 7;
const UNCOMMON_SLOTS = 3;

/**
 * Grand Archive doesn't publish an official per-pack rarity table (gatcg.com's own Booster Boxes
 * article and product sheets point to "the product page for the associated set" for specifics,
 * and pack size itself varies 8-12 cards by set with no single documented structure). These are
 * the only verified anchors found, converted from their stated box-level rates (a box = 24
 * packs):
 *   - Ultra Rare: 1 guaranteed per box              -> 1/24 per pack
 *   - Collector Super Rare: ~1 in 30 boxes (one set) -> 1/(30*24) per pack
 *   - Collector Ultra Rare: ~1 in 15 boxes (1st Ed.) -> 1/(15*24) per pack
 *   - Foil: ~1 in 8 packs
 * The remaining probability in the "rare-or-better" slot splits between Rare and Super Rare
 * weighted by how many distinct cards THIS set actually has at each of those two rarities (a
 * real print-pool proxy, since there's no official R/SR split to anchor to). This is a
 * best-effort approximation, not verified official data — say so wherever it's shown.
 */
const UR_RATE = 1 / 24;
const CSR_RATE = 1 / (30 * 24);
const CUR_RATE = 1 / (15 * 24);
export const FOIL_RATE = 1 / 8;

export interface PackCard {
  card: Card;
  edition: CardEdition;
  rarity: number;
  isFoil: boolean;
}

type SetPools = Map<number, { card: Card; edition: CardEdition }[]>;

function poolsForSet(cards: Card[], setPrefix: string): SetPools {
  const pools: SetPools = new Map();
  for (const card of cards) {
    for (const edition of card.editions) {
      if (edition.set.prefix !== setPrefix) continue;
      if (edition.rarity === 6 || edition.rarity === 9) continue;
      const list = pools.get(edition.rarity);
      if (list) list.push({ card, edition });
      else pools.set(edition.rarity, [{ card, edition }]);
    }
  }
  return pools;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/** Rolls which rarity the "rare-or-better" (or foil) slot lands on. */
function rollRareTier(pools: SetPools): number {
  const roll = Math.random();
  if (roll < UR_RATE && (pools.get(5)?.length ?? 0) > 0) return 5;
  if (roll < UR_RATE + CSR_RATE && (pools.get(7)?.length ?? 0) > 0) return 7;
  if (roll < UR_RATE + CSR_RATE + CUR_RATE && (pools.get(8)?.length ?? 0) > 0) return 8;

  const rareCount = pools.get(3)?.length ?? 0;
  const srCount = pools.get(4)?.length ?? 0;
  if (rareCount + srCount === 0) return 3;
  return Math.random() * (rareCount + srCount) < rareCount ? 3 : 4;
}

/** Falls back through progressively more common rarities so a pack is never short a card just because a small set has no cards at the rolled rarity. */
function draw(pools: SetPools, targetRarity: number): { card: Card; edition: CardEdition; rarity: number } | undefined {
  const order = [targetRarity, 2, 1, 3, 4, 5, 7, 8];
  for (const rarity of order) {
    const picked = pickRandom(pools.get(rarity) ?? []);
    if (picked) return { ...picked, rarity };
  }
  return undefined;
}

/** Simulates opening one pack of `setPrefix` from the given card catalog — see the module doc comment for the (approximate, non-official) rarity model. Empty when the catalog has no cards for this set at all. */
export function simulatePackOpening(cards: Card[], setPrefix: string): PackCard[] {
  const pools = poolsForSet(cards, setPrefix);
  const result: PackCard[] = [];

  for (let i = 0; i < COMMON_SLOTS; i++) {
    const picked = draw(pools, 1);
    if (picked) result.push({ ...picked, isFoil: false });
  }
  for (let i = 0; i < UNCOMMON_SLOTS; i++) {
    const picked = draw(pools, 2);
    if (picked) result.push({ ...picked, isFoil: false });
  }

  const rarePick = draw(pools, rollRareTier(pools));
  if (rarePick) result.push({ ...rarePick, isFoil: false });

  const isFoilSlot = Math.random() < FOIL_RATE;
  const foilPick = draw(pools, isFoilSlot ? rollRareTier(pools) : 1);
  if (foilPick) result.push({ ...foilPick, isFoil: isFoilSlot });

  return result;
}
