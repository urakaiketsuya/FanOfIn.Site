import assert from "node:assert/strict";
import test from "node:test";
import { buildSuggestedDeck } from "../src/features/deckbuilder/engine/buildSuggestedDeck";
import type { SuggestedBuild, SuggestedCard } from "../src/features/deckbuilder/useSuggestedBuild";
import { buildTournamentSuggestedDeck } from "../src/features/deckbuilder/useSuggestedBuild";

function card(cardName: string, quantity = 4, locked = false): SuggestedCard {
  return { cardName, quantity, locked, section: "main", adjustedLift: null, sample: null, optimizedFrom: null, quantityEvidence: { source: "matching population", sampleSize: 0 }, reason: "ranked" };
}

function build(name: string): SuggestedBuild {
  return {
    material: [], main: [card(name)], sideboard: [], suggestions: [], removalSuggestions: [], protectedRemovalSuggestions: [], protectedPackages: [], packageCatalog: [],
    hasQuantityOptimizations: false, rankingPopulationSize: 1, usedFallback: false, usedSpiritElementFallback: false, spiritElementFallbackSpirits: [], conditionalWinRate: null,
    baselineWinRate: null, matchingDeckCount: 1, unresolved: { main: 0, material: 0, sideboard: 0 }, loading: false,
  };
}

test("builder engine selects the requested evidence source", () => {
  const evidence = { tournament: build("Tournament"), balanced: build("Balanced"), community: build("Community"), simulator: build("Simulator"), collectionOwnedByName: new Map<string, number>() };
  assert.equal(buildSuggestedDeck({ format: "STANDARD", populationSource: "simulator", collectionMode: "all" }, evidence).main[0].cardName, "Simulator");
  assert.equal(buildSuggestedDeck({ format: "PANTHEON", populationSource: "tournament", collectionMode: "all" }, evidence).main[0].cardName, "Community");
});

test("owned-only policy caps automatic cards but preserves locked choices", () => {
  const tournament = build("Automatic");
  tournament.main.push(card("Locked", 4, true));
  const evidence = { tournament, balanced: tournament, community: tournament, simulator: tournament, collectionOwnedByName: new Map([["Automatic", 2]]) };
  const result = buildSuggestedDeck({ format: "STANDARD", populationSource: "tournament", collectionMode: "owned-only" }, evidence);
  assert.deepEqual(result.main.map(({ cardName, quantity }) => [cardName, quantity]), [["Automatic", 2], ["Locked", 4]]);
});

test("tournament recommendation engine is callable without React", () => {
  const result = buildTournamentSuggestedDeck([], null, new Map(), new Set(), false, new Map(), new Map());
  assert.equal(result.loading, false);
  assert.deepEqual(result.main, []);
  assert.deepEqual(result.unresolved, { main: 0, material: 0, sideboard: 0 });
});
