import { test } from "node:test";
import assert from "node:assert/strict";
import { selectStapleRows, type StapleFilters } from "@gatcg/shared";
import { computeCardStaples } from "./cardStaples.js";
import { buildCardIndex, type CardSignature } from "../cards/catalog.js";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
const card = (name: string, overrides: Partial<CardSignature> = {}): CardSignature => ({ name, slug: name.toLowerCase().replaceAll(" ", "-"), types: ["ACTION"], classes: ["MAGE"], subtypes: [], elements: ["FIRE", "WATER"], level: null, cost_reserve: 2, effect: "**Stealth** **Vigor**", editions: [], ...overrides });
const catalog = buildCardIndex([card("Shared"), card("Alice, Champion", { types: ["CHAMPION"], level: 2 })]);
const deck = (player: number, sideboard: unknown = []) => ({ player, decklist: { main: [{ card: "shared", quantity: 2 }, { card: "Shared", quantity: 1 }], material: [{ card: "Alice, Champion", quantity: 1 }], sideboard } });
function bundle(id: number, date: string, entries: unknown[]): OmnidexEventBundle {
  return { id, fetchedAt: "2026-10-01", event: { id, status: "complete", format: "standard", date }, decklists: entries, standings: { standings: [{ id: 1, statsWins: 2, statsLosses: 1, statsTies: 1 }] } } as OmnidexEventBundle;
}
const filters: StapleFilters = { search: "", elements: [], keywords: [], keywordMode: "any", type: "", cardClass: "", level: "", costKind: "reserve", maxCost: "", minDecks: 1, sort: "usage" };
test("canonical cards count once per event/player/section with independent sideboards", () => {
  const first = deck(1, [{ card: "Shared", quantity: 2 }]);
  const source = bundle(1, "2026-10-01", [first, first, deck(2)]);
  const data = computeCardStaples([source, source], catalog);
  const cohort = data.cohorts.find(c => c.period === "all" && c.format === null && c.champion === null)!;
  assert.equal(cohort.decks, 2); assert.equal(data.cards.filter(c => c.name === "Shared").length, 1);
  assert.deepEqual(cohort.sections.main.rows[0].slice(1, 5), [2, 6, 3, 1]);
  assert.equal(cohort.sections.sideboard.decks, 2);
  assert.equal(cohort.sections.sideboard.rows[0][1], 1); assert.equal(cohort.sections.sideboard.rows[0][2], 2);
  assert.ok(Math.abs(cohort.sections.main.rows[0][5]! - (0.625 + 5) / 11) < 0.000001);
});
test("missing sideboards are unknown while explicitly empty sections count", () => {
  const missing = deck(2); delete (missing.decklist as { sideboard?: unknown }).sideboard;
  const cohort = computeCardStaples([bundle(1, "2026-10-01", [deck(1), missing])], catalog).cohorts[0];
  assert.equal(cohort.decks, 2); assert.equal(cohort.sections.sideboard.decks, 1); assert.deepEqual(cohort.sections.sideboard.rows, []);
});
test("recent windows exclude the boundary and retain all-time evidence", () => {
  const data = computeCardStaples([bundle(1, "2026-10-01", [deck(1)]), bundle(2, "2026-09-01", [deck(1)]), bundle(3, "2026-07-03", [deck(1)])], catalog);
  const count = (period: string) => data.cohorts.find(c => c.period === period && c.format === null && c.champion === null)!.decks;
  assert.equal(count("30"), 1); assert.equal(count("90"), 2); assert.equal(count("all"), 3);
});
test("filters intersect without duplicating multi-tag cards or altering denominators", () => {
  const data = computeCardStaples([bundle(1, "2026-10-01", [deck(1)])], catalog);
  const cohort = data.cohorts[0];
  const selected = selectStapleRows(data.cards, cohort.sections.main.rows, { ...filters, elements: ["FIRE", "WATER"], keywords: ["Stealth", "Vigor"], keywordMode: "all" });
  assert.equal(selected.length, 1); assert.equal(cohort.sections.main.decks, 1);
  assert.equal(selectStapleRows(data.cards, selected, { ...filters, keywords: ["Stealth", "Renewable"], keywordMode: "all" }).length, 0);
  assert.equal(selectStapleRows(data.cards, selected, { ...filters, level: "2" }).length, 0);
  assert.equal(selectStapleRows(data.cards, cohort.sections.material.rows, { ...filters, level: "2" }).length, 1);
  assert.equal(selectStapleRows(data.cards, selected, { ...filters, costKind: "memory", maxCost: "3" }).length, 0);
});
test("latest snapshots, visibility, absent outcomes, and empty input stay explicit", () => {
  const old = bundle(1, "2026-10-01", [deck(1)]);
  const replacement = { ...bundle(1, "2026-10-01", [deck(2)]), fetchedAt: "2026-10-02" };
  const data = computeCardStaples([old, replacement], catalog);
  assert.equal(data.cohorts[0].decks, 1); assert.equal(data.cohorts[0].sections.main.rows[0][5], null);
  assert.equal(selectStapleRows(data.cards, data.cohorts[0].sections.main.rows, { ...filters, sort: "winning" }).length, 0);
  assert.equal(computeCardStaples([bundle(1, "2026-10-01", [deck(1), { ...deck(1), visible: false }])], catalog).cohorts.length, 0);
  assert.deepEqual(computeCardStaples([], catalog).cards, []);
});
test("format and champion cohorts partition the aggregate without losing unknown identities", () => {
  const unknown = { ...deck(2), decklist: { main: [{ card: "UNLISTED", quantity: 2 }, { card: "unlisted", quantity: 1 }], material: [], sideboard: [] } };
  const standard = bundle(1, "2026-10-01", [deck(1)]);
  const other = bundle(2, "2026-10-01", [unknown]); other.event.format = "team-standard-3v3";
  const data = computeCardStaples([standard, other], catalog);
  const overall = data.cohorts.find(c => c.period === "all" && c.format === null && c.champion === null)!;
  const specific = data.cohorts.filter(c => c.period === "all" && c.format === null && c.champion !== null);
  assert.equal(overall.decks, 2); assert.equal(specific.reduce((sum, c) => sum + c.decks, 0), overall.decks);
  assert.equal(data.cards.filter(c => c.slug === null).length, 1);
  const unknownCohort = specific.find(c => c.champion === "Unknown champion")!;
  assert.equal(unknownCohort.sections.main.rows[0][2], 3);
  assert.equal(data.cohorts.find(c => c.period === "all" && c.format === "standard" && c.champion === null)!.decks, 1);
});
test("quantity mode ties choose the lower quantity and ordering is deterministic", () => {
  const one = deck(1); one.decklist.main = [{ card: "Shared", quantity: 1 }];
  const two = deck(2); two.decklist.main = [{ card: "Shared", quantity: 4 }];
  const data = computeCardStaples([bundle(1, "2026-10-01", [one, two])], catalog);
  assert.equal(data.cohorts[0].sections.main.rows[0][3], 1);
  assert.deepEqual(computeCardStaples([], catalog, "fixed"), { generatedAt: "fixed", throughDate: null, cards: [], cohorts: [] });
});
