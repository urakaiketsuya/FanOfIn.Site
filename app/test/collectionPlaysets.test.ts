import assert from "node:assert/strict";
import { test } from "node:test";
import type { Card, CollectionEntry } from "@gatcg/shared";
import { completePlaysetLine, playsetProgress, playsetMilestone, playsetTarget } from "../src/features/collection/collectionPlaysets";
const card = { uuid: "a", name: "A" } as Card;
const entry = (ownedQuantity: number, proxyQuantity = 0, editionUuid?: string) => ({ cardUuid: "a", ownedQuantity, proxyQuantity, editionUuid }) as CollectionEntry;
test("quick completion tops up mixed physical printings and preserves proxies", () => {
 const entries = [entry(1, 3), entry(2, 4, "first-edition")];
 const before = JSON.stringify(entries);
 assert.deepEqual(completePlaysetLine(card, entries), { cardUuid: "a", cardName: "A", quantity: 2, proxyQuantity: 3 });
 assert.equal(JSON.stringify(entries), before);
 assert.equal(completePlaysetLine(card, [entry(6)]), null);
 assert.deepEqual(completePlaysetLine(card, [entry(2, 1, "edition")]), { cardUuid: "a", cardName: "A", quantity: 2, proxyQuantity: 0 });
});
test("empty and proxy-only collections need the entire target", () => {
 assert.equal(completePlaysetLine(card, [])?.quantity, 4);
 assert.equal(completePlaysetLine(card, [entry(0, 4)])?.quantity, 4);
});
test("surplus copies cannot complete other playsets and progress regresses", () => {
 const cards = [card, { uuid: "b" } as Card];
 assert.deepEqual(playsetProgress(cards, new Map([["a", 20],["b", 3]])), { complete: 1, total: 2, missingCopies: 1, percent: 50 });
 assert.equal(playsetProgress(cards, new Map([["a", 3]])).complete, 0);
 assert.equal(playsetProgress([], new Map()).percent, 0);
 assert.equal(playsetMilestone(0, 0), "Your first playset awaits");
 assert.equal(playsetMilestone(1, 8), "First playset complete");
 assert.equal(playsetMilestone(2, 8), "A quarter of playsets complete");
 assert.equal(playsetMilestone(4, 8), "Half the playsets complete");
 assert.equal(playsetMilestone(6, 8), "Three quarters of playsets complete");
 assert.equal(playsetMilestone(8, 8), "Every playset complete!");
});

test("memory costs, including zero, need one copy; reserve cards need four", () => {
 assert.equal(playsetTarget({ ...card, cost_memory: 0 }), 1);
 assert.equal(playsetTarget({ ...card, cost_memory: 3 }), 1);
 assert.equal(playsetTarget({ ...card, cost: { type: "memory", value: "0" } }), 1);
 assert.equal(playsetTarget({ ...card, cost_memory: null, cost_reserve: 0 }), 4);
 assert.equal(completePlaysetLine({ ...card, cost_memory: 0 }, [])?.quantity, 1);
 assert.equal(completePlaysetLine({ ...card, cost_memory: 0 }, [entry(1)]), null);
 const material = { ...card, cost_memory: 0 };
 assert.equal(playsetProgress([material, { uuid: "b" } as Card], new Map([["a",1],["b",4]])).complete, 2);
});
