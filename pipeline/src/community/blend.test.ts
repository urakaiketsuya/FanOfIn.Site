import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type { SleevedDeck } from "@gatcg/shared";
import { MANIFEST_ENTRIES } from "../manifest.js";
import { listPublishedSleevedDecks, type CachedSleevedDeckRecord } from "../sleeved/cache.js";
import { isRetryableSleevedStatus } from "../sleeved/client.js";
import { chooseSleevedRecords, writeGeneratedJsonIfChanged } from "./blend.js";

function record(id: string): CachedSleevedDeckRecord {
  return { id, deck: null };
}

function deck(id: string): SleevedDeck {
  return {
    id,
    url: `https://sleeved.gg/decks/${id}`,
    title: "Test deck",
    author: "Sleeved player",
    champion: "Lorraine",
    priceLow: null,
    materialCount: 1,
    mainCount: 60,
    sideCount: 0,
    fetchedAt: "2026-01-01T00:00:00Z",
    format: "STANDARD",
    formatConfidence: "inferred",
    materialDeck: [],
    mainDeck: [],
    sideDeck: [],
    extraDeck: [],
  };
}

describe("community blend safeguards", () => {
  it("uses committed Sleeved records only when the cache is empty", () => {
    const cached = [record("cached")];
    const published = [record("published")];
    assert.equal(chooseSleevedRecords(cached, published), cached);
    assert.equal(chooseSleevedRecords([], published), published);
  });

  it("loads committed Sleeved deck files as cache-shaped records", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "foi-sleeved-"));
    try {
      await writeFile(path.join(dir, "one.json"), JSON.stringify(deck("one")), "utf-8");
      await writeFile(path.join(dir, "broken.json"), "not json", "utf-8");
      const records = await listPublishedSleevedDecks(dir);
      assert.deepEqual(records.map((entry) => entry.id), ["one"]);
      assert.equal(records[0].deck?.title, "Test deck");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not rewrite output when only generatedAt changed", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "foi-community-"));
    const file = path.join(dir, "output.json");
    try {
      await writeFile(file, JSON.stringify({ generatedAt: "old", value: 1 }), "utf-8");
      assert.equal(await writeGeneratedJsonIfChanged(file, { generatedAt: "new", value: 1 }), false);
      assert.deepEqual(JSON.parse(await readFile(file, "utf-8")), { generatedAt: "old", value: 1 });
      assert.equal(await writeGeneratedJsonIfChanged(file, { generatedAt: "new", value: 2 }), true);
      assert.deepEqual(JSON.parse(await readFile(file, "utf-8")), { generatedAt: "new", value: 2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("registers every app-facing blended dataset in the manifest", () => {
    const keys = new Set(MANIFEST_ENTRIES.map((entry) => entry.key));
    for (const key of [
      "community-source-counts",
      "community-blended-deck-references",
      "community-blended-card-inclusion-STANDARD",
      "community-blended-card-inclusion-PANTHEON",
      "community-blended-co-occurrence-STANDARD",
      "community-blended-co-occurrence-PANTHEON",
    ]) assert.equal(keys.has(key), true, key);
  });

  it("retries only rate limits and server errors", () => {
    assert.equal(isRetryableSleevedStatus(429), true);
    assert.equal(isRetryableSleevedStatus(500), true);
    assert.equal(isRetryableSleevedStatus(503), true);
    assert.equal(isRetryableSleevedStatus(400), false);
    assert.equal(isRetryableSleevedStatus(401), false);
    assert.equal(isRetryableSleevedStatus(404), false);
  });
});
