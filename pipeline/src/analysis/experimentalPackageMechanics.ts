import { decodeCardLines, type DeckCardIndexData } from "@gatcg/shared";

export interface MechanicsCard {
  name: string; types?: string[]; subtypes?: string[]; elements?: string[];
  effect?: string | null; cost_reserve?: number | null;
}
export interface MechanicsNomination {
  cards: [string, string]; source: "mechanics-experiment-v1";
  interaction: string; reason: string; constraints: string[];
  evidence: { name: string; text: string }[];
}
const text = (c: MechanicsCard) => (c.effect ?? "").replace(/\*/g, "").toLowerCase();
const ally = (c: MechanicsCard) => c.types?.includes("ALLY");
const suited = (c: MechanicsCard) => c.subtypes?.includes("SUITED");
const raccoon = (c: MechanicsCard) => c.subtypes?.includes("RACCOON") && ally(c);
/** A conservative scope filter, not a complete deck-legality check. Unknown elements fail closed. */
export function compatibleElements(a: MechanicsCard, b: MechanicsCard): boolean {
  if (!a.elements?.length || !b.elements?.length) return false;
  const elements = new Set([...a.elements, ...b.elements].filter(e => e !== "NORM"));
  return elements.size <= 1;
}

/** Experimental nominations only. Never consumed by approval, verification or recommendations. */
export function nominateMechanics(cards: MechanicsCard[]): MechanicsNomination[] {
  const result: MechanicsNomination[] = [];
  for (const a of cards) for (const b of cards) {
    if (a.name === b.name || !compatibleElements(a, b)) continue;
    const at = text(a), bt = text(b);
    const add = (interaction: string, reason: string, constraints: string[]) => result.push({
      cards: [a.name, b.name], source: "mechanics-experiment-v1", interaction, reason, constraints,
      evidence: [a, b].map(c => ({ name: c.name, text: c.effect ?? "" })),
    });
    if (at.includes("whenever you activate a cardistry ability of an ally") && ally(b) && /cardistry\s*—/.test(bt)) {
      add("cardistry-trigger", "The ally's Cardistry activation triggers the supporting card.", ["Both objects must be in play; the Cardistry cost must be payable."]);
    }
    if (at.includes("put a fire or norm element suited ally card with reserve cost 3 or less from your memory onto the field") &&
        ally(b) && suited(b) && b.elements?.every(e => e === "FIRE" || e === "NORM") &&
        typeof b.cost_reserve === "number" && b.cost_reserve >= 0 && b.cost_reserve <= 3) {
      add("memory-to-field", "The ally meets the printed element, type and cost restrictions of the memory-to-field effect.", ["Target must be in memory when the effect resolves.", "Cardistry activation still requires payment."]);
    }
    if (/suited spell source.*(?:deal damage|take damage)/.test(at) && at.includes("plus 3") &&
        suited(b) && b.subtypes?.includes("SPELL") && /\bdeal (?:\d+|x) damage to target/.test(bt)) {
      add("suited-damage", "The Suited Spell directly deals damage that the supporting effect can increase.", ["The damage modifier must be active and its target/timing restrictions satisfied."]);
    }
    if (raccoon(b) && bt.includes("as long as an opponent has no cards in their graveyard") &&
        (/banish up to two target cards from a single graveyard/.test(at) || at.includes("target opponent banishes a card from their graveyard") ||
         (raccoon(a) && at.includes('raccoon allies you control have "[rest]: banish target card in a graveyard')))) {
      add("graveyard-enable-payoff", "Graveyard removal can enable the Raccoon's empty-opponent-graveyard payoff.", ["Removal must empty an opponent's graveyard; one activation may be insufficient.", "Rest abilities require an available ally."]);
    }
  }
  return result.sort((a, b) => a.cards.join("|").localeCompare(b.cards.join("|")) || a.interaction.localeCompare(b.interaction));
}

export function measureMechanics(nominations: MechanicsNomination[], index: DeckCardIndexData) {
  // Collapse duplicate deck IDs and sum main/material copies; sideboard is intentionally ignored.
  const decks = [...new Map(index.decks.map(d => [d.deckId, d])).values()].map(d => {
    const counts = new Map<string, number>();
    for (const line of decodeCardLines([...d.main, ...d.material], index.cardNames)) {
      if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
    }
    return { id: d.deckId, counts };
  });
  return nominations.map(n => {
    const [a, b] = n.cards;
    const aDecks = decks.filter(d => d.counts.has(a)).length;
    const bDecks = decks.filter(d => d.counts.has(b)).length;
    const both = decks.filter(d => d.counts.has(a) && d.counts.has(b));
    const quantities: Record<string, number> = {};
    for (const d of both) {
      const key = `${d.counts.get(a)}+${d.counts.get(b)}`;
      quantities[key] = (quantities[key] ?? 0) + 1;
    }
    return { ...n, usage: { totalDecks: decks.length, anchorDecks: aDecks, memberDecks: bDecks,
      togetherDecks: both.length, events: new Set(both.map(d => d.id.split(":")[0])).size,
      anchorInclusion: aDecks ? both.length / aDecks : null,
      memberInclusion: bDecks ? both.length / bDecks : null, quantities } };
  }).sort((a, b) => b.usage.togetherDecks - a.usage.togetherDecks || a.cards.join("|").localeCompare(b.cards.join("|")));
}
