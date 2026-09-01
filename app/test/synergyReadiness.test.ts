import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeSynergyReadiness } from "../src/features/deckbuilder/synergyReadiness";

const card = (name: string, elements: string[], effect = ""): Card => ({
  name, elements, effect, types: [], subtypes: [],
} as Card);

test("Imbue readiness only counts shuffled Main-deck lines", () => {
  const payoff = card("Flame Payoff", ["FIRE"], "**Fire Imbue 2**");
  const mainEnabler = card("Fire Main", ["FIRE"]);
  const materialEnabler = card("Fire Material", ["FIRE"]);
  const cards = new Map([[payoff.name, payoff], [mainEnabler.name, mainEnabler], [materialEnabler.name, materialEnabler]]);

  // Callers pass Main lines only: Material cards remain available in the catalog for suggestions,
  // but are not in the shuffled deck and therefore cannot satisfy an Imbue reveal requirement.
  const [readiness] = computeSynergyReadiness([
    { name: payoff.name, quantity: 4, section: "main" },
    { name: mainEnabler.name, quantity: 4, section: "main" },
    { name: materialEnabler.name, quantity: 4, section: "material" },
  ], cards);

  assert.equal(readiness.enablerCopies, 4);
  assert.deepEqual(readiness.enablerCards, [{ name: mainEnabler.name, quantity: 4, section: "main" }]);
  assert.equal(readiness.deckSize, 60);
});
