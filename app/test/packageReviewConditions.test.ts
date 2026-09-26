import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLocalPackageApprovals, evaluateLocalPackageApproval } from "../src/features/deckbuilder/localPackageApprovals";

test("reviewed conditions survive storage and enforce every AND group", () => {
  const [approval] = parseLocalPackageApprovals(JSON.stringify([{ id: "review:test", label: "Test", memberCards: ["A", "B", "C", "D"], requiredCards: ["A"], groups: [{ cards: ["B", "C"], minimum: 1 }, { cards: ["D"], minimum: 1 }] }]));
  assert.ok(approval);
  assert.deepEqual(evaluateLocalPackageApproval(approval, new Set(["A", "B", "C"])), []);
  assert.deepEqual(evaluateLocalPackageApproval(approval, new Set(["A", "B", "D"])), ["A", "B", "D"]);
});
