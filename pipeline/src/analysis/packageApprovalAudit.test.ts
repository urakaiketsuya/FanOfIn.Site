import test from "node:test";
import assert from "node:assert/strict";
import { packageAutoEligibility, type DeckCardIndexEntry, type SavedPackageRule } from "@gatcg/shared";
import { computePackageCandidates } from "./packageCandidates.js";
import { attachPackageApprovalEvidence } from "./packageApprovalAudit.js";

test("approval audit measures exact rule, distinct matching events and material prerequisites", () => {
  const names = ["Argus, All-Seeing Giant", "Crystal of Argus", "Alice, Test"];
  const decks: DeckCardIndexEntry[] = Array.from({ length: 100 }, (_, i) => ({ deckId: `${i % 3}:${i}`, main: i < 30 ? [[0, 1]] : [], material: i < 30 ? [[1, 1], [2, 1]] : [[2, 1]], sideboard: [] }));
  const champions = new Map(decks.map((deck) => [deck.deckId, "Alice"]));
  const data = computePackageCandidates(decks, names, champions, [{ anchorCard: names[0], memberCards: [names[1]], evidenceKinds: ["Named rules-text link"] }]);
  const catalog = [{ name: names[0], effect: "you may banish one or more cards named Crystal of Argus or Eye of Argus from your material deck. Each card banished this way pays for 3 of that cost" }, { name: names[2], types: ["CHAMPION"] }];
  attachPackageApprovalEvidence(data, decks, names, champions, catalog);
  const evidence = data.candidates[0].approvalEvidence!;
  assert.equal(evidence.cohorts[0].matchingEvents, 3);
  assert.equal(evidence.cohorts[0].matchingDecks, 30);
  assert.equal(evidence.cohorts[0].confidence, 1);
  const rule: SavedPackageRule = { id: "test", label: "test", cards: names.slice(0, 2), conditions: { requiredCards: names.slice(0, 2), groups: [] }, status: "suggested", source: "test", sourceIds: [], activation: "", evidence };
  assert.equal(packageAutoEligibility(rule).eligible, true);
  const sideboardOnly = decks.map((deck, i) => i < 30 ? { ...deck, material: [[2, 1]] as [number, number][], sideboard: [[1, 1]] as [number, number][] } : deck);
  attachPackageApprovalEvidence(data, sideboardOnly, names, champions, catalog);
  assert.equal(data.candidates[0].approvalEvidence!.cohorts[0].matchingDecks, 0);
  attachPackageApprovalEvidence(data, decks, names, champions, [{ name: names[0], effect: "Changed rules text" }]);
  assert.equal(data.candidates[0].approvalEvidence!.mechanicsVerified, false);
});
