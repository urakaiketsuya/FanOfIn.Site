import { test } from "node:test";
import assert from "node:assert/strict";
import type { ArchetypeData, CardStatsData } from "@gatcg/shared";
import { buildSnapshot, snapshotSql } from "./snapshot.js";
const cards: CardStatsData = { generatedAt: "2026-09-23T00:00:00Z", decksConsidered: 10, byCategory: {}, cards: [{ name: "Hero's Card", slug: "heros-card", deckCount: 1, eventCount: 1, totalCopies: 2, avgWinRate: 0.5, adjustedWinRate: 0.5, recentDeckCount: 1, priorDeckCount: 0, marketPrice: null }] };
const archetypes = { generatedAt: cards.generatedAt, archetypes: [{ signature: "Hero", classes: ["WARRIOR"], elements: ["FIRE"], deckCount: 1, eventCount: 1, avgWinRate: 0.5, topCards: { sideboard: [{ name: "Private implementation detail" }] } }] } as unknown as ArchetypeData;
test("public projection excludes internal fields and preserves aggregate values", () => {
  const snapshot = buildSnapshot(cards, archetypes);
  assert.equal(snapshot.entries.length, 2);
  assert.equal(JSON.parse(snapshot.entries.find(e => e.kind === "cards")!.body).avgWinRate, 0.5);
  assert.ok(!snapshot.entries.find(e => e.kind === "archetypes")!.body.includes("sideboard"));
  assert.deepEqual(snapshot, buildSnapshot(cards, archetypes));
  const changed = buildSnapshot({ ...cards, generatedAt: "2026-09-24T00:00:00Z" }, archetypes);
  assert.notEqual(changed.metadata.datasetVersion, snapshot.metadata.datasetVersion);
  assert.equal(changed.entries[1]!.hash, snapshot.entries[1]!.hash);
});
test("invalid snapshots fail before writes and SQL escapes apostrophes", () => {
  assert.throws(() => buildSnapshot({ ...cards, cards: [] }, archetypes), /empty/);
  assert.throws(() => buildSnapshot({ ...cards, cards: [...cards.cards, ...cards.cards] }, archetypes), /Duplicate/);
  assert.throws(() => buildSnapshot({ ...cards, generatedAt: "bad" }, archetypes), /timestamp/);
  const sql = snapshotSql(buildSnapshot(cards, archetypes));
  assert.ok(sql.includes("Hero''s Card"));
  assert.ok(sql.includes("ON CONFLICT DO NOTHING"));
  assert.ok(sql.lastIndexOf("INSERT INTO api_active") > sql.lastIndexOf("INSERT INTO api_entries"));
});

test("publication is resumable, reuses payloads, and cleanup preserves active data", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFileSync } = await import("node:fs");
  const { cleanupSql } = await import("./snapshot.js");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    db.exec(readFileSync(new URL("../../../api-worker/migrations/0001_public_api.sql", import.meta.url), "utf8"));
    const old = buildSnapshot(cards, archetypes);
    db.exec(snapshotSql(old));
    const next = buildSnapshot({ ...cards, generatedAt: "2026-09-24T00:00:00Z", cards: [...cards.cards, { ...cards.cards[0]!, name: "New", slug: "new" }] }, archetypes);
    const sql = snapshotSql(next);
    const split = sql.lastIndexOf("INSERT INTO api_active");
    // Interrupt staging before the final entry exists.
    const staging = sql.slice(0, split);
    const lastEntry = staging.lastIndexOf("INSERT INTO api_entries");
    db.exec(staging.slice(0, lastEntry));
    db.exec(sql.slice(split));
    assert.equal(db.prepare("SELECT version FROM api_active").get()!.version, old.metadata.datasetVersion);
    db.exec(sql);
    assert.equal(db.prepare("SELECT version FROM api_active").get()!.version, next.metadata.datasetVersion);
    assert.equal(db.prepare("SELECT count(*) AS n FROM api_payloads").get()!.n, 3);
    db.exec(sql);
    assert.equal(db.prepare("SELECT count(*) AS n FROM api_payloads").get()!.n, 3);
    db.exec(cleanupSql);
    assert.equal(db.prepare("SELECT count(*) AS n FROM api_snapshots").get()!.n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM api_entries").get()!.n, 3);
    assert.equal(db.prepare("SELECT count(*) AS n FROM api_payloads").get()!.n, 3);
  } finally { db.close(); }
});
