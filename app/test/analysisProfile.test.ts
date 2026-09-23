import assert from "node:assert/strict";
import test from "node:test";
import { analysisProfileKey, loadAnalysisProfile, saveAnalysisProfile } from "../src/lib/analysisProfile";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

const lines = [{ name: "Setup Card", quantity: 4 }, { name: "Payoff Card", quantity: 3 }];

test("analysis profiles persist by stable deck version", () => {
  const storage = new MemoryStorage() as Storage;
  saveAnalysisProfile(storage, "Champion", lines, { roles: { "Setup Card": "enabler", "Payoff Card": "payoff" }, reviewedAt: null, revision: 1, inheritedFrom: null });
  assert.deepEqual(loadAnalysisProfile(storage, "Champion", [...lines].reverse()).roles, { "Setup Card": "enabler", "Payoff Card": "payoff" });
  assert.equal(analysisProfileKey("Champion", lines), analysisProfileKey("Champion", [...lines].reverse()));
});

test("analysis profiles discard unknown and malformed assignments", () => {
  const storage = new MemoryStorage() as Storage;
  storage.setItem(analysisProfileKey("Champion", lines), JSON.stringify({ version: 2, deckFingerprint: "test", revision: 1, roles: { "Setup Card": "enabler", "Old Card": "payoff", "Payoff Card": "invalid" } }));
  assert.deepEqual(loadAnalysisProfile(storage, "Champion", lines).roles, { "Setup Card": "enabler" });
});

test("a changed named deck carries unchanged assignments into an unreviewed revision", () => {
  const storage = new MemoryStorage() as Storage;
  const original = saveAnalysisProfile(storage, "Champion", lines, { roles: { "Setup Card": "enabler", "Payoff Card": "payoff" }, reviewedAt: "2026-09-01T00:00:00.000Z", revision: 1, inheritedFrom: null }, "Saved deck 42");
  const changed = [{ name: "Setup Card", quantity: 4 }, { name: "New Card", quantity: 3 }];
  const carried = loadAnalysisProfile(storage, "Champion", changed, "Saved deck 42");
  assert.deepEqual(carried.roles, { "Setup Card": "enabler" });
  assert.equal(carried.revision, 2);
  assert.equal(carried.reviewedAt, null);
  assert.equal(carried.inheritedFrom, original.deckFingerprint);
});

test("unnamed imports never inherit classifications from another list", () => {
  const storage = new MemoryStorage() as Storage;
  saveAnalysisProfile(storage, "Champion", lines, { roles: { "Setup Card": "enabler" }, reviewedAt: null, revision: 1, inheritedFrom: null }, "Named deck");
  assert.deepEqual(loadAnalysisProfile(storage, "Champion", [{ name: "Setup Card", quantity: 2 }]).roles, {});
});
