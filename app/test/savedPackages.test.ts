import assert from "node:assert/strict";
import test from "node:test";
import { applyPackageAutoPolicy, evaluateSavedPackage, packageAutoEligibility, packagePoolId, packageRuleKey, type SavedCardPackage, type SavedPackageRule } from "@gatcg/shared";
import { mergeSavedPackages, migratePackageApprovals, overlaySavedPackages } from "../src/features/deckbuilder/savedPackages";
import { buildSuggestedPackages } from "../src/features/cards/suggestedPackages";

const conditions = { requiredCards: ["A"], groups: [{ cards: ["B", "C"], minimum: 1 }] };
function rule(overrides: Partial<SavedPackageRule> = {}): SavedPackageRule {
  return { id: packageRuleKey(conditions), label: "Rule", conditions, activation: "", cards: ["A", "B", "C"], status: "suggested", source: "test", sourceIds: [], scope: "main-material", evidence: { ruleKey: packageRuleKey(conditions), generatedAt: "today", mechanicsVerified: true, verification: "reviewed", ambiguities: [], requiredMaterialCards: ["B"], cohorts: [{ championName: "Alice", championCards: ["Alice, Test"], matchingDecks: 30, matchingEvents: 3, anchorDecks: 35, confidence: .8, lift: 2 }] }, ...overrides };
}
function pkg(rules: SavedPackageRule[], cards = ["A", "B", "C"]): SavedCardPackage { const id = packagePoolId(cards); return { id, name: "Package", cards, rules, subpackageIds: [], sourcePackageIds: [id] }; }
const set = (...cards: string[]) => new Set(cards);

test("OR across approved rules; AND within rules; no protection from unmet alternatives", () => {
  const second = rule({ id: "second", conditions: { requiredCards: ["D", "E"], groups: [] }, cards: ["D", "E"], status: "manual" });
  const p = pkg([rule({ status: "manual" }), second], ["A", "B", "C", "D", "E"]);
  assert.deepEqual(evaluateSavedPackage(p, set("A", "B", "D"), set(), set()), ["A", "B"]);
  assert.deepEqual(evaluateSavedPackage(p, set("D", "E"), set(), set()), ["D", "E"]);
  assert.deepEqual(evaluateSavedPackage(p, set("A"), set(), set()), []);
  assert.deepEqual(evaluateSavedPackage(pkg([rule()]), set("A", "B"), set(), set()), []);
});
test("migration groups exact pools and preserves legacy sections and independent conditions", () => {
  const raw = JSON.stringify([{ id: "one", label: "Old", memberCards: ["A", "B", "C"], requiredCards: ["A"], optionCards: ["B", "C"], minOptions: 1 }, { id: "two", label: "Other", memberCards: ["A", "B", "C"], requiredCards: ["B"], optionCards: ["A", "C"], minOptions: 2 }]);
  const store = migratePackageApprovals(raw);
  assert.equal(store.packages.length, 1);
  assert.equal(store.packages[0].rules.length, 2);
  assert.equal(store.autoEnabled, false);
  assert.deepEqual(evaluateSavedPackage(store.packages[0], set(), set(), set("A", "C")), ["A", "C"]);
  assert.deepEqual(migratePackageApprovals(raw), store);
});
test("dry run never approves; qualifying rule scopes to champion and material prerequisites", () => {
  const p = pkg([rule()]);
  assert.equal(packageAutoEligibility(p.rules[0]).eligible, true);
  assert.equal(applyPackageAutoPolicy([p], false)[0].rules[0].status, "suggested");
  const approved = applyPackageAutoPolicy([p], true)[0];
  assert.equal(approved.rules[0].status, "auto");
  assert.deepEqual(evaluateSavedPackage(approved, set("A", "B", "Alice, Test"), set("B", "Alice, Test"), set()), ["A", "B"]);
  assert.deepEqual(evaluateSavedPackage(approved, set("A", "B"), set("B"), set()), []);
  assert.deepEqual(evaluateSavedPackage(approved, set("A", "B", "Alice, Test"), set("Alice, Test"), set()), []);
});
test("all policy gates must pass within one cohort; missing proof and edited conditions fail closed", () => {
  const r = rule();
  for (const change of [{ matchingDecks: 29 }, { matchingEvents: 2 }, { confidence: .79 }, { lift: 1.99 }, { championCards: [] }]) {
    assert.equal(packageAutoEligibility({ ...r, evidence: { ...r.evidence!, cohorts: [{ ...r.evidence!.cohorts[0], ...change }] } }).eligible, false);
  }
  assert.equal(packageAutoEligibility({ ...r, conditions: { requiredCards: ["X"], groups: [] } }).eligible, false);
  assert.equal(packageAutoEligibility({ ...r, evidence: undefined }).eligible, false);
  assert.equal(packageAutoEligibility({ ...r, evidence: { ...r.evidence!, mechanicsVerified: false } }).eligible, false);
  assert.equal(packageAutoEligibility({ ...r, evidence: { ...r.evidence!, ambiguities: ["Unresolved"] } }).eligible, false);
  assert.equal(packageAutoEligibility({ ...r, evidence: { ...r.evidence!, cohorts: [{ ...r.evidence!.cohorts[0], matchingEvents: 1 }, { ...r.evidence!.cohorts[0], matchingDecks: 2 }] } }).eligible, false);
});
test("revocation blocks reapproval and disabling retains manual rules", () => {
  const manual = rule({ id: "manual", status: "manual" });
  const p = pkg([rule({ autoBlocked: true }), manual]);
  assert.deepEqual(applyPackageAutoPolicy([p], true)[0].rules.map((r) => r.status), ["suggested", "manual"]);
  assert.deepEqual(applyPackageAutoPolicy([pkg([rule({ status: "auto" }), manual])], false)[0].rules.map((r) => r.status), ["suggested", "manual"]);
});
test("merging preserves source rules, approval and source identities; no implicit condition broadening", () => {
  const a = pkg([rule({ status: "manual" })]);
  const b = pkg([rule({ id: "other", conditions: { requiredCards: ["B", "D"], groups: [] }, cards: ["B", "D"] })], ["B", "D"]);
  const merged = mergeSavedPackages(a, b);
  assert.equal(merged.rules.length, 2);
  assert.deepEqual(merged.cards, ["A", "B", "C", "D"]);
  assert.ok(merged.sourcePackageIds.includes(b.id));
  assert.deepEqual(evaluateSavedPackage(merged, set("B", "D"), set(), set()), []);
  const store = { version: 2 as const, autoEnabled: false, packages: [merged] };
  assert.equal(overlaySavedPackages([a, b], store).length, 1);
});
test("new evidence revokes stale automatic eligibility without downgrading manual decisions", () => {
  const old = pkg([rule({ status: "auto" })]);
  const current = pkg([rule({ evidence: undefined })]);
  const overlaid = overlaySavedPackages([current], { version: 2, packages: [old], autoEnabled: true });
  assert.equal(applyPackageAutoPolicy(overlaid, true)[0].rules[0].status, "suggested");
});
test("source findings are attached to their enclosing package instead of duplicate suggestions", () => {
  const families = [{ anchorCard: "A", coreCards: [], optionCards: ["B", "C"], minOptions: 1, evidenceKinds: [], candidateCount: 1, confidenceScore: 80, matchingDecks: 30 }];
  const candidates = [{ anchorCard: "A", memberCards: ["B"], confidenceScore: 80, confidenceTier: "strong" as const, confidence: .9, lift: 2, matchingDecks: 30, anchorDecks: 34, memberDecks: 40, populationDecks: 100, support: .3, evidenceKinds: [], championCoverage: 1, strongestChampions: [], cautions: [] }];
  const result = buildSuggestedPackages([], [], { generatedAt: "test", families, candidates });
  assert.equal(result.length, 1); assert.equal(result[0].rules.length, 2); assert.equal(result[0].rules[1].supporting, true);
});

