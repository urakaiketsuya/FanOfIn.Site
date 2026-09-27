import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card, CollectionEntry } from "@gatcg/shared";
import { collectionMilestone, collectionSetProgress } from "../src/features/collection/collectionProgress";
const card = (uuid: string, sets: string[]) => ({ uuid, name: uuid, editions: sets.map((prefix) => ({ set: { prefix, name: prefix } })) }) as Card;
const entry = (cardUuid: string, ownedQuantity: number, proxyQuantity = 0, editionUuid?: string) => ({ cardUuid, ownedQuantity, proxyQuantity, editionUuid }) as CollectionEntry;
test("unique cards deduplicate editions and pool physical printings across sets", () => {
 const result = collectionSetProgress([card("A", ["ONE", "ONE", "TWO"]), card("B", ["ONE"])], [entry("A", 0), entry("A", 4, 0, "printing"), entry("B", 0, 4)]);
 const one = result.find((set) => set.prefix === "ONE")!;
 assert.equal(one.total, 2); assert.equal(one.owned, 1); assert.equal(one.percent, 50);
 assert.equal(result.find((set) => set.prefix === "TWO")!.owned, 1);
});
test("extra copies and unrecognized collection cards do not inflate completion", () => {
 const [set] = collectionSetProgress([card("A", ["ONE"])], [entry("A", 10), entry("A", 2, 0, "alternate"), entry("UNKNOWN", 100)]);
 assert.equal(set.owned, 1); assert.equal(set.percent, 100); assert.equal(set.quantities.get("A"), 12);
});
test("milestones follow actual thresholds and regress when cards are removed", () => {
 assert.equal(collectionMilestone(0, 0), "Ready to begin");
 assert.equal(collectionMilestone(1, 100), "First card");
 assert.equal(collectionMilestone(25, 100), "Quarter complete");
 assert.equal(collectionMilestone(50, 100), "Halfway");
 assert.equal(collectionMilestone(75, 100), "Three quarters");
 assert.equal(collectionMilestone(100, 100), "Set complete");
 const [set] = collectionSetProgress([card("A", ["ONE"])], [entry("A", 0)]);
 assert.equal(collectionMilestone(set.owned, set.total), "Ready to begin");
});
test("set families union cards without merging separate products or changing inventory", () => {
 const inventory = [entry("A", 2, 0, "first-printing"), entry("B", 0, 3)];
 const before = JSON.stringify(inventory);
 const result = collectionSetProgress([card("A", ["ALC", "ALC 1st", "ALC Alter"]), card("B", ["ALC 1st"]), card("C", ["ALCSD"]), card("D", ["UNKNOWN 1st"])], inventory);
 const family = result.find(set => set.prefix === "ALC")!;
 assert.equal(family.total, 2); assert.equal(family.owned, 1); assert.equal(family.percent, 50);
 assert.equal(result.length, 3); assert.equal(family.name, "Alchemical Revolution");
 assert.equal(JSON.stringify(inventory), before);
 const [doa] = collectionSetProgress([card("A", ["DOA 1st", "DOA Alter"])], []);
 assert.equal(doa.prefix, "DOA"); assert.equal(doa.total, 1);
});
