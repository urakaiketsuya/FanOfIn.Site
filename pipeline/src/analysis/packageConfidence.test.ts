import assert from "node:assert/strict";
import test from "node:test";
import { scoreTieredPackageConfidence } from "@gatcg/shared";

test("clears the strong tier and computes confidence/lift ratios", () => {
  const result = scoreTieredPackageConfidence(12, 20, 40, 200);
  assert.ok(result);
  assert.equal(result.tier, "strong");
  assert.equal(result.confidence, 12 / 20);
  assert.equal(result.lift, (12 / 20) / (40 / 200));
});

test("falls through to the limited tier below the strong floor", () => {
  const result = scoreTieredPackageConfidence(6, 20, 40, 200);
  assert.ok(result);
  assert.equal(result.tier, "limited");
});

test("falls through to the exploratory tier with exactly one matching deck", () => {
  const result = scoreTieredPackageConfidence(1, 20, 40, 200);
  assert.ok(result);
  assert.equal(result.tier, "exploratory");
});

test("returns null below the loosest tier (zero matches)", () => {
  assert.equal(scoreTieredPackageConfidence(0, 20, 40, 200), null);
});

test("zero anchor or population counts don't throw, just yield zero ratios", () => {
  const result = scoreTieredPackageConfidence(1, 0, 0, 0);
  assert.ok(result);
  assert.equal(result.confidence, 0);
  assert.equal(result.lift, 0);
});

test("a custom, looser tier list is honored over the default", () => {
  const result = scoreTieredPackageConfidence(2, 10, 10, 100, [{ tier: "strong", minMatches: 2 }]);
  assert.ok(result);
  assert.equal(result.tier, "strong");
  assert.equal(scoreTieredPackageConfidence(1, 10, 10, 100, [{ tier: "strong", minMatches: 2 }]), null);
});
