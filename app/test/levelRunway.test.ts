import assert from "node:assert/strict";
import test from "node:test";
import { computeLevelRunway } from "../src/lib/levelRunway";

test("going second has one more card of runway", () => {
  const first = computeLevelRunway(7, "first", 3, 8);
  const second = computeLevelRunway(7, "second", 3, 8);
  assert.equal(second.points[2].margin, first.points[2].margin + 1);
});
test("recovery waits until the follow-up play fits the natural hand ceiling", () => {
  const result = computeLevelRunway(6, "first", 2, 8);
  assert.equal(result.recoveryTurn, 4);
});
