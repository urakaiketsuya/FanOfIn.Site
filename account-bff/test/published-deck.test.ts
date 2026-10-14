import assert from "node:assert/strict";
import test from "node:test";
import { readPublishedDeck } from "../lib/published-deck.ts";

const slug = "a".repeat(32);
const deck = { publicSlug: slug, visibility: "public", title: "Deck", description: "", owner: { displayName: "Player" }, publishedAt: "2026-10-14", decklist: { main: [{ card: "Card", quantity: 1 }], material: [], sideboard: [] } };
const options = { workerUrl: "https://worker.example/", secret: "test-only" };

test("live reads reflect withdrawal and republishing without retaining snapshots", async () => {
  let status = 200;
  let calls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), `https://worker.example/v1/decklists/${slug}`);
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("cookie"), null);
    return Response.json({ deck }, { status });
  };
  for (const expected of [200, 404, 200]) {
    status = expected;
    assert.equal((await readPublishedDeck(slug, { ...options, fetcher })).status, expected);
  }
  assert.equal(calls, 3);
});

test("unlisted stays available; private and mismatched snapshots are hidden", async () => {
  for (const [changes, expected] of [[{ visibility: "unlisted" }, 200], [{ visibility: "private" }, 404], [{ publicSlug: "b".repeat(32) }, 404]] as const) {
    const result = await readPublishedDeck(slug, { ...options, fetcher: async () => Response.json({ deck: { ...deck, ...changes } }) });
    assert.equal(result.status, expected);
    if (result.status === 200) assert.equal(result.deck.visibility, "unlisted");
  }
});

test("upstream failures and malformed data remain retryable, never false 404s", async () => {
  const responses = [new Response("offline", { status: 503 }), new Response("invalid json"), Response.json({}), Response.json({ deck: { ...deck, publishedAt: "" } }), Response.json({ deck: { ...deck, decklist: { ...deck.decklist, main: [{ card: "Card", quantity: -1 }] } } }), new Response("x", { headers: { "Content-Length": "1000001" } })];
  for (const response of responses) assert.equal((await readPublishedDeck(slug, { ...options, fetcher: async () => response })).status, 502);
  assert.equal((await readPublishedDeck(slug, { ...options, fetcher: async () => { throw Error("timeout"); } })).status, 502);
});

test("invalid routes and missing configuration do not contact the worker", async () => {
  const fetcher: typeof fetch = async () => { assert.fail("unexpected request"); };
  assert.equal((await readPublishedDeck("invalid", { ...options, fetcher })).status, 404);
  assert.equal((await readPublishedDeck(slug, { workerUrl: "", secret: "", fetcher })).status, 503);
});
