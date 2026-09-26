import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesPackageRule, measurePackageRule } from "@gatcg/shared";
import { computePackageCandidates } from "./packageCandidates.js";

test("AND groups preserve roles and count distinct names", () => {
  const rule = { requiredCards: ["A"], groups: [{ cards: ["B", "C"], minimum: 1 }, { cards: ["D", "E"], minimum: 1 }] };
  assert.equal(matchesPackageRule(new Set(["A", "B", "C"]), rule), false);
  assert.equal(matchesPackageRule(new Set(["A", "C", "E"]), rule), true);
  assert.equal(matchesPackageRule(new Set(["C", "E"]), rule), false);
  assert.equal(matchesPackageRule(new Set(["B"]), { requiredCards: [], groups: [{ cards: ["B", "B"], minimum: 2 }] }), false);
  const measured = measurePackageRule([new Set(["A", "B"]), new Set(["A", "B", "D"]), new Set(["B", "D"])], rule);
  assert.equal(measured.matchingDecks, 1);
  assert.equal(measured.confidence, 0.5);
  assert.equal(measured.lift, 0.75);
});

test("sideboard-only relationships do not qualify", () => {
  const result = computePackageCandidates([{ deckId: "event:player", main: [[0, 4]], material: [], sideboard: [[1, 4]] }], ["A", "B"], new Map([["event:player", "Champion"]]), [{ anchorCard: "A", memberCards: ["B"], evidenceKinds: ["Named rules-text link"] }]);
  assert.equal(result.candidates.some((candidate) => candidate.matchingDecks > 0), false);
});
