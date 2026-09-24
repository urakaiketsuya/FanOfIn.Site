import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, expect, test } from "vitest";
import worker from "../src/index";

const db = (env as unknown as { PUBLIC_DB: D1Database }).PUBLIC_DB;
let sequence = 0;
async function request(path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://test-${sequence}.example${path}`, init), { PUBLIC_DB: db }, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}
const version = "a".repeat(64);
beforeEach(async () => {
  sequence++;
  await db.batch(["DELETE FROM api_active", "DELETE FROM api_entries", "DELETE FROM api_snapshots", "DELETE FROM api_payloads"].map(sql => db.prepare(sql)));
  const metadata = { apiVersion: "v1", datasetVersion: version, sources: { cards: "2026-09-23", archetypes: "2026-09-23" }, counts: { cards: 2, archetypes: 1 }, scope: "published-omnidex-analysis", decksConsidered: 10, cardsWithoutSlug: 0 };
  await db.batch([
    db.prepare("INSERT INTO api_snapshots VALUES (?, ?)").bind(version, JSON.stringify(metadata)),
    db.prepare("INSERT INTO api_active VALUES (1, ?)").bind(version),
    ...["alpha", "beta"].flatMap(id => [
      db.prepare("INSERT INTO api_payloads VALUES (?, ?)").bind(id, JSON.stringify({ slug: id, deckCount: 10 })),
      db.prepare("INSERT INTO api_entries VALUES (?, 'cards', ?, ?)").bind(version, id, id),
    ]),
    db.prepare("INSERT INTO api_payloads VALUES ('champion', ?)").bind(JSON.stringify({ signature: "Champion" })),
    db.prepare("INSERT INTO api_entries VALUES (?, 'archetypes', 'Champion', 'champion')").bind(version),
  ]);
});

test("metadata and card lookup include the dataset version and support conditional requests", async () => {
  const meta = await request("/v1/meta");
  expect((await meta.json() as any).data.datasetVersion).toBe(version);
  const card = await request("/v1/cards/alpha/stats");
  expect(card.status).toBe(200);
  expect(card.headers.get("Access-Control-Allow-Origin")).toBe("*");
  expect((await card.json() as any).data.slug).toBe("alpha");
  const unchanged = await request("/v1/cards/alpha/stats", { headers: { "If-None-Match": card.headers.get("ETag")! } });
  expect(unchanged.status).toBe(304);
  expect(await unchanged.text()).toBe("");
  expect((await request("/v1/cards/missing/stats")).status).toBe(404);
});

test("keyset pagination has no overlap and rejects cross-resource and stale cursors", async () => {
  const first = await (await request("/v1/cards?limit=1")).json() as any;
  expect(first.data.map((row: any) => row.slug)).toEqual(["alpha"]);
  const query = new URLSearchParams({ limit: "1", cursor: first.nextCursor });
  const second = await (await request(`/v1/cards?${query}`)).json() as any;
  expect(second.data.map((row: any) => row.slug)).toEqual(["beta"]);
  expect(second.nextCursor).toBeNull();
  expect((await request(`/v1/archetypes?${query}`)).status).toBe(400);
  await db.prepare("UPDATE api_snapshots SET metadata=json_set(metadata, '$.datasetVersion', ?) WHERE version=?").bind("b".repeat(64), version).run();
  sequence++; // bypass the documented 60-second response cache
  expect((await request(`/v1/cards?${query}`)).status).toBe(409);
});

test("bounds, methods, CORS, HEAD and unsupported filters", async () => {
  for (const suffix of ["limit=0", "limit=101", "limit=2.5", "limit=1&limit=2", "format=STANDARD", "cursor=garbage"]) {
    expect((await request(`/v1/cards?${suffix}`)).status).toBe(400);
  }
  expect((await request("/v1/meta?limit=1")).status).toBe(400);
  expect((await request("/v1/cards", { method: "POST" })).status).toBe(405);
  expect((await request("/v1/cards", { method: "OPTIONS" })).status).toBe(204);
  expect(await (await request("/v1/cards", { method: "HEAD" })).text()).toBe("");
  expect((await (await request("/v1/archetypes")).json() as any).data[0].signature).toBe("Champion");
  expect((await request("/openapi.json")).status).toBe(200);
});

test("unpublished datasets fail closed without leaking database details", async () => {
  await db.prepare("DELETE FROM api_active").run();
  const response = await request("/v1/meta");
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

test("lookup and pagination use the composite primary key", async () => {
  const result = await db.prepare("EXPLAIN QUERY PLAN SELECT id FROM api_entries WHERE version=? AND kind=? AND id>? ORDER BY id LIMIT 51").bind(version, "cards", "").all();
  expect(JSON.stringify(result.results)).toContain("PRIMARY KEY");
  expect(JSON.stringify(result.results)).not.toContain("SCAN api_entries");
});

test("database failures return a retryable response without exposing internals", async () => {
  const ctx = createExecutionContext();
  const unavailable = { prepare() { throw new Error("secret SQL or quota details"); } } as unknown as D1Database;
  const response = await worker.fetch(new Request(`https://failure-${sequence}.example/v1/meta`), { PUBLIC_DB: unavailable }, ctx);
  await waitOnExecutionContext(ctx);
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(await response.text()).not.toContain("secret SQL");
});
