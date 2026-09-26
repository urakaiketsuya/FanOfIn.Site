import assert from "node:assert/strict";
import test from "node:test";
import { comparePackagePools, groupPackagePools, measurePackageRuleOverlap } from "@gatcg/shared";
import { packageRelationshipEntries } from "../src/features/cards/packageRelationshipEntries";
import { approveLocalPackageFamily, getLocalPackageApprovals } from "../src/features/deckbuilder/localPackageApprovals";

const pool = (id: string, cards: string[]) => ({ id, cards });
test("same card pool groups different anchors while preserving all source objects", () => {
  const a = { ...pool("portly", ["Portly", "Buddy", "Banner"]), required: "Portly" };
  const b = { ...pool("buddy", ["Banner", "Buddy", "Portly", "Buddy"]), required: "Buddy" };
  const result = groupPackagePools([a, b]);
  assert.equal(result.groups.length, 1);
  assert.deepEqual(result.groups[0].cards, ["Banner", "Buddy", "Portly"]);
  assert.equal(result.groups[0].entries.find((item) => item.id === "buddy"), b);
  assert.equal(result.groups[0].entries.find((item) => item.id === "portly"), a);
  assert.equal(result.relationships.length, 0);
});
test("containment has direction and unique cards are retained", () => {
  const result = comparePackagePools(pool("small", ["A", "B"]), pool("big", ["A", "B", "C", "D"]))!;
  assert.equal(result.kind, "contained");
  assert.equal(result.smallerId, "small");
  assert.equal(result.containment, 1);
  assert.equal(result.similarity, .5);
  assert.deepEqual(result.rightOnly, ["C", "D"]);
});
test("70% overlap and 90% near-containment qualify; loose staple pairs do not", () => {
  const result = comparePackagePools(pool("a", ["A", "B", "C", "D", "E", "F"]), pool("b", ["A", "B", "C", "D", "E", "G"]))!;
  assert.equal(result.kind, "strong");
  assert.equal(comparePackagePools(pool("a", ["A", "B", "C"]), pool("b", ["A", "B", "D"]))?.kind, "loose");
  assert.equal(comparePackagePools(pool("a", ["A", "B"]), pool("b", ["A", "C"])), null);
  const shared = Array.from({ length: 9 }, (_, i) => String(i));
  assert.equal(comparePackagePools(pool("a", [...shared, "X"]), pool("b", [...shared, "Y", "Z", "W", "V"]))?.kind, "strong");
});
test("overlap chains never collapse into a giant group; order is deterministic", () => {
  const entries = [pool("a", ["1", "2", "3", "4", "5", "6"]), pool("b", ["2", "3", "4", "5", "6", "7"]), pool("c", ["3", "4", "5", "6", "7", "8"])];
  const result = groupPackagePools(entries);
  assert.equal(result.groups.length, 3);
  assert.equal(result.relationships.filter((item) => item.kind === "strong").length, 2);
  assert.deepEqual(groupPackagePools([...entries].reverse()), result);
});
test("empty and duplicate-only pools do not produce suggestions", () => {
  assert.deepEqual(groupPackagePools([]), { groups: [], relationships: [] });
  assert.equal(groupPackagePools([pool("a", ["X", "X"])]).groups.length, 0);
});
test("adapter preserves prose-only section rules and local condition groups", () => {
  const entries = packageRelationshipEntries([{ id: "reg", label: "Registered", memberCards: ["A", "B"], activation: "A in Main and B in Material", explanation: "", protectedCards: [], active: false }], [], [{ id: "local", label: "Local", memberCards: ["A", "B"], requiredCards: ["B"], optionCards: [], minOptions: 0, groups: [{ cards: ["A"], minimum: 1 }], approvedAt: "" }]);
  assert.equal(groupPackagePools(entries).groups.length, 1);
  assert.equal(entries[0].rule, undefined);
  assert.equal(entries[0].activation, "A in Main and B in Material");
  assert.deepEqual(entries[1].rule?.requiredCards, ["B"]);
});
test("approving same-pool families retains separate activation rules", () => {
  let raw: string | null = null;
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } }, dispatchEvent: () => true } });
  try {
    approveLocalPackageFamily("Portly", "Portly", [], ["Buddy", "Banner"], 1);
    approveLocalPackageFamily("Buddy", "Buddy", [], ["Portly", "Banner"], 1);
    const approvals = getLocalPackageApprovals();
    assert.equal(approvals.length, 2);
    assert.notEqual(approvals[0].id, approvals[1].id);
    assert.deepEqual(approvals.map((entry) => entry.requiredCards), [["Portly"], ["Buddy"]]);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});


test("joint rule evidence excludes sideboards, zero counts and counts each shared name once per deck", () => {
  const data = { generatedAt: "test", cardNames: ["A", "B", "C"], decks: [
    { deckId: "both", main: [[0, 4], [1, 2], [2, 1]] as [number, number][], material: [[0, 1]] as [number, number][], sideboard: [] },
    { deckId: "left", main: [[0, 1], [1, 1]] as [number, number][], material: [], sideboard: [[2, 1]] as [number, number][] },
    { deckId: "right", main: [[0, 1], [2, 1], [1, 0]] as [number, number][], material: [], sideboard: [] },
  ] };
  const result = measurePackageRuleOverlap(data, { requiredCards: ["A", "B"], groups: [] }, { requiredCards: ["A"], groups: [{ cards: ["C"], minimum: 1 }] });
  assert.deepEqual(result, { leftCount: 2, rightCount: 2, both: 1, union: 3, population: 3, sharedPrevalence: [["A", 3]] });
  assert.equal(measurePackageRuleOverlap({ ...data, decks: [] }, { requiredCards: ["A"], groups: [] }, { requiredCards: ["B"], groups: [] }).population, 0);
});
