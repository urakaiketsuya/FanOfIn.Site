import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { applyPackageAutoPolicy, includeWinRatePackages, indexPackagePerformance, packagePerformanceOwners, packagePoolId, packageRulePerformance, packageRuleKey, winRateRuleKey, WIN_RATE_PACKAGE_DEFAULTS, type SavedCardPackage, type WinRatePackageFinding, type WinRatePackagesData } from "@gatcg/shared";
import { mergeSavedPackages, overlaySavedPackages } from "../src/features/deckbuilder/savedPackages";

const bucket = { decks: 20, players: 12, events: 4, winRate: 0.6 };
function finding(cards: string[], cohort = "Alice/season1"): WinRatePackageFinding {
  const comparison = { complete: bucket, incomplete: { ...bucket, winRate: 0.4 }, lift: 0.1, missingOne: cards.map((card) => ({ card, bucket, lift: 0.1 })), weakestMemberLift: 0.1, sufficient: true };
  return { cards, cohort, champion: "Alice", season: cohort, format: "standard", validationStarts: "2026-01-01", discovery: comparison, validation: comparison, status: "positive-in-later-events", existingCandidateOverlap: "none" };
}
const data = (...results: WinRatePackageFinding[]): WinRatePackagesData => ({ generatedAt: "2026-01-02", sourceGeneratedAt: "2026-01-01", settings: WIN_RATE_PACKAGE_DEFAULTS, cohortsTested: 1, totalTested: results.length, results });
function existing(cards: string[]): SavedCardPackage {
  const conditions = { requiredCards: cards, groups: [] };
  const id = packagePoolId(cards);
  return { id, name: "My package", cards, rules: [{ id: packageRuleKey(conditions), label: "Original", cards, conditions, activation: "All required", scope: "main-material", source: "Manual", sourceIds: [], status: "manual" }], subpackageIds: [], sourcePackageIds: [id] };
}

test("exact rules share evidence across cohorts without changing approval or duplicating packages", () => {
  const source = data(finding(["A", "B"]), finding(["B", "A"], "Alice/season2"));
  const pkg = existing(["A", "B"]);
  const result = includeWinRatePackages([pkg], source);
  assert.equal(result.length, 1);
  assert.equal(result[0].rules.length, 1);
  assert.equal(result[0].rules[0].status, "manual");
  assert.equal(packageRulePerformance(result[0].rules[0], indexPackagePerformance(source)).length, 2);
});
test("overlapping variants keep their own AND rules, with a common core and cohort", () => {
  const source = data(finding(["A", "B", "C"]), finding(["A", "B", "D"]));
  const packages = includeWinRatePackages([], source);
  assert.equal(packages.length, 1);
  assert.deepEqual(packages[0].cards, ["A", "B", "C", "D"]);
  assert.equal(packages[0].rules.length, 2);
  assert.ok(packages[0].rules.every((r) => r.conditions!.requiredCards.length === 3 && !r.conditions!.groups.length));
  assert.ok(applyPackageAutoPolicy(packages, true)[0].rules.every((r) => r.status === "suggested"));
});
test("a transitive overlap chain and disjoint cohorts do not become a giant family", () => {
  const source = data(finding(["A", "B", "C"]), finding(["A", "B", "D"]), finding(["B", "D", "E"]), finding(["A", "B", "F"], "Other/season2"));
  const packages = includeWinRatePackages([], source);
  assert.equal(packages.length, 3);
  assert.ok(packages.every((p) => p.rules.length <= 2));
  assert.deepEqual(includeWinRatePackages([], { ...source, results: [...source.results].reverse() }), packages);
});
test("renaming, merging and reloading retain exact evidence and one display owner", () => {
  const source = data(finding(["A", "B"]), finding(["C", "D"]));
  const [a, b] = includeWinRatePackages([], source);
  const merged = { ...mergeSavedPackages(a, b), name: "Renamed" };
  const restored = JSON.parse(JSON.stringify(merged));
  const reloaded = includeWinRatePackages(overlaySavedPackages([], { version: 2, autoEnabled: false, packages: [restored] }), source);
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].name, "Renamed");
  const index = indexPackagePerformance(source);
  assert.ok(reloaded[0].rules.every((r) => packageRulePerformance(r, index).length === 1));
  assert.equal(packagePerformanceOwners([...reloaded, a], index).size, 2);
});
test("edits, optional rules, legacy sections and Material constraints cannot inherit evidence", () => {
  const source = data(finding(["A", "B"]));
  const index = indexPackagePerformance(source);
  const rule = existing(["A", "B"]).rules[0];
  assert.equal(packageRulePerformance({ ...rule, conditions: { requiredCards: ["A", "C"], groups: [] } }, index).length, 0);
  assert.equal(packageRulePerformance({ ...rule, conditions: { requiredCards: ["A"], groups: [{ cards: ["B", "C"], minimum: 1 }] } }, index).length, 0);
  assert.equal(packageRulePerformance({ ...rule, scope: "legacy-any-section" }, index).length, 0);
  assert.equal(packageRulePerformance({ ...rule, autoMaterialCards: ["A"] }, index).length, 0);
  const legacy = existing(["A", "B"]); legacy.rules[0].scope = "legacy-any-section";
  const result = includeWinRatePackages([legacy], source);
  assert.equal(result[0].rules.length, 2);
  assert.equal(packagePerformanceOwners(result, index).size, 1);
});
test("subset and superset rules remain distinct; no performance is invented for the shared core", () => {
  const source = data(finding(["A", "B"]), finding(["A", "B", "C"]));
  const result = includeWinRatePackages([], source);
  assert.equal(result.length, 1);
  assert.equal(result[0].rules.length, 2);
  const index = indexPackagePerformance(source);
  assert.equal(index.has(winRateRuleKey(["A"])), false);
  assert.ok(result[0].rules.every((rule) => packageRulePerformance(rule, index).length === 1));
});
test("the published audit retains every finding under an exact rule", () => {
  const source = JSON.parse(readFileSync(new URL("../../data/analysis/win-rate-packages.json", import.meta.url), "utf8")) as WinRatePackagesData;
  const packages = includeWinRatePackages([], source);
  const index = indexPackagePerformance(source);
  const owners = packagePerformanceOwners(packages, index);
  assert.equal(owners.size, index.size);
  assert.equal([...owners.values()].reduce((n, { rule }) => n + packageRulePerformance(rule, index).length, 0), source.results.length);
  assert.ok(packages.length < index.size);
  assert.ok(packages.every((pkg) => pkg.rules.every((r) => r.status === "suggested" && !r.evidence)));
});
