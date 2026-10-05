import assert from "node:assert/strict";
import test from "node:test";
import { parseMatchLogRecord } from "../src/match-log";

const base = {
  version: 1 as const,
  id: "clarent:match-7:1:seat1",
  playedAt: "2026-09-20T12:00:00.000Z",
  result: "win" as const,
  order: "first" as const,
  turns: 8,
  mulligans: null,
  opponent: "Bob",
  deckLabel: "Alice",
  sideboardPlan: "",
  gamePlanTurn: null,
  notableCards: [],
  bottlenecks: [],
  notes: "",
  provenance: { kind: "clarent" as const, schemaVersion: 1 as const, submissionId: "match-7:1", matchId: "match-7", gameNumber: 1, importedAt: "2026-09-20T12:01:00.000Z", sourceVersion: "1.2.3", playerSeat: 1 as const, playerChampionId: "champ-a", opponentChampionId: "champ-b", cardIds: ["raw-id"], rawDeckInput: "Main\n4x Dungeon Guide" },
};

test("account validation retains complete Clarent provenance", () => {
  assert.deepEqual(parseMatchLogRecord(base), base);
});

test("account validation reserves Clarent IDs for matching imported provenance", () => {
  assert.throws(() => parseMatchLogRecord({ ...base, provenance: { kind: "manual", enteredAt: base.playedAt } }), /Manual records cannot use/);
  assert.throws(() => parseMatchLogRecord({ ...base, id: "clarent:different:1:seat1" }), /Invalid Clarent provenance/);
});

for (const [field, value] of Object.entries({ result: ["win"], order: ["first"], notableCards: undefined, bottlenecks: "bad", notes: 1, turns: -1, mulligans: 1.5, gamePlanTurn: Infinity, opponent: {}, sideboardPlan: "x".repeat(2001) })) {
  test(`rejects invalid ${field}`, () => assert.throws(() => parseMatchLogRecord({ ...base, [field]: value })));
}
test("rejects malformed nested provenance and strips unknown fields", () => {
  for (const patch of [{ playerSeat: 3 }, { cardIds: [null] }, { cardIdMappings: { a: 2 } }, { rawDeckInput: {} }, { deckMapping: { method: "random", savedDeckId: "a" } }]) {
    assert.throws(() => parseMatchLogRecord({ ...base, provenance: { ...base.provenance, ...patch } }));
  }
  assert.deepEqual(parseMatchLogRecord({ ...base, unexpected: "ignored" }), base);
});
test("validates user prose with the shared content policy", () => {
  assert.throws(() => parseMatchLogRecord({ ...base, notes: "f.u.c.k" }));
  assert.equal(parseMatchLogRecord({ ...base, notes: "  Testing plan  " }).notes, "Testing plan");
});
