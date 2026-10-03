import { test } from "node:test";
import assert from "node:assert/strict";
import type { OmnidexPlayer } from "@gatcg/shared";
import { eventIdentity } from "./eventIdentity.js";
const player = (id: number, finalPlacement: number | null) => ({ id, username: `Player ${id}`, finalPlacement }) as OmnidexPlayer;
const champions = new Map([[1, { championName: "Lorraine" }], [2, { championName: "Rai" }]]);
test("event identity follows final placement regardless of player order", () => {
  assert.deepEqual(eventIdentity([player(2, 2), player(1, 1)], champions), { championName: "Lorraine", playerName: "Player 1", placement: 1 });
});
test("missing top list, unknown placement, or tied leaders use no identity", () => {
  assert.equal(eventIdentity([player(3, 1), player(2, 2)], champions), null);
  assert.equal(eventIdentity([player(1, null)], champions), null);
  assert.equal(eventIdentity([player(1, 1), player(2, 1)], champions), null);
  assert.equal(eventIdentity([player(1, 1)], new Map()), null);
});
