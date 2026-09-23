import assert from "node:assert/strict";
import test from "node:test";
import { computeThreatCadence, probabilityOfCumulativeDeadlines } from "../src/lib/threatCadence";

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
