/**
 * The CDN has both plain type icons (`item.png`, `weapon.png`, ...) and Regalia-compound icons
 * (`item-regalia.png`, `weapon-regalia.png`) matching how the physical card's type line reads
 * ("Regalia Item" vs. plain "Item") — verified live against cdn2.gatcg.com. "Regalia" is its own
 * entry in `card.types` (confirmed live: Apotheosis Rite's `types` is `["REGALIA", "ITEM"]`, not
 * a subtype), so the compound check looks at the card's other types, not its subtypes.
 */
export function typeIconKey(type: string, allTypes: string[]): string {
  const base = type.toLowerCase();
  if (allTypes.includes("REGALIA") && (base === "item" || base === "weapon")) return `${base}-regalia`;
  return base;
}
