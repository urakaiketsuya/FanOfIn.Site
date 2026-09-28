import type { Card } from "@gatcg/shared";

export const RARITY_LABELS: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
  5: "Ultra Rare",
  6: "Promotional Rare",
  7: "Collector Super Rare",
  8: "Collector Ultra Rare",
  9: "Collector Promo Rare",
};

export const rarityLabel = (value: string | number) => RARITY_LABELS[Number(value)] ?? `Rarity ${value}`;
export function rarityOptions(cards: Card[]) {
  return [...new Set(cards.flatMap(card => card.editions.map(edition => edition.rarity).filter(Number.isFinite)))].sort((a,b) => a-b).map(value => ({value: String(value), text: rarityLabel(value)}));
}
