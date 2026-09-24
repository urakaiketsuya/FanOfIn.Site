import assert from "node:assert/strict";
import test from "node:test";
import { activeAnalysisPlan, addAnalysisPlan, analysisProfileKey, cacheSyncedAnalysisProfile, loadAnalysisProfile, newerAnalysisProfile, removeAnalysisPlan, saveAnalysisProfile } from "../src/lib/analysisProfile";

class MemoryStorage { private values = new Map<string, string>(); getItem(key: string) { return this.values.get(key) ?? null; } setItem(key: string, value: string) { this.values.set(key, value); } removeItem(key: string) { this.values.delete(key); } clear() { this.values.clear(); } key(index: number) { return [...this.values.keys()][index] ?? null; } get length() { return this.values.size; } }
const lines = [{ name: "Setup Card", quantity: 4 }, { name: "Payoff Card", quantity: 3 }];
const save = (storage: Storage, overrides: Record<string, unknown> = {}, identity?: string) => {
  const empty = loadAnalysisProfile(storage, "Champion", lines);
  return saveAnalysisProfile(storage, "Champion", lines, { ...empty, ...overrides }, identity);
};

test("profiles persist multiple named plans and shared metadata", () => {
  const storage = new MemoryStorage() as Storage; let profile = loadAnalysisProfile(storage, "Champion", lines); profile = addAnalysisPlan(profile, "Alternate finish");
  profile = { ...profile, plans: profile.plans.map((plan) => plan.id === profile.activePlanId ? { ...plan, roles: { "Payoff Card": "payoff" }, stageUsefulness: { "Payoff Card": "late" }, pressure: { "Payoff Card": { earliestTurn: 4, repeatable: true, effectiveReserveCost: 2 } }, resilience: { "Setup Card": "establish", "Payoff Card": "rebuild" } } : plan), effectiveCosts: { "Payoff Card": 2 } };
  const loaded = loadAnalysisProfile(storage, "Champion", lines); // unsaved remains empty
  assert.equal(loaded.plans.length, 1);
  const saved = saveAnalysisProfile(storage, "Champion", lines, profile);
  const restored = loadAnalysisProfile(storage, "Champion", [...lines].reverse());
  assert.equal(restored.plans.length, 2); assert.equal(activeAnalysisPlan(restored).name, "Alternate finish"); assert.deepEqual(activeAnalysisPlan(restored).pressure, activeAnalysisPlan(saved).pressure); assert.deepEqual(activeAnalysisPlan(restored).resilience, activeAnalysisPlan(saved).resilience); assert.deepEqual(restored.effectiveCosts, { "Payoff Card": 2 });
  assert.equal(analysisProfileKey("Champion", lines), analysisProfileKey("Champion", [...lines].reverse()));
});

test("v2 profiles migrate into a primary named plan", () => {
  const storage = new MemoryStorage() as Storage; const v3key = analysisProfileKey("Champion", lines); const fingerprint = v3key.split(":").at(-1)!;
  storage.setItem(`fanofin:analysis-profile:v2:${fingerprint}`, JSON.stringify({ version: 2, deckFingerprint: fingerprint, revision: 1, planName: "Fractal finish", roles: { "Setup Card": "enabler", "Old Card": "payoff" } }));
  const profile = loadAnalysisProfile(storage, "Champion", lines); assert.equal(activeAnalysisPlan(profile).name, "Fractal finish"); assert.deepEqual(activeAnalysisPlan(profile).roles, { "Setup Card": "enabler" });
});

test("changed named decks carry unchanged assignments and metadata into an unreviewed revision", () => {
  const storage = new MemoryStorage() as Storage; const original = loadAnalysisProfile(storage, "Champion", lines); const plan = activeAnalysisPlan(original);
  const saved = saveAnalysisProfile(storage, "Champion", lines, { ...original, plans: [{ ...plan, roles: { "Setup Card": "enabler", "Payoff Card": "payoff" }, stageUsefulness: { "Setup Card": "early" }, pressure: { "Payoff Card": { earliestTurn: 3, repeatable: false, effectiveReserveCost: 2 } }, resilience: { "Setup Card": "establish", "Payoff Card": "rebuild" } }], effectiveCosts: { "Setup Card": 1 }, reviewedAt: "2026-09-01T00:00:00.000Z" }, "Saved deck 42");
  const changed = [{ name: "Setup Card", quantity: 4 }, { name: "New Card", quantity: 3 }]; const carried = loadAnalysisProfile(storage, "Champion", changed, "Saved deck 42");
  assert.deepEqual(activeAnalysisPlan(carried).roles, { "Setup Card": "enabler" }); assert.deepEqual(activeAnalysisPlan(carried).stageUsefulness, { "Setup Card": "early" }); assert.deepEqual(activeAnalysisPlan(carried).pressure, {}); assert.deepEqual(activeAnalysisPlan(carried).resilience, { "Setup Card": "establish" }); assert.deepEqual(carried.effectiveCosts, { "Setup Card": 1 }); assert.equal(carried.revision, 2); assert.equal(carried.reviewedAt, null); assert.equal(carried.inheritedFrom, saved.deckFingerprint);
});

test("unnamed imports do not inherit and the final plan cannot be removed", () => {
  const storage = new MemoryStorage() as Storage; save(storage, {}, "Named deck"); const fresh = loadAnalysisProfile(storage, "Champion", [{ name: "Setup Card", quantity: 2 }]); assert.deepEqual(activeAnalysisPlan(fresh).roles, {}); assert.equal(removeAnalysisPlan(fresh, fresh.activePlanId), fresh);
});

test("account profiles cache locally and newer edits win device merges", () => {
  const storage = new MemoryStorage() as Storage;
  const local = { ...save(storage, {}, "Named deck"), updatedAt: "2026-09-22T00:00:00.000Z" };
  const remote = { ...local, plans: [{ ...local.plans[0], name: "Remote plan" }], updatedAt: "2026-09-23T00:00:00.000Z" };
  const cached = cacheSyncedAnalysisProfile(storage, "Champion", lines, remote, "Named deck");
  assert.ok(cached); assert.equal(activeAnalysisPlan(cached).name, "Remote plan"); assert.equal(newerAnalysisProfile(local, cached), cached);
  assert.equal(activeAnalysisPlan(loadAnalysisProfile(storage, "Champion", lines, "Named deck")).name, "Remote plan");
});

test("an account profile from a prior named-deck revision carries only current cards", () => {
  const storage = new MemoryStorage() as Storage; const source = save(storage, {}, "Named deck");
  source.plans[0].roles = { "Setup Card": "enabler", "Payoff Card": "payoff" };
  const changed = [{ name: "Setup Card", quantity: 4 }, { name: "Replacement", quantity: 3 }];
  const cached = cacheSyncedAnalysisProfile(storage, "Champion", changed, source, "Named deck");
  assert.ok(cached); assert.deepEqual(activeAnalysisPlan(cached).roles, { "Setup Card": "enabler" }); assert.equal(cached.reviewedAt, null); assert.equal(cached.inheritedFrom, source.deckFingerprint);
});
