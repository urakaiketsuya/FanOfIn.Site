import assert from "node:assert/strict";
import test from "node:test";
import { computePressurePackageCadence, computeThreatCadence, probabilityOfCumulativeDeadlines } from "../src/lib/threatCadence";

test("later cadence checkpoints are stricter", () => {
  const result = computeThreatCadence(60, 16, 7, 2, 5, "first");
  assert.ok(result.checkpoints[3].probability < result.checkpoints[0].probability);
});
test("adding a threat improves cadence", () => {
  const result = computeThreatCadence(60, 12, 7, 2, 4, "first");
  assert.ok(result.additionalCopyGain > 0);
});
test("an impossible cumulative deadline has zero probability", () => {
  assert.equal(probabilityOfCumulativeDeadlines(60, 2, [{ seen: 10, required: 3 }]), 0);
});
test("pressure packages separate live access from effective-cost affordability", () => {
  const points = computePressurePackageCadence(60, [
    { name: "Early", copies: 4, earliestTurn: 1, repeatable: false, effectiveReserveCost: 2 },
    { name: "Late", copies: 4, earliestTurn: 4, repeatable: true, effectiveReserveCost: 20 },
  ], 7, 2, 4, "first");
  assert.equal(points[0].accessCopies, 4);
  assert.equal(points[0].affordableCopies, 4);
  assert.equal(points[2].accessCopies, 8);
  assert.equal(points[2].affordableCopies, 4);
  assert.ok(points[2].accessProbability > points[2].affordableProbability);
});
