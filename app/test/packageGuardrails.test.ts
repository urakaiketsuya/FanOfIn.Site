import assert from "node:assert/strict";
import test from "node:test";
import { findActiveDeckPackages, getCardPackageMembership, getDeckPackageCatalog } from "../src/features/deckbuilder/packageGuardrails";
import { evaluateLocalPackageApproval, localPackageApprovalId, parseLocalPackageApprovals, type LocalPackageApproval } from "../src/features/deckbuilder/localPackageApprovals";
import { DECK_PACKAGE_CANDIDATES } from "../src/features/deckbuilder/packageCandidates";

const card = (cardName: string, section: "main" | "material" | "sideboard" = "material", quantity = 1) => ({ cardName, section, quantity });

test("protects the present Resonance Baubles when Fluffy Shopkeep has matchup choices", () => {
  const packages = findActiveDeckPackages([
    card("Fluffy Shopkeep", "main", 4),
    card("Fire Resonance Bauble"),
    card("Water Resonance Bauble"),
    card("Wind Resonance Bauble"),
  ]);
  assert.equal(packages.length, 1);
  assert.deepEqual(packages[0].protectedCards, ["Fire Resonance Bauble", "Water Resonance Bauble", "Wind Resonance Bauble"]);
});

test("local package approvals have stable member-set ids and reject malformed storage", () => {
  assert.equal(localPackageApprovalId(["Beta", "Alpha"]), localPackageApprovalId(["Alpha", "Beta", "Alpha"]));
  assert.deepEqual(parseLocalPackageApprovals("not json"), []);
  assert.deepEqual(parseLocalPackageApprovals(JSON.stringify([{ id: "local:test", label: "Test", memberCards: ["Beta", "Alpha"] }])), [{
    id: "local:test", label: "Test", memberCards: ["Alpha", "Beta"], requiredCards: ["Alpha", "Beta"], optionCards: [], minOptions: 0, approvedAt: "",
  }]);
});

test("local package families require their core and option threshold", () => {
  const approval: LocalPackageApproval = {
    id: "local:family", label: "Family", memberCards: ["Anchor", "Core", "A", "B", "C"],
    requiredCards: ["Anchor", "Core"], optionCards: ["A", "B", "C"], minOptions: 2, approvedAt: "",
  };
  assert.deepEqual(evaluateLocalPackageApproval(approval, new Set(["Anchor", "Core", "A"])), []);
  assert.deepEqual(evaluateLocalPackageApproval(approval, new Set(["Anchor", "Core", "A", "C"])), ["Anchor", "Core", "A", "C"]);
});

test("does not activate for a lone bauble, a missing Shopkeep, or duplicate input lines", () => {
  assert.deepEqual(findActiveDeckPackages([card("Fluffy Shopkeep", "main", 4), card("Fire Resonance Bauble")]), []);
  assert.deepEqual(findActiveDeckPackages([card("Fire Resonance Bauble"), card("Water Resonance Bauble")]), []);
  assert.deepEqual(findActiveDeckPackages([card("Fluffy Shopkeep", "main", 4), card("Fire Resonance Bauble"), card("Fire Resonance Bauble")]), []);
});

test("requires Shopkeep in Main and baubles in Material", () => {
  assert.deepEqual(findActiveDeckPackages([card("Fluffy Shopkeep", "sideboard"), card("Fire Resonance Bauble"), card("Water Resonance Bauble")]), []);
  assert.deepEqual(findActiveDeckPackages([card("Fluffy Shopkeep", "main"), card("Fire Resonance Bauble", "sideboard"), card("Water Resonance Bauble")]), []);
});

test("catalog exposes inactive definitions and their audit metadata", () => {
  const catalog = getDeckPackageCatalog([]);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].active, false);
  assert.match(catalog[0].activation, /at least two distinct/i);
  assert.deepEqual(catalog[0].memberCards, ["Fluffy Shopkeep", "Fire Resonance Bauble", "Water Resonance Bauble", "Wind Resonance Bauble"]);
  assert.deepEqual(catalog[0].observedSupport, { matchingDecks: 804, populationDecks: 57_713, auditLabel: "deck-card index audit" });
});

test("catalog reports active protected cards", () => {
  const [entry] = getDeckPackageCatalog([card("Fluffy Shopkeep", "main", 4), card("Fire Resonance Bauble"), card("Water Resonance Bauble")]);
  assert.equal(entry.active, true);
  assert.deepEqual(entry.protectedCards, ["Fire Resonance Bauble", "Water Resonance Bauble"]);
});

test("card membership includes every participant without claiming deck activation", () => {
  assert.equal(getCardPackageMembership("Fluffy Shopkeep")[0].id, "fluffy-shopkeep-resonance-baubles");
  assert.equal(getCardPackageMembership("Wind Resonance Bauble")[0].id, "fluffy-shopkeep-resonance-baubles");
  assert.deepEqual(getCardPackageMembership("Dungeon Guide"), []);
  assert.equal("active" in getCardPackageMembership("Fluffy Shopkeep")[0], false);
});

test("review candidates stay outside the active package registry", () => {
  assert.equal(DECK_PACKAGE_CANDIDATES.length, 9);
  assert.equal(getDeckPackageCatalog([]).length, 1);
  assert.equal(getCardPackageMembership("Clarent, Reimagined").length, 0);
});
