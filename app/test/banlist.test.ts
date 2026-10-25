import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { announcedBans, otherUnavailableCards } from "../src/features/cards/banlistData";

test("official bans exclude format-only catalog restrictions and include seasonal bans", () => {
  assert.equal(announcedBans("STANDARD").length, 17);
  assert.ok(announcedBans("STANDARD").includes("Baleful Oblation"));
  assert.deepEqual(announcedBans("PANTHEON"), []);
  const cards = [
    { name: "Baleful Oblation", legality: { STANDARD: { limit: 0 } } },
    { name: "Lesser Boon of Etherealys", legality: { STANDARD: { limit: 0 } } },
    { name: "Lesser Boon of Etherealys", legality: { STANDARD: { limit: 0 } } },
    { name: "Allowed", legality: null },
    { name: "Unknown" },
  ] as Card[];
  assert.deepEqual(otherUnavailableCards(cards, "STANDARD").map(card => card.name), ["Lesser Boon of Etherealys"]);
  assert.deepEqual(otherUnavailableCards(cards, "PANTHEON"), []);
});
