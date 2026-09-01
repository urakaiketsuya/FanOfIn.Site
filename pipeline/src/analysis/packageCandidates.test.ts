import assert from "node:assert/strict";
import test from "node:test";
import { archetypeOverlapSeeds, buildPackageCandidateFamilies, computePackageCandidates, namedRulesTextSeeds, subtypeRulesTextSeeds, type PackageCandidateEvidence } from "./packageCandidates.js";
import type { ArchetypeCluster } from "@gatcg/shared";

test("champion-stratified package scoring reports lift and counter-evidence", () => {
  const names = ["Engine", "Target", "Staple"];
  const entries = Array.from({ length: 20 }, (_, i) => ({
    deckId: `d${i}`,
    main: [[0, 1], ...(i < 13 ? [[1, 1] as [number, number]] : [])] as [number, number][],
    material: [], sideboard: [],
  }));
  const result = computePackageCandidates(entries, names, new Map(entries.map((e, i) => [e.deckId, i < 10 ? "A" : "B"])), [
    { anchorCard: "Engine", memberCards: ["Target"], evidenceKinds: ["Named rules-text link"] },
  ], 4);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].matchingDecks, 13);
  assert.equal(result.candidates[0].championCoverage, 2);
  assert.ok(result.candidates[0].confidenceScore > 0);
});

test("named rules text produces pair and multi-card seeds", () => {
  const seeds = namedRulesTextSeeds([
    { name: "Long Engine", effect: "Choose Long Target One or Long Target Two." },
    { name: "Long Target One" }, { name: "Long Target Two" },
  ]);
  assert.equal(seeds.length, 3);
  assert.ok(seeds.some((seed) => seed.memberCards.length === 2));
});

test("mechanically referenced subtypes nominate toolbox combinations", () => {
  const seeds = subtypeRulesTextSeeds([
    { name: "Toolbox Engine", effect: "Materialize a Bullet card.", subtypes: ["SKILL"] },
    { name: "Round One", subtypes: ["BULLET"] },
    { name: "Round Two", subtypes: ["BULLET"] },
    { name: "Round Three", subtypes: ["BULLET"] },
  ]);
  assert.equal(seeds.filter((seed) => seed.memberCards.length === 1).length, 3);
  assert.equal(seeds.filter((seed) => seed.memberCards.length === 2).length, 3);
});

test("defining-card overlap nominates pairs from related builds and records provenance", () => {
  const cluster = (id: string, strategyArchetypeId: string, playerCount: number, cards: string[]): ArchetypeCluster => ({
    id, strategyArchetypeId, playerCount, name: `Build ${id}`,
    mainDefiningCards: cards.map((name) => ({ name, prevalence: 0.9 })),
    materialDefiningCards: [],
  } as unknown as ArchetypeCluster);
  const seeds = archetypeOverlapSeeds([
    cluster("a", "shared", 50, ["Engine", "Payoff"]),
    cluster("b", "shared", 60, ["Engine", "Payoff"]),
    cluster("c", "isolated", 50, ["Lone Engine", "Lone Payoff"]),
  ]);
  const shared = seeds.find((seed) => seed.anchorCard === "Engine" && seed.memberCards[0] === "Payoff");
  assert.equal(shared?.archetypeSources?.length, 2);
  assert.ok(shared?.evidenceKinds.includes("Archetype defining-card overlap"));
  assert.ok(!seeds.some((seed) => seed.anchorCard === "Lone Engine"));
});

test("a large established build can nominate a defining-card package by itself", () => {
  const seed = archetypeOverlapSeeds([{
    id: "large", strategyArchetypeId: "solo", playerCount: 200, name: "Large Build",
    mainDefiningCards: [{ name: "Engine", prevalence: 0.95 }, { name: "Payoff", prevalence: 0.85 }],
    materialDefiningCards: [],
  } as unknown as ArchetypeCluster]);
  assert.equal(seed.length, 1);
});

test("overlapping candidates become a core-and-options family", () => {
  const evidence = (members: string[], score: number): PackageCandidateEvidence => ({
    anchorCard: "Engine", memberCards: members, evidenceKinds: ["BULLET rules-text link", "Multi-card cluster"],
    matchingDecks: 20, anchorDecks: 25, memberDecks: 30, populationDecks: 100, support: 0.2,
    confidence: 0.8, lift: 2, championCoverage: 2, strongestChampions: [], confidenceScore: score, cautions: [],
  });
  const [family] = buildPackageCandidateFamilies([
    evidence(["Core", "Option A"], 90), evidence(["Core", "Option B"], 88), evidence(["Core", "Option C"], 70),
  ]);
  assert.deepEqual(family.coreCards, ["Core"]);
  assert.deepEqual(family.optionCards, ["Option A", "Option B", "Option C"]);
  assert.equal(family.minOptions, 1);
});