test("merging never clears a prior automatic-approval block", () => {
  const left = pkg([rule({ autoBlocked: true })]);
  const right = pkg([rule({ status: "auto" })]);
  const merged = mergeSavedPackages(left, right);
  assert.equal(merged.rules[0].autoBlocked, true);
  assert.equal(applyPackageAutoPolicy([merged], true)[0].rules[0].status, "suggested");
});

test("registered section-aware protection remains one package after saving its organization", async () => {
  const { getRegisteredDeckPackageCatalog, getDeckPackageCatalog } = await import("../src/features/deckbuilder/packageGuardrails");
  const { PACKAGE_STORE_KEY } = await import("../src/features/deckbuilder/savedPackages");
  const suggested = buildSuggestedPackages(getRegisteredDeckPackageCatalog(), []);
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (key: string) => key === PACKAGE_STORE_KEY ? JSON.stringify({ version: 2, autoEnabled: false, packages: suggested }) : null } } });
  try {
    const catalog = getDeckPackageCatalog([{ cardName: "Fluffy Shopkeep", section: "main", quantity: 1 }, { cardName: "Fire Resonance Bauble", section: "material", quantity: 1 }, { cardName: "Water Resonance Bauble", section: "material", quantity: 1 }]);
    assert.equal(new Set(catalog.map(entry => entry.id)).size, catalog.length);
    const active = catalog.filter(entry => entry.active);
    assert.equal(active.length, 1);
    assert.deepEqual(active[0].protectedCards.sort(), ["Fire Resonance Bauble", "Water Resonance Bauble"]);
  } finally { if (original) Object.defineProperty(globalThis, "window", original); else Reflect.deleteProperty(globalThis, "window"); }
});
