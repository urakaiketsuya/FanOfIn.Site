import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { includeWinRatePackages, indexPackagePerformance, hasVerifiedPackageInteraction, packageStatisticalStatus, comparePackageInteractions, compareWinRatePackage, findingSynergyStatus, packageRuleKey, summarizePackageSynergy, verifiedPackageMechanics, type PackageOutcomeRow, type SavedPackageRule, type WinRatePackageFinding } from "@gatcg/shared";

function group(cards: string[], outcome: number, offset: number): PackageOutcomeRow[] {
  return Array.from({ length: 12 }, (_, i) => ({ cards: new Set(cards), outcome, player: offset + i, eventId: i % 3, eventDate: `2026-01-0${i % 3 + 1}` }));
}
function rows(both = 0.9) {
  return [...group(["A", "B"], both, 0), ...group(["A"], 0.6, 20), ...group(["B"], 0.6, 40), ...group([], 0.4, 60)];
}
function finding(data = rows()): WinRatePackageFinding {
  return { cohort: "test", champion: "Test", format: "standard", season: "test", validationStarts: null, cards: ["A", "B"], discovery: compareWinRatePackage(data, ["A", "B"]), validation: compareWinRatePackage(data, ["A", "B"]), interactions: comparePackageInteractions(data, ["A", "B"]), status: "positive-in-later-events", existingCandidateOverlap: "none" };
}
test("independent strong cards do not establish synergy despite positive missing-member lifts", () => {
  const f = finding(rows(0.8));
  assert.ok(f.validation.weakestMemberLift! > 0);
  assert.ok(Math.abs(f.interactions![0].difference!) < 1e-10);
  // Floating-point roundoff must not turn a zero interaction into support.
  assert.notEqual(findingSynergyStatus(f), "Supported");
});
test("positive interaction supports a pair, and a negative interaction is mixed", () => {
  assert.equal(findingSynergyStatus(finding()), "Supported");
  assert.equal(findingSynergyStatus(finding(rows(0.7))), "Mixed");
});
test("missing cells, old snapshots, and concentrated players or events remain unproven", () => {
  const f = finding(); delete f.interactions;
  assert.equal(findingSynergyStatus(f), "Unproven");
  for (const data of [rows().filter((row) => row.cards.size), rows().map((row) => ({ ...row, player: 1 })), rows().map((row) => ({ ...row, eventId: 1 }))]) {
    const result = comparePackageInteractions(data, ["A", "B"])[0];
    assert.equal(result.sufficient, false);
    assert.equal(result.interval, null);
    assert.equal(result.difference, null);
  }
});
test("larger combinations compare each member with an intact core; partial cores are excluded", () => {
  const data = [...group(["A", "B", "C"], 0.9, 0), ...group(["B", "C"], 0.6, 20), ...group(["A"], 0.6, 40), ...group([], 0.4, 60), ...group(["A", "B"], 0, 80)];
  const result = comparePackageInteractions(data, ["C", "A", "B", "A"]);
  assert.equal(result.length, 3);
  assert.deepEqual(result[0].core, ["B", "C"]);
  assert.deepEqual(result[0].buckets.map((bucket) => bucket.decks), [12, 12, 12, 12]);
  assert.ok(Math.abs(result[0].difference! - 0.1) < 1e-10);
});
test("uncertainty reflects differing player outcomes and retains cross-cell covariance", () => {
  const data = rows().map((row, i) => ({ ...row, outcome: Math.min(1, Math.max(0, row.outcome + (i % 2 ? 0.3 : -0.3))) }));
  const result = comparePackageInteractions(data, ["A", "B"])[0];
  assert.ok(result.interval![0] < 0 && result.interval![1] > 0);
  assert.equal(findingSynergyStatus(finding(data)), "Unproven");
  const correlated = rows().map((row, i) => ({ ...row, player: i % 12, outcome: row.outcome + (i % 2 ? 0.05 : -0.05) }));
  const samePlayers = comparePackageInteractions(correlated, ["A", "B"])[0];
  assert.ok(samePlayers.interval![1] - samePlayers.interval![0] < 1e-10);
});
test("families retain unknown and conflicting exact-rule results", () => {
  assert.equal(summarizePackageSynergy([]), "Unproven");
  assert.equal(summarizePackageSynergy(["Supported", "Unproven"]), "Mixed");
  assert.equal(summarizePackageSynergy(["Supported", "Mixed"]), "Mixed");
  assert.equal(summarizePackageSynergy(["Supported", "Supported"]), "Supported");
});
test("mechanical verification is bound to unchanged rule conditions, not manual approval", () => {
  const conditions = { requiredCards: ["A", "B"], groups: [] };
  const rule: SavedPackageRule = { id: "r", label: "r", activation: "", cards: ["A", "B"], status: "manual", source: "test", sourceIds: [], conditions };
  assert.equal(verifiedPackageMechanics(rule), false);
  rule.evidence = { ruleKey: packageRuleKey(conditions), generatedAt: "", mechanicsVerified: true, verification: "Test", ambiguities: [], requiredMaterialCards: [], cohorts: [] };
  assert.equal(verifiedPackageMechanics(rule), true);
  assert.equal(verifiedPackageMechanics({ ...rule, conditions: { requiredCards: ["A", "C"], groups: [] } }), false);
  assert.equal(verifiedPackageMechanics({ ...rule, evidence: { ...rule.evidence, ambiguities: ["Unknown timing"] } }), false);
});

test("Diana and Ring statistical support cannot establish a synergistic package", () => {
  const data = JSON.parse(readFileSync(new URL("../../../data/analysis/win-rate-packages.json", import.meta.url), "utf8"));
  const index = indexPackagePerformance(data);
  const pkg = includeWinRatePackages([], data).find((item) => item.cards.length === 2 && item.cards.includes("Diana, Keen Huntress") && item.cards.includes("Grand Crusader's Ring"))!;
  assert.ok(pkg);
  assert.equal(hasVerifiedPackageInteraction(pkg), false);
  const rule = pkg.rules[0];
  assert.equal(hasVerifiedPackageInteraction({ ...pkg, rules: [{ ...rule, status: "manual" }] }), false);
  assert.equal(packageStatisticalStatus(pkg, index), "Supported");
});
test("verified mechanics qualify independently of sparse performance and unverified alternatives", () => {
  const f = finding();
  const data = { results: [f] } as Parameters<typeof indexPackagePerformance>[0];
  const pkg = includeWinRatePackages([], data)[0];
  const rule = pkg.rules[0];
  assert.equal(hasVerifiedPackageInteraction(pkg), false);
  rule.evidence = { ruleKey: packageRuleKey(rule.conditions!), generatedAt: "", mechanicsVerified: true, verification: "Synthetic test relationship", ambiguities: [], requiredMaterialCards: [], cohorts: [] };
  assert.equal(hasVerifiedPackageInteraction(pkg), true);
  assert.equal(packageStatisticalStatus(pkg, new Map()), "Unproven");
  assert.equal(hasVerifiedPackageInteraction({ ...pkg, rules: [...pkg.rules, { ...rule, id: "alternative", evidence: undefined }] }), true);
  rule.evidence.ambiguities.push("Unresolved relationship");
  assert.equal(hasVerifiedPackageInteraction(pkg), false);
  rule.evidence.ambiguities = [];
  rule.conditions = { requiredCards: ["A", "C"], groups: [] };
  assert.equal(hasVerifiedPackageInteraction(pkg), false);
});
