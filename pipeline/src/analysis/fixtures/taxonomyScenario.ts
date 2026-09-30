import type { CardSignature } from "../../cards/catalog.js";
import type { OmnidexEventBundle } from "../../omnidex/cache.js";
import type { AnalysisContext } from "../context.js";
import type { DeckSighting } from "@gatcg/shared";

/** Synthetic populations exercise distinct builds, routes, an outlier and sideboards. */
export function taxonomyScenario() {
  const cardIndex = new Map<string, CardSignature>();
  for (const name of ["Anchor", "Route", "Spirit", "A", "B", "C", "D", "E", "F", "Outlier"]) cardIndex.set(name, {
    name, slug: name.toLowerCase(), classes: [], types: name === "Anchor" || name === "Route" ? ["CHAMPION"] : ["ACTION"],
    subtypes: name === "Spirit" ? ["SPIRIT"] : [], elements: ["WIND"], level: name === "Route" ? 3 : name === "Anchor" ? 1 : null, effect: null, editions: [],
  });
  const bundles = [1, 2].map(id => ({ id, event: { format: "STANDARD" }, decklists: Array.from({ length: 13 }, (_, index) => ({
    player: index + 1,
    decklist: {
      main: (index === 12 ? ["Outlier"] : index < 6 ? ["A", "B", "C"] : ["D", "E", "F"]).map(card => ({ card, quantity: 4 })),
      material: [{ card: index < 6 ? "Anchor" : "Route", quantity: 1 }, { card: "Spirit", quantity: 1 }],
      sideboard: [{ card: "Outlier", quantity: 4 }],
    },
  })) })) as unknown as OmnidexEventBundle[];
  const ctx = { cardIndex, getEventSignatures: (bundle: OmnidexEventBundle) => new Map(Array.from({ length: 13 }, (_, i) => [i + 1, { championName: "Synthetic Champion" }])) } as unknown as AnalysisContext;
  const sightings = bundles.flatMap(bundle => Array.from({ length: 13 }, (_, i) => ({ deckId: `${bundle.id}:${i + 1}`, eventId: bundle.id, player: i + 1, wins: 3, losses: 1, ties: 0, winRate: .75, topCut: i < 3, placement: i + 1 }))) as DeckSighting[];
  return { bundles, ctx, sightings, prices: new Map([['A', 1], ['B', 2], ['C', 3]]) };
}
