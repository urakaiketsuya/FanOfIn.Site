import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardLegalityStatus, deckCardIssues, newlyAddedBannedCards, type Card, type OmnidexDecklist } from "@gatcg/shared";
import { validateDeck } from "../src/features/deckbuilder/validateDeck.ts";
const card = { name: "Restricted card", types: ["ALLY"], subtypes: [], elements: ["NORM"], legality: { STANDARD: { limit: 0 }, PANTHEON: { limit: 1 } } } as unknown as Card;
const catalog = new Map([[card.name, card]]);
const empty = (): OmnidexDecklist => ({ main: [], material: [], sideboard: [] });
test("bans are format specific and include every active section, not maybeboard", () => {
  const deck = { main: [{ card: card.name, quantity: 2 }], material: [], sideboard: [{ card: card.name, quantity: 1 }], maybeboard: [{ card: card.name, quantity: 4 }] };
  const issues = deckCardIssues(deck, catalog, "STANDARD");
  assert.deepEqual(issues.map(issue => [issue.code, issue.section, issue.quantity]), [["banned", "main", 2], ["banned", "sideboard", 1]]);
  assert.deepEqual(deckCardIssues(deck, catalog, "PANTHEON"), []);
  assert.equal(cardLegalityStatus(card, "UNKNOWN"), "unverified");
  assert.equal(cardLegalityStatus(undefined, "STANDARD"), "unverified");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "STANDARD"), "allowed");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "PANTHEON"), "allowed");
  assert.equal(cardLegalityStatus({ ...card, legality: null }, "UNKNOWN"), "unverified");
  assert.equal(cardLegalityStatus({ ...card, legality: {} }, "STANDARD"), "unverified");
});
test("null legality records do not produce deck warnings", () => {
  const unrestricted = { ...card, legality: null };
  const deck = { main: [{ card: card.name, quantity: 4 }], material: [], sideboard: [] };
  assert.deepEqual(deckCardIssues(deck, new Map([[card.name, unrestricted]]), "STANDARD"), []);
});
test("warnings fire for additions but not section moves, removals or unchanged loads", () => {
  const deck = { ...empty(), main: [{ card: card.name, quantity: 2 }] };
  assert.deepEqual(newlyAddedBannedCards(empty(), deck, catalog, "STANDARD"), [card.name]);
  assert.deepEqual(newlyAddedBannedCards(deck, deck, catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(deck, { ...empty(), sideboard: deck.main }, catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(deck, empty(), catalog, "STANDARD"), []);
  assert.deepEqual(newlyAddedBannedCards(empty(), deck, catalog, "PANTHEON"), []);
});
test("validator exposes structured bans and does not certify unknown formats", () => {
  const input = { main: [{ cardName: card.name, quantity: 1 }], material: [], sideboard: [] };
  const result = validateDeck(input, catalog, new Set(), "STANDARD");
  assert.equal(result.status, "Illegal");
  assert.equal(result.cardIssues[0].code, "banned");
  assert.ok(result.reasons.some(reason => reason.includes("banned in Standard")));
  assert.equal(validateDeck(input, catalog, new Set(), "UNKNOWN").cardIssues[0].code, "unverified");
});

test("Guo Jia accepts every catalog Fatestone regalia in Material across Spirit elements", () => {
  const cards: Card[] = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards;
  const byName = new Map(cards.map(card => [card.name, card]));
  const fatestones = cards.filter(card => card.types.includes("REGALIA") && card.subtypes.includes("FATESTONE"));
  assert.ok(fatestones.some(card => card.name === "Fabled Emerald Fatestone"));
  assert.ok(fatestones.some(card => card.name === "Fabled Azurite Fatestone"));
  const line = (cardName: string, quantity = 1) => ({ cardName, quantity });
  for (const champion of cards.filter(card => card.types.includes("CHAMPION") && card.name.startsWith("Guo Jia,"))) {
    for (const element of ["Fire", "Water", "Wind"]) {
      const material = [line(champion.name), line(`Spirit of ${element}`), ...fatestones.map(card => line(card.name))];
      const result = validateDeck({ main: [], material, sideboard: [] }, byName, new Set([element.toUpperCase()]));
      // Azurite is currently banned in Standard; element access must not bypass that.
      assert.equal(result.status, "Illegal");
      assert.ok(result.reasons.includes("Fabled Azurite Fatestone is banned in Standard (material)."));
      assert.ok(!result.reasons.some(reason => reason.includes("element identity")), `${champion.name} / ${element}`);
    }
  }
  const emerald = "Fabled Emerald Fatestone";
  const guo = line("Guo Jia, Chosen Disciple");
  const spirit = line("Spirit of Fire");
  const check = (material: ReturnType<typeof line>[], main: ReturnType<typeof line>[] = [], sideboard: ReturnType<typeof line>[] = [], catalog = byName) =>
    validateDeck({ main, material, sideboard }, catalog, new Set(["FIRE"]));
  assert.equal(check([spirit, guo, line(emerald)]).status, "Incomplete");
  for (const material of [[spirit, line(emerald)], [spirit, { ...guo, quantity: 0 }, line(emerald)]]) {
    assert.ok(check(material).reasons.includes(`${emerald} is outside the Champion/Spirit element identity.`));
  }
  for (const section of ["main", "sideboard"] as const) {
    const other = [line(emerald)];
    assert.ok(check([spirit, guo, line(emerald)], section === "main" ? other : [], section === "sideboard" ? other : []).reasons.includes(`${emerald} is outside the Champion/Spirit element identity.`));
  }
  assert.ok(check([spirit, guo], [line("Wildgrowth Fatestone")]).reasons.some(reason => reason.includes("element identity")));
  assert.ok(check([spirit, guo, line("Wildgrowth Fatestone")]).reasons.some(reason => reason.includes("element identity")));
  assert.ok(check([spirit, guo, line(emerald, 5)]).reasons.some(reason => reason.includes("exceeds")));
  const bannedCatalog = new Map(byName);
  bannedCatalog.set(emerald, { ...byName.get(emerald)!, legality: { STANDARD: { limit: 0 } } } as Card);
  assert.ok(check([spirit, guo, line(emerald)], [], [], bannedCatalog).reasons.some(reason => reason.includes("banned")));
});
