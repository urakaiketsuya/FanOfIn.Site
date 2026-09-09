import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeDependencyReadiness, computeSynergyReadiness } from "../src/features/deckbuilder/synergyReadiness";

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

test("dependency readiness counts Material producers as guaranteed active support", () => {
  const producer = { ...card("Backup Charger", [], "(3), **Banish CARDNAME:** **Summon** a Powercell token rested."), types: ["REGALIA", "ITEM"] };
  const consumer = card("Turbo Charge", [], "Sacrifice a Powercell token: Draw a card.");
  const cards = new Map([[producer.name, producer], [consumer.name, consumer]]);
  const [readiness] = computeDependencyReadiness([
    { name: producer.name, quantity: 1, section: "material" },
    { name: consumer.name, quantity: 2, section: "main" },
  ], cards);

  assert.equal(readiness.producerCopies, 1);
  assert.equal(readiness.consumerCopies, 2);
  assert.equal(readiness.status, "Thin");
  assert.equal(readiness.producerCurve.find((point) => point.seen === 10)?.probability, 1);
  assert.equal(readiness.recommendations.includes(producer.name), false);
});
