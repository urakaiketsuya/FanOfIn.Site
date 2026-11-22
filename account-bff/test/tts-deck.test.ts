import assert from "node:assert/strict";
import test from "node:test";
import type { Card, PublicDeck } from "../../shared/src/index.ts";
import { buildTtsDeck, resolveCard } from "../lib/tts-deck.ts";

const slug = "a".repeat(32);
const catalog = [
  { name: "Alpha", uuid: "card-a", editions: [{ uuid: "ed-a1", image: "/cards/images/ed-a1.jpg" }, { uuid: "ed-a2", image: "/cards/images/ed-a2.jpg" }] },
  { name: "Alphabet", uuid: "card-x", editions: [{ uuid: "ed-x", image: "/cards/images/ed-x.jpg" }] },
  { name: "Flip", uuid: "card-f", editions: [{ uuid: "ed-f", image: "/cards/images/ed-f.jpg", is_default: true, other_orientations: [{ edition: { image: "/cards/images/ed-fb.jpg" } }] }] },
  { name: "Evil", uuid: "card-e", editions: [{ uuid: "ed-e", image: "https://evil.example/x.jpg" }] },
] as unknown as Card[];
const deck = {
  publicSlug: slug, visibility: "public", title: "Test", description: "", owner: { displayName: "Avery", profileSlug: "b".repeat(24) },
  championName: null, format: "STANDARD", versionNumber: 1, publishedAt: "2026-11-22T00:00:00Z",
  decklist: {
    main: [{ card: "Alpha", quantity: 3, printings: [{ editionUuid: "ed-a2", quantity: 1 }] }, { card: "Missing", quantity: 2 }, { card: "Evil", quantity: 1 }, { card: "Flip", quantity: 1 }],
    material: [], sideboard: [{ card: "Alpha", quantity: 0 }],
  },
} as unknown as PublicDeck;

test("resolveCard accepts exact names only and rejects non-catalog image paths", () => {
  assert.equal(resolveCard("alpha", catalog)?.cardId, "card-a");
  assert.equal(resolveCard("Alph", catalog), undefined);
  assert.equal(resolveCard("Evil", catalog), undefined);
});

test("buildTtsDeck keeps chosen printings, falls back safely and skips empty lines", async () => {
  const urls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ data: catalog }));
  };
  const result = await buildTtsDeck(deck, fetcher as typeof fetch);
  assert.equal(urls.length, 4);
  assert.deepEqual(result.main, [
    { name: "Alpha", quantity: 1, imageUrl: "https://api.gatcg.com/cards/images/ed-a2.jpg", backImageUrl: null, cardId: "card-a" },
    { name: "Alpha", quantity: 2, imageUrl: "https://api.gatcg.com/cards/images/ed-a1.jpg", backImageUrl: null, cardId: "card-a" },
    { name: "Missing", quantity: 2, imageUrl: null, backImageUrl: null, cardId: null },
    { name: "Evil", quantity: 1, imageUrl: null, backImageUrl: null, cardId: null },
    { name: "Flip", quantity: 1, imageUrl: "https://api.gatcg.com/cards/images/ed-f.jpg", backImageUrl: "https://api.gatcg.com/cards/images/ed-fb.jpg", cardId: "card-f" },
  ]);
  assert.deepEqual(result.sideboard, []);
});

test("a failing card lookup gives a null image, not an error", async () => {
  const result = await buildTtsDeck(deck, (async () => { throw new Error("down"); }) as typeof fetch);
  assert.equal(result.main[0]!.imageUrl, null);
  assert.equal(result.main.reduce((sum, line) => sum + line.quantity, 0), 7);
});
