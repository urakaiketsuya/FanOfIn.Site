import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { computeDeckWinConditions } from "../src/lib/deckWinConditions";
import type { DeckCardPresenceIndex } from "../src/features/cards/useDeckCardPresenceIndex";

// Named-rules-text seeds only match candidate names of 7+ characters (same floor
// namedRulesTextSeeds itself uses to avoid false positives on short common words) — every card
// name below is deliberately long enough to clear that.
function card(name: string, opts: { effect?: string | null; subtypes?: string[]; types?: string[] } = {}): Card {
  return {
    uuid: name, name, slug: name, classes: [], types: opts.types ?? [], subtypes: opts.subtypes ?? [], elements: [], element: "",
    cost: { type: "none", value: null }, cost_memory: null, cost_reserve: null, power: null, speed: null, life: null, level: null,
    durability: null, effect: opts.effect ?? null, effect_html: null, effect_raw: null, flavor: null, references: [], referenced_by: [],
    legality: null, last_update: "", editions: [],
  };
}

/** Builds a presence index over the given `decks` (each a list of card names) — mirrors
 * `useDeckCardPresenceIndex`'s real shape without needing a published dataset. */
function presenceIndex(cardNames: string[], decks: string[][]): DeckCardPresenceIndex {
  const nameToIndex = new Map(cardNames.map((name, i) => [name, i]));
  const presence = new Map<number, Set<number>>();
  decks.forEach((deck, deckIndex) => {
    for (const name of deck) {
      const nameIndex = nameToIndex.get(name);
      if (nameIndex === undefined) continue;
      const bucket = presence.get(nameIndex) ?? new Set<number>();
      bucket.add(deckIndex);
      presence.set(nameIndex, bucket);
    }
  });
  return {
    data: { generatedAt: "", cardNames, decks: decks.map((_, i) => ({ deckId: `d${i}`, main: [], material: [], sideboard: [] })) },
    nameToIndex,
    presenceIndex: presence,
  };
}

test("a text-detected pair with real cross-deck overlap gets a non-textOnly tier with numeric confidence/lift", () => {
  const cardsByName = new Map([
    ["Combo Engine", card("Combo Engine", { effect: "Search for a Combo Payoff card." })],
    ["Combo Payoff", card("Combo Payoff")],
  ]);
  // Combo Engine is in all 20 decks; Combo Payoff is in 15 of them (0-14) — clears the "strong" tier (>=12 matches).
  const decks = Array.from({ length: 20 }, (_, i) => (i < 15 ? ["Combo Engine", "Combo Payoff"] : ["Combo Engine"]));
  const presence = presenceIndex(["Combo Engine", "Combo Payoff"], decks);
  const [interaction] = computeDeckWinConditions(["Combo Engine", "Combo Payoff"], cardsByName, presence);
  assert.equal(interaction.confidenceTier, "strong");
  assert.equal(interaction.matchingDecks, 15);
  assert.ok(interaction.confidence !== null && interaction.confidence > 0);
  assert.ok(interaction.lift !== null);
});

test("a text-detected pair with zero real co-occurrence falls back to textOnly with null confidence/lift", () => {
  const cardsByName = new Map([
    ["Combo Engine", card("Combo Engine", { effect: "Search for a Combo Payoff card." })],
    ["Combo Payoff", card("Combo Payoff")],
  ]);
  // Neither card has ever been published together — Combo Engine's decks never include Combo Payoff.
  const presence = presenceIndex(["Combo Engine", "Combo Payoff"], [["Combo Engine"], ["Combo Payoff"]]);
  const [interaction] = computeDeckWinConditions(["Combo Engine", "Combo Payoff"], cardsByName, presence);
  assert.equal(interaction.confidenceTier, "textOnly");
  assert.equal(interaction.confidence, null);
  assert.equal(interaction.lift, null);
});

test("rules text mentioning a card outside this deck's list never nominates that card, since seed nomination is scoped to the deck's own cards", () => {
  const cardsByName = new Map([
    ["Combo Engine", card("Combo Engine", { effect: "Search for a Combo Payoff card or an Absent Relic card." })],
    ["Combo Payoff", card("Combo Payoff")],
    // "Absent Relic" is mentioned in Combo Engine's rules text but never added to this deck's card list.
  ]);
  const presence = presenceIndex(["Combo Engine", "Combo Payoff"], [["Combo Engine", "Combo Payoff"]]);
  const interactions = computeDeckWinConditions(["Combo Engine", "Combo Payoff"], cardsByName, presence);
  assert.ok(interactions.length > 0);
  assert.ok(interactions.every((i) => !i.memberCards.includes("Absent Relic") && i.anchorCard !== "Absent Relic"));
});

test("returns a textOnly entry for every candidate when the presence index hasn't loaded yet", () => {
  const cardsByName = new Map([
    ["Combo Engine", card("Combo Engine", { effect: "Search for a Combo Payoff card." })],
    ["Combo Payoff", card("Combo Payoff")],
  ]);
  const interactions = computeDeckWinConditions(["Combo Engine", "Combo Payoff"], cardsByName, undefined);
  assert.equal(interactions.length, 1);
  assert.equal(interactions[0].confidenceTier, "textOnly");
});

test("an empty deck (no resolvable cards) produces no interactions", () => {
  assert.deepEqual(computeDeckWinConditions(["Unknown Card"], new Map(), undefined), []);
});
