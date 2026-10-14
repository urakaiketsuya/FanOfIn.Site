import type { Card } from "./api-types.js";
import { isForeseTarget } from "./foreseForecast.js";

/** Resolve the first Forese search and its deployed ally's song search.
 * Revealed misses leave the top of the deck before an On Enter search begins.
 * Memory is unknown. Curator chooses the more common remaining song subtype,
 * with Melody winning ties. Found songs are assumed payable, as in the parent
 * card-access estimate; this does not grant another wake to Forese. */
export function resolveForeseEntryChain(
  remaining: string[], cards: Map<string, Card>, level: number,
  occupiedUnique: Set<string>, random: () => number,
): { ally?: string; song?: string } {
  const deck = [...remaining];
  const search = (limit: number, eligible: (card: Card) => boolean, revealAll = false) => {
    const misses: string[] = [];
    let hit: string | undefined;
    for (let i = 0; i < limit && deck.length; i++) {
      const name = deck.shift()!;
      const card = cards.get(name);
      if (!hit && card && eligible(card)) {
        hit = name;
        if (!revealAll) break;
      } else misses.push(name);
    }
    // Scavenge randomizes the revealed misses on the bottom. Singer permits
    // any order; seeded ordering is sufficient because no later search follows.
    for (let i = misses.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [misses[i], misses[j]] = [misses[j], misses[i]];
    }
    deck.push(...misses);
    return hit;
  };
  const ally = search(5, card => isForeseTarget(card) && !(card.types.includes("UNIQUE") && occupiedUnique.has(card.name)));
  if (ally === "Musical Curator") {
    const count = (subtype: string) => deck.filter(name => cards.get(name)?.subtypes.includes(subtype)).length;
    const subtype = count("HARMONY") > count("MELODY") ? "HARMONY" : "MELODY";
    return { ally, song: search(12, card => card.subtypes.includes(subtype)) };
  }
  if (ally === "Tribute Singer" && level >= 1) {
    return { ally, song: search(5, card => card.subtypes.some(s => s === "HARMONY" || s === "MELODY") && card.elements.length > 0 && card.elements.every(e => ["NORM", "FIRE", "WATER", "WIND"].includes(e)), true) };
  }
  return { ally };
}
