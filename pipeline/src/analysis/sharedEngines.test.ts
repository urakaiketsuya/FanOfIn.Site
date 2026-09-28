import test from "node:test";
import assert from "node:assert/strict";
import type { ArchetypeCluster } from "@gatcg/shared";
import { analyzeEngines, type EngineDeck } from "./sharedEngines.js";
function fixture(packageCards: string[]) {
  const decks: EngineDeck[] = [];
  for (const championName of ["Lorraine", "Rai", "Other"]) for (let i = 0; i < 12; i++) {
    decks.push({ deckId: `${championName}:${i}`, player: i + (championName === "Lorraine" ? 0 : 100), eventId: i % 2,
      championName, format: "Standard", access: "FIRE", materialRouteName: championName,
      cardCounts: new Map((championName === "Other" ? ["Creative Shock", "Baseline"] : ["Creative Shock", ...packageCards, championName]).map((name) => [name, 4])) });
  }
  const builds = ["Lorraine", "Rai"].map((championName) => ({ id: championName, name: championName, championName, deckIds: decks.filter((d) => d.championName === championName).map((d) => d.deckId), playerCount: 12, deckCount: 12, avgWinRate: .5 } as ArchetypeCluster));
  return { builds, decks };
}
test("one cross-champion staple cannot establish a shared engine", () => {
  const { builds, decks } = fixture([]);
  assert.ok(analyzeEngines(builds, decks).every((e) => e.status !== "shared"));
});
test("recurring enriched multi-card package qualifies, while common staples remain visible", () => {
  const { builds, decks } = fixture(["Engine A", "Engine B"]);
  const engines = analyzeEngines(builds, decks);
  assert.equal(engines.length, 1);
  assert.equal(engines[0].status, "shared");
  assert.ok(engines[0].commonCore?.some((c) => c.name === "Creative Shock" && c.enrichment === 0));
  assert.ok(!engines[0].name.includes("Creative Shock"));
});
test("labels and evidence are deterministic; concrete ids and membership stay unchanged", () => {
  const { builds, decks } = fixture(["Engine A", "Engine B"]);
  const original = structuredClone(builds);
  const a = analyzeEngines(builds, decks);
  const b = analyzeEngines(structuredClone(original).reverse(), [...decks].reverse());
  assert.deepEqual(a, b);
  assert.deepEqual(builds.map(({ name: _name, namingCards: _namingCards, ...rest }) => rest), original.map(({ name: _name, namingCards: _namingCards, ...rest }) => rest));
});
test("single-event recurrence is candidate evidence", () => {
  const { builds, decks } = fixture(["Engine A", "Engine B"]);
  decks.forEach((d) => { d.eventId = 1; });
  assert.equal(analyzeEngines(builds, decks)[0].status, "candidate");
});
test("one enriched card is still only a candidate, and repeated pilots cannot qualify", () => {
  const single = fixture(["One strategy card"]);
  assert.ok(analyzeEngines(single.builds, single.decks).every((engine) => engine.status !== "shared"));
  const repeated = fixture(["Engine A", "Engine B"]);
  repeated.decks.forEach((deck) => { deck.player = deck.championName === "Lorraine" ? 1 : 2; });
  assert.equal(analyzeEngines(repeated.builds, repeated.decks)[0].status, "candidate");
});
test("incompatible formats and access do not inflate enrichment", () => {
  for (const field of ["format", "access"] as const) {
    const { builds, decks } = fixture(["Engine A", "Engine B"]);
    for (const deck of decks) if (deck.championName === "Other") deck[field] = "incompatible";
    assert.ok(analyzeEngines(builds, decks).every((engine) => engine.status !== "shared"));
  }
});

test("label cards are explicit and follow label order", () => {
  const { builds, decks } = fixture(["Package A", "Package B"]);
  analyzeEngines(builds, decks);
  for (const build of builds) { assert.ok(build.namingCards?.length); assert.ok(build.name.includes(build.namingCards!.join(" / "))); }
});
