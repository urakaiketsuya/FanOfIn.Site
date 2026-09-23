import assert from "node:assert/strict";
import test from "node:test";
import { addImportedMatches, loadMatchLog, previewClarentImport, type MatchLogRecord } from "../src/lib/matchLog";

const submission = {
  schemaVersion: 1, submissionId: "match-7:1", submittedAt: "2026-09-20T12:00:00.000Z",
  source: { application: "TCGEngine", game: "GrandArchiveSim", version: "1.2.3" },
  matchId: "match-7", gameNumber: 1, winner: 2, firstPlayer: 1, turns: 8,
  players: {
    "1": { championId: "champ-a", championName: "Alice", cardStats: { known: {}, mystery: {} } },
    "2": { championId: "champ-b", championName: "Bob", cardStats: {} },
  },
};

test("Clarent preview preserves provenance and derives the selected seat result", () => {
  const result = previewClarentImport(JSON.stringify(submission), 2, [], new Set(["known"]));
  assert.deepEqual(result.errors, []);
  assert.equal(result.previews[0].record.result, "win");
  assert.equal(result.previews[0].record.order, "second");
  assert.equal(result.previews[0].record.deckLabel, "Bob");
  assert.equal(result.previews[0].record.opponent, "Alice");
  assert.equal(result.previews[0].record.provenance.kind, "clarent");
});

test("Clarent imports are idempotent without affecting manual records", () => {
  const first = previewClarentImport(JSON.stringify(submission), 1, [], new Set(["known"]));
  const manual: MatchLogRecord = { version: 1, id: "manual-1", playedAt: "2026-09-20T00:00:00.000Z", result: "draw", order: "unknown", turns: null, mulligans: null, opponent: "", deckLabel: "", sideboardPlan: "", gamePlanTurn: null, notableCards: [], bottlenecks: [], notes: "", provenance: { kind: "manual", enteredAt: "2026-09-20T00:00:00.000Z" } };
  const stored = addImportedMatches([manual], first.previews);
  const second = previewClarentImport(JSON.stringify(submission), 1, stored, new Set(["known"]));
  assert.equal(second.previews[0].duplicate, true);
  assert.deepEqual(addImportedMatches(stored, second.previews), stored);
  assert.equal(stored.some((record) => record.provenance.kind === "manual"), true);
});

test("Clarent preview surfaces unresolved card identifiers", () => {
  const result = previewClarentImport(JSON.stringify(submission), 1, [], new Set(["known"]));
  assert.deepEqual(result.previews[0].unresolvedCardIds, ["mystery"]);
});

test("malformed imports and storage fail safely", () => {
  assert.equal(previewClarentImport("not json", 1, []).errors.length, 1);
  assert.equal(previewClarentImport(JSON.stringify({ schemaVersion: 2 }), 1, []).errors.length, 1);
  assert.deepEqual(loadMatchLog("not json"), []);
});
