import assert from "node:assert/strict";
import test from "node:test";
import { addImportedMatches, applyClarentCardMappings, applyClarentDeckMappings, loadMatchLog, mergeMatchLogs, previewClarentImport, resolveClarentMappings, summarizeMatchLog, summarizeMatchLogGroups, type MatchLogRecord } from "../src/lib/matchLog";

const submission = {
  schemaVersion: 1, submissionId: "match-7:1", submittedAt: "2026-09-20T12:00:00.000Z",
  source: { application: "TCGEngine", game: "GrandArchiveSim", version: "1.2.3" },
  matchId: "match-7", gameNumber: 1, winner: 2, firstPlayer: 1, turns: 8,
  players: {
    "1": { championId: "champ-a", championName: "Alice", deckLink: "Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water", cardStats: { known: {}, mystery: {} } },
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

test("Clarent mapping resolves exact card IDs and an exact saved deck without losing raw input", () => {
  const parsed = previewClarentImport(JSON.stringify(submission), 1, [], new Set());
  const cards = [{ uuid: "known", name: "Dungeon Guide" }, { uuid: "spirit", name: "Spirit of Water" }];
  const savedDecks = [{ id: "deck-1", title: "Water list", decklist: { main: [{ card: "Dungeon Guide", quantity: 4 }], material: [{ card: "Spirit of Water", quantity: 1 }], sideboard: [] } }];
  const [mapped] = resolveClarentMappings(parsed.previews, savedDecks as never, cards);
  assert.equal(mapped.deckMapping, "exact");
  assert.equal(mapped.record.savedDeckId, "deck-1");
  assert.deepEqual(mapped.record.notableCards, ["Dungeon Guide"]);
  assert.equal(mapped.record.provenance.kind, "clarent");
  if (mapped.record.provenance.kind === "clarent") {
    assert.match(mapped.record.provenance.rawDeckInput ?? "", /Dungeon Guide/);
    assert.deepEqual(mapped.record.provenance.deckMapping, { savedDeckId: "deck-1", method: "exact" });
  }
});

test("ambiguous card and deck mappings stay visible until explicitly corrected", () => {
  const parsed = previewClarentImport(JSON.stringify({ ...submission, players: { ...submission.players, "1": { ...submission.players["1"], cardStats: { "Dungeon Guide": {} } } } }), 1, []);
  const cards = [{ uuid: "printing-a", name: "Dungeon Guide" }, { uuid: "printing-b", name: "Dungeon Guide" }];
  const decklist = { main: [{ card: "Dungeon Guide", quantity: 4 }], material: [{ card: "Spirit of Water", quantity: 1 }], sideboard: [] };
  const decks = [{ id: "deck-a", title: "A", decklist }, { id: "deck-b", title: "B", decklist }];
  const [ambiguous] = resolveClarentMappings(parsed.previews, decks as never, cards);
  assert.equal(ambiguous.deckMapping, "ambiguous");
  assert.equal(ambiguous.deckCandidates.length, 2);
  assert.deepEqual(ambiguous.ambiguousCardIds["Dungeon Guide"].map((card) => card.name), ["printing-a", "printing-b"]);
  const [corrected] = applyClarentDeckMappings(applyClarentCardMappings([ambiguous], { "Dungeon Guide": cards[1] }), { [ambiguous.record.id]: { id: "deck-b", title: "B" } });
  assert.equal(corrected.record.savedDeckId, "deck-b");
  assert.deepEqual(corrected.unresolvedCardIds, []);
  assert.deepEqual(corrected.ambiguousCardIds, {});
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

test("Clarent mappings preserve the correction and make the card useful in the log", () => {
  const result = previewClarentImport(JSON.stringify(submission), 1, [], new Set(["known"]));
  const [mapped] = applyClarentCardMappings(result.previews, { mystery: { uuid: "canonical-id", name: "Dungeon Guide" } });
  assert.deepEqual(mapped.unresolvedCardIds, []);
  assert.deepEqual(mapped.record.notableCards, ["Dungeon Guide"]);
  assert.equal(mapped.record.provenance.kind, "clarent");
  if (mapped.record.provenance.kind === "clarent") assert.deepEqual(mapped.record.provenance.cardIdMappings, { mystery: "canonical-id" });
});

test("match summaries label small samples without overstating confidence", () => {
  const record = previewClarentImport(JSON.stringify(submission), 2, []).previews[0].record;
  assert.equal(summarizeMatchLog([]).confidence, "none");
  assert.equal(summarizeMatchLog([record]).confidence, "early");
  assert.equal(summarizeMatchLog(Array.from({ length: 5 }, () => record)).confidence, "developing");
  assert.equal(summarizeMatchLog(Array.from({ length: 15 }, () => record)).confidence, "useful");
  assert.equal(summarizeMatchLog([record]).matchPointRate, 1);
});

test("account records win when device and account logs share an id", () => {
  const local = previewClarentImport(JSON.stringify(submission), 1, []).previews[0].record;
  const account = { ...local, opponent: "Corrected opponent" };
  const extra: MatchLogRecord = { ...local, id: "manual-extra", playedAt: "2026-09-21T00:00:00.000Z", provenance: { kind: "manual", enteredAt: "2026-09-21T00:00:00.000Z" } };
  const merged = mergeMatchLogs([local, extra], [account]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((record) => record.id === local.id)?.opponent, "Corrected opponent");
  assert.equal(merged[0].id, "manual-extra");
});

test("match groups summarize opponents without inventing empty labels", () => {
  const base = previewClarentImport(JSON.stringify(submission), 2, []).previews[0].record;
  const groups = summarizeMatchLogGroups([base, { ...base, id: "second", result: "loss" }, { ...base, id: "empty", opponent: "" }], "opponent");
  assert.deepEqual(groups, [{ label: "Alice", games: 2, wins: 1, matchPointRate: 0.5 }]);
});
