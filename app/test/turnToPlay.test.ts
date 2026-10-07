import assert from "node:assert/strict";
import test from "node:test";
import { naturalLevelByTurn, earliestLevelTurn, computeTurnToPlay } from "../src/lib/turnToPlay";

test("normal materialization starts at level zero and skips turn one", () => {
  assert.deepEqual([1, 2, 3, 4].map(naturalLevelByTurn), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3].map((level) => earliestLevelTurn(level)), [1, 2, 3, 4]);
});

test("each available accelerant advances the level schedule once", () => {
  assert.equal(earliestLevelTurn(1, [1]), 1);
  assert.equal(earliestLevelTurn(3, [2]), 3);
  assert.equal(earliestLevelTurn(3, [2, 2]), 2);
  assert.equal(earliestLevelTurn(3, [5]), 4);
});

test("play timing respects both the corrected level gate and reserve cost", () => {
  assert.deepEqual(computeTurnToPlay(3, 3, [], 7), { costTurn: 1, levelTurn: 4, earliestTurn: 4 });
  assert.deepEqual(computeTurnToPlay(11, 3, [2], 7), { costTurn: 5, levelTurn: 3, earliestTurn: 5 });
});
