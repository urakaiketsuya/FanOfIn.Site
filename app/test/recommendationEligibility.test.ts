import assert from "node:assert/strict";
import test from "node:test";
import { availableDeckElements, isAvailableDeckRecommendation, type Card } from "@gatcg/shared";
import { buildCardCategoryRecommendations } from "../src/features/deckbuilder/cardCategoryRecommendations";

function card(name: string, elements: string[], types = ["ACTION"], subtypes = ["SPELL"]): Card {
  return { name, elements, types, subtypes, legality: { STANDARD: { limit: 4 } } } as Card;
}
const waterSpirit = card("Spirit of Water", ["WATER"], ["CHAMPION"], ["SPIRIT"]);
const cruxChampion = card("Lorraine, Spirit Ruler", ["CRUX"], ["CHAMPION"]);
const neutral = card("Neutral", ["NORM"]);
const water = card("Water", ["WATER"]);
const fire = card("Fire", ["FIRE"]);

test("a selected Spirit enables its element before any main cards are added", () => {
  const elements = availableDeckElements([waterSpirit]);
  assert.equal(isAvailableDeckRecommendation(water, elements), true);
  assert.equal(isAvailableDeckRecommendation(fire, elements), false);
  assert.equal(isAvailableDeckRecommendation(neutral, elements), true);
});

test("unknown identity and unresolved candidates fail closed for colored suggestions", () => {
  const elements = availableDeckElements([undefined]);
  assert.equal(isAvailableDeckRecommendation(water, elements), false);
  assert.equal(isAvailableDeckRecommendation(undefined, elements), false);
  assert.equal(isAvailableDeckRecommendation(neutral, elements), true);
});

test("off-element non-Champion cards do not grant their printed elements", () => {
  const elements = availableDeckElements([waterSpirit, fire]);
  assert.equal(elements.has("FIRE"), false);
});

test("advanced access comes from the selected lineage and disappears when it is removed", () => {
  const exaltedWater = card("Exalted water", ["EXALTED", "WATER"]);
  const exaltedNormal = card("Royal Oathguard", ["EXALTED", "NORM"]);
  const full = availableDeckElements([waterSpirit, cruxChampion]);
  assert.equal(isAvailableDeckRecommendation(exaltedWater, full), true);
  assert.equal(isAvailableDeckRecommendation(exaltedNormal, availableDeckElements([waterSpirit])), false);
  assert.equal(isAvailableDeckRecommendation(exaltedWater, availableDeckElements([cruxChampion])), false);
  assert.equal(isAvailableDeckRecommendation(card("Crux", ["CRUX"]), availableDeckElements([waterSpirit])), false);
});

test("named Spirits and other identity replacements are excluded, not ordinary Spirit-subtype allies", () => {
  const elements = availableDeckElements([waterSpirit, cruxChampion]);
  assert.equal(isAvailableDeckRecommendation(card("Miao, Spirit of Water", ["WATER"], ["CHAMPION"], ["SPIRIT"]), elements), false);
  assert.equal(isAvailableDeckRecommendation(cruxChampion, elements), false);
  assert.equal(isAvailableDeckRecommendation(card("Ghosts of Pendragon", ["CRUX"], ["ALLY"], ["SPIRIT"]), elements), true);
});

test("workbench ranking cannot recommend off-element cards even with strong adoption evidence", () => {
  const spirit = card("Miao, Spirit of Water", ["WATER"], ["CHAMPION"], ["SPIRIT"]);
  const result = buildCardCategoryRecommendations({
    catalog: [fire, water, neutral, spirit], rows: [],
    communityRateByName: new Map([[fire.name, 1], [water.name, 0.3], [neutral.name, 0.1], [spirit.name, 1]]),
    identityElements: availableDeckElements([waterSpirit]), format: "STANDARD", source: "community",
  });
  assert.deepEqual(result.map((entry) => entry.card.name), [water.name, neutral.name]);
});
