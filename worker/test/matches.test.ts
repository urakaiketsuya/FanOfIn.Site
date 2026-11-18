import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import handler from "../src/index";
import { matchSubmissionV1Schema } from "../src/match-schema";
import type { Env } from "../src/storage";
import fixture from "./fixtures/match-submission-v1.json";
const worker = (exports as unknown as { default: Fetcher }).default;
const db = (env as unknown as Env).MATCH_DB;
function payload(id: string) { return { ...structuredClone(fixture), submissionId: id, source: { matchId: id } }; }
function request(body: unknown, key = "a".repeat(32)) {
  return new Request("https://worker.test/v1/grand-archive/matches", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
describe("match and deck ingestion", () => {
  it("stores snapshots and results; normalizes order on retry; isolates sources", async () => {
    const m = payload("stored");
    expect((await worker.fetch(request(m))).status).toBe(201);
    const decks = await db.prepare("SELECT * FROM submitted_match_decks d JOIN submitted_matches m ON m.id=d.match_id WHERE m.submission_id='stored'").all();
    expect(decks.results).toHaveLength(2);
    expect(JSON.parse(decks.results[0].sections_json as string)).toEqual(m.players[0].deck.sections);
    m.players.reverse();
    m.players.forEach(p => p.deck.sections.main.reverse());
    expect((await worker.fetch(request(m))).status).toBe(200);
    expect((await worker.fetch(request(m, "b".repeat(32)))).status).toBe(201);
    m.games[0].turns++;
    expect((await worker.fetch(request(m))).status).toBe(409);
    m.submissionId = "new-id-same-match";
    expect((await worker.fetch(request(m))).status).toBe(409);
  });
  it("handles simultaneous identical and conflicting writes", async () => {
    const m = payload("race");
    expect((await Promise.all([worker.fetch(request(m)), worker.fetch(request(m))])).map(r => r.status).sort()).toEqual([200, 201]);
    const a = payload("race-conflict"), b = payload("race-conflict");
    b.games[0].turns++;
    expect((await Promise.all([worker.fetch(request(a)), worker.fetch(request(b))])).map(r => r.status).sort()).toEqual([201, 409]);
  });
  it("rolls back all rows on a child failure, then permits a retry", async () => {
    await db.exec("CREATE TRIGGER fail_match_game BEFORE INSERT ON submitted_match_games BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    try {
      expect((await worker.fetch(request(payload("rollback")))).status).toBe(500);
      expect(await db.prepare("SELECT id FROM submitted_matches WHERE submission_id='rollback'").first()).toBeNull();
    } finally { await db.exec("DROP TRIGGER fail_match_game"); }
    expect((await worker.fetch(request(payload("rollback")))).status).toBe(201);
  });
  it("fails closed for absent, malformed, duplicate, and legacy credentials", async () => {
    expect((await worker.fetch(request(fixture, "worker-test-key"))).status).toBe(401);
    for (const config of [undefined, "bad-json", "{}", JSON.stringify({ a: "a".repeat(32), b: "a".repeat(32) })]) {
      expect((await handler.fetch(request(fixture), { MATCH_DB: db, INGESTION_API_KEY: "legacy", MATCH_INGESTION_KEYS: config })).status).toBe(401);
    }
  });
  it("rejects malformed bodies and unsupported fields without persistence", async () => {
    const bad = payload("invalid");
    bad.result.wins["1"] = 0;
    expect((await worker.fetch(request(bad))).status).toBe(422);
    expect(await db.prepare("SELECT id FROM submitted_matches WHERE submission_id='invalid'").first()).toBeNull();
    const malformed = request(fixture); 
    expect((await worker.fetch(new Request(malformed, { body: "{" }))).status).toBe(400);
    expect((await worker.fetch(new Request(request(fixture), { body: " ".repeat(1048577) }))).status).toBe(413);
    expect((await worker.fetch(new Request(request(fixture), { headers: { Authorization: `Bearer ${"a".repeat(32)}`, "Content-Type": "text/plain" } }))).status).toBe(400);
  });
  it("validates series, deck lines, seats, URLs, and dates", () => {
    const mutate: Array<(m: any) => void> = [
      m => m.players[1].seat = 1,
      m => m.players[0].deck.sections.main[0].quantity = 0,
      m => m.players[0].deck.sections.main.push(m.players[0].deck.sections.main[0]),
      m => m.players[0].deck.url = "javascript:alert(1)",
      m => m.players[0].deck.sections.material = [],
      m => m.games[0].gameNumber = 2,
      m => m.games[0].winnerSeat = null,
      m => m.result.winnerSeat = 2,
      m => m.bestOf = 3,
      m => { m.startedAt = "2026-11-18T20:00:00Z"; m.completedAt = "2026-11-18T19:00:00Z"; },
      m => m.source.application = "spoof",
    ];
    for (const change of mutate) { const m = structuredClone(fixture); change(m); expect(matchSubmissionV1Schema.safeParse(m).success).toBe(false); }
    const draw = structuredClone(fixture) as any;
    draw.games[0].outcome = draw.result.outcome = "draw";
    draw.games[0].winnerSeat = draw.result.winnerSeat = null;
    draw.result.wins["1"] = 0;
    expect(matchSubmissionV1Schema.safeParse(draw).success).toBe(true);
    const bo3 = structuredClone(fixture) as any;
    bo3.bestOf = 3; bo3.games.push({ ...bo3.games[0], gameNumber: 2 }); bo3.result.wins["1"] = 2;
    expect(matchSubmissionV1Schema.safeParse(bo3).success).toBe(true);
    bo3.games.push({ ...bo3.games[0], gameNumber: 3 }); bo3.result.wins["1"] = 3;
    expect(matchSubmissionV1Schema.safeParse(bo3).success).toBe(false);
  });
});
