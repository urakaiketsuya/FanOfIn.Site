import assert from "node:assert/strict";
import test from "node:test";
import { playtestDeckFingerprint, summarizePlaytests, type PlaytestRecord } from "../src/lib/playtestTracker";

const records: PlaytestRecord[] = [
  { id: "1", playedAt: "2026-01-01", opponent: "A", result: "win", order: "first", onlineTurn: 3, reachedWinCondition: true, bottleneck: "", notes: "" },
  { id: "2", playedAt: "2026-01-02", opponent: "B", result: "loss", order: "second", onlineTurn: 5, reachedWinCondition: false, bottleneck: "Setup", notes: "" },
  { id: "3", playedAt: "2026-01-03", opponent: "C", result: "draw", order: "first", onlineTurn: null, reachedWinCondition: true, bottleneck: "Setup", notes: "" },
];
test("playtest summary separates observed outcomes", () => {
  const summary = summarizePlaytests(records);
  assert.equal(summary.winRate, 0.5); assert.equal(summary.firstWinRate, 0.75); assert.equal(summary.secondWinRate, 0);
  assert.equal(summary.averageOnlineTurn, 4); assert.equal(summary.topBottlenecks[0].games, 2);
});
test("deck fingerprint ignores line ordering", () => {
  const a = playtestDeckFingerprint("Rai", [{ name: "A", quantity: 4 }, { name: "B", quantity: 2 }]);
  const b = playtestDeckFingerprint("Rai", [{ name: "B", quantity: 2 }, { name: "A", quantity: 4 }]);
  assert.equal(a, b);
});
