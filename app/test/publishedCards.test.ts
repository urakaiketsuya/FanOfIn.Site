import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { cardLegalityStatus } from "@gatcg/shared";
import { publishedCardUpdates } from "../src/lib/sync/publishedCards";
const card = (name: string, legality: Card["legality"], last_update = "2026-10-16T12:00:00Z") => ({ name, legality, last_update } as Card);
test("published snapshots repair cached prerelease bans without timestamp changes", () => {
  const legal = card("Verte, Ace of Clubs", null);
  const banned = card("Grim Pastiche", { STANDARD: { limit: 0 } });
  const updates = publishedCardUpdates([legal, banned], [card(legal.name, { STANDARD: { limit: 0 } }), card(banned.name, null)]);
  assert.equal(cardLegalityStatus(updates[0], "STANDARD"), "allowed");
  assert.equal(cardLegalityStatus(updates[1], "STANDARD"), "banned");
});
test("published snapshots add missing cards and preserve newer API records", () => {
  const old = card("Misty, the Joker", null);
  assert.deepEqual(publishedCardUpdates([old], [undefined]), [old]);
  assert.deepEqual(publishedCardUpdates([old], [card(old.name, null, "2026-10-20T12:00:00Z")]), []);
});
