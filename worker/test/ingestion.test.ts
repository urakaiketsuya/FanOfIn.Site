import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/game-submission-v1.json";

const testEnv = env as unknown as {
  MATCH_DB: D1Database;
};
const worker = (exports as unknown as { default: Fetcher }).default;

function submissionRequest(payload: unknown, secret = "worker-test-key"): Request {
  return new Request("https://worker.test/v1/grand-archive/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("match ingestion Worker", () => {
  it("retains raw JSON, indexes, deduplicates, and rejects conflicting content", async () => {
    const created = await worker.fetch(submissionRequest(fixture));
    expect(created.status).toBe(201);
    expect((await created.json()) as { outcome: string }).toMatchObject({ outcome: "created" });

    const indexed = await testEnv.MATCH_DB.prepare(
      "SELECT checksum_sha256, raw_payload_json, raw_payload_expires_at FROM game_submissions WHERE submission_id = ?",
    ).bind(fixture.submissionId).first<{
      checksum_sha256: string;
      raw_payload_json: string;
      raw_payload_expires_at: string;
    }>();
    expect(indexed?.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(indexed!.raw_payload_json)).toMatchObject({ submissionId: fixture.submissionId });
    expect(Date.parse(indexed!.raw_payload_expires_at) - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1_000);

    const duplicate = await worker.fetch(submissionRequest(fixture));
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()) as { outcome: string }).toMatchObject({ outcome: "duplicate" });

    const changed = structuredClone(fixture);
    changed.players["1"].endHp--;
    const conflict = await worker.fetch(submissionRequest(changed));
    expect(conflict.status).toBe(409);

    const summary = await worker.fetch("https://worker.test/v1/grand-archive/analytics/summary");
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({
      schemaVersion: 1,
      source: "GrandArchiveSim",
      games: 1,
      firstPlayer: { games: 1, wins: 0, winRate: 0 },
    });
  });

  it("rejects invalid credentials before processing the payload", async () => {
    const before = await testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_submissions").first<{ count: number }>();
    const response = await worker.fetch(submissionRequest(fixture, "wrong-key"));
    expect(response.status).toBe(401);
    const after = await testEnv.MATCH_DB.prepare("SELECT COUNT(*) AS count FROM game_submissions").first<{ count: number }>();
    expect(after?.count).toBe(before?.count);
  });
});
