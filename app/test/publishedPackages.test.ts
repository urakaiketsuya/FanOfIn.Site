import assert from "node:assert/strict";
import test from "node:test";
import { PUBLISHED_PACKAGE_CATALOG, evaluatePublishedPackage, getPublishedPackageMembership, type PackageDeckCard } from "@gatcg/shared";
import { getRegisteredDeckPackageCatalog, findActiveDeckPackages } from "../src/features/deckbuilder/packageGuardrails";

const card = (cardName: string, section: PackageDeckCard["section"], quantity = 1): PackageDeckCard => ({ cardName, section, quantity });
const fixtures = [
  { id: "fluffy-shopkeep-resonance-baubles", cards: [card("Fluffy Shopkeep", "main"), card("Fire Resonance Bauble", "material"), card("Water Resonance Bauble", "material")], protected: ["Fire Resonance Bauble", "Water Resonance Bauble"] },
  { id: "argus-material-fuel", cards: [card("Argus, All-Seeing Giant", "main"), card("Eye of Argus", "material")], protected: ["Argus, All-Seeing Giant", "Eye of Argus"] },
  { id: "turbo-charge-backup-charger", cards: [card("Turbo Charge", "main"), card("Backup Charger", "material")], protected: ["Turbo Charge", "Backup Charger"] },
  { id: "clarent-reimagined-lineage", cards: [card("Clarent, Reimagined", "material"), card("Clarent, Sword of Peace", "material"), card("Lorraine, Blademaster", "material")], protected: ["Clarent, Reimagined", "Clarent, Sword of Peace"] },
];

test("shared catalog preserves registered identities, activation, and card membership", () => {
  assert.deepEqual(getRegisteredDeckPackageCatalog().map(p => p.id), fixtures.map(f => f.id));
  for (const fixture of fixtures) {
    const definition = PUBLISHED_PACKAGE_CATALOG.packages.find(p => p.id === fixture.id)!;
    assert.deepEqual(evaluatePublishedPackage(definition, fixture.cards), { active: true, protectedCards: fixture.protected });
    const entry = getRegisteredDeckPackageCatalog(fixture.cards).find(p => p.id === fixture.id)!;
    assert.equal(entry.active, true);
    assert.deepEqual(entry.protectedCards, fixture.protected);
    for (const name of definition.memberCards) assert.ok(getPublishedPackageMembership(name).some(p => p.id === fixture.id));
    for (let i = 0; i < fixture.cards.length; i++) {
      for (const replacement of [undefined, { ...fixture.cards[i], quantity: 0 }, { ...fixture.cards[i], section: "sideboard" as const }]) {
        const cards = fixture.cards.flatMap((c, index) => index !== i ? [c] : replacement ? [replacement] : []);
        assert.deepEqual(evaluatePublishedPackage(definition, cards), { active: false, protectedCards: [] }, `${fixture.id}: missing requirement ${i}`);
      }
    }
  }
});

test("published membership and activation do not automatically authorize Builder protection", () => {
  const original = PUBLISHED_PACKAGE_CATALOG.packages[2];
  const browseOnly = { ...original, protection: { mode: "none" as const } };
  assert.deepEqual(evaluatePublishedPackage(browseOnly, fixtures[2].cards), { active: true, protectedCards: [] });
  assert.equal(getPublishedPackageMembership("Turbo Charge").length, 1);
});

test("catalog is serializable and returned membership cannot mutate its card pools", () => {
  const restored = JSON.parse(JSON.stringify(PUBLISHED_PACKAGE_CATALOG));
  for (const fixture of fixtures) assert.deepEqual(evaluatePublishedPackage(restored.packages.find((p: { id: string }) => p.id === fixture.id), fixture.cards), { active: true, protectedCards: fixture.protected });
  const membership = getPublishedPackageMembership("Turbo Charge");
  membership[0].memberCards.length = 0;
  assert.deepEqual(getPublishedPackageMembership("Turbo Charge")[0].memberCards, ["Turbo Charge", "Backup Charger"]);
});

test("distinct alternatives cannot be satisfied by duplicate copies or duplicate lines", () => {
  const shopkeep = PUBLISHED_PACKAGE_CATALOG.packages[0];
  assert.equal(evaluatePublishedPackage(shopkeep, [card("Fluffy Shopkeep", "main"), card("Fire Resonance Bauble", "material", 4), card("Fire Resonance Bauble", "material")]).active, false);
});


test("alternative protection preserves original deck order after the required anchor", () => {
  const argus = PUBLISHED_PACKAGE_CATALOG.packages[1];
  assert.deepEqual(evaluatePublishedPackage(argus, [card("Eye of Argus", "material"), card("Crystal of Argus", "material"), card("Argus, All-Seeing Giant", "main")]).protectedCards,
    ["Argus, All-Seeing Giant", "Eye of Argus", "Crystal of Argus"]);
  const shopkeep = PUBLISHED_PACKAGE_CATALOG.packages[0];
  assert.deepEqual(evaluatePublishedPackage(shopkeep, [card("Wind Resonance Bauble", "material"), card("Fire Resonance Bauble", "material"), card("Fluffy Shopkeep", "main")]).protectedCards,
    ["Wind Resonance Bauble", "Fire Resonance Bauble"]);
});


test("reviewed browse-only pairs appear on cards but never register Builder protection", () => {
  const pairs = [
    { id: "return-to-archive-looking-glass", cards: [card("Return to the Archive", "main"), card("The Looking Glass", "material")] },
    { id: "numinous-monk-capacitance", cards: [card("Numinous Monk", "main"), card("Capacitance X Psycho", "material")] },
    { id: "prototype-pistol-windpiercer", cards: [card("Prototype Pistol", "material"), card("Windpiercer", "material")] },
  ];
  assert.equal(PUBLISHED_PACKAGE_CATALOG.revision, 2);
  assert.equal(PUBLISHED_PACKAGE_CATALOG.packages.length, fixtures.length + pairs.length);
  for (const pair of pairs) {
    const definition = PUBLISHED_PACKAGE_CATALOG.packages.find(p => p.id === pair.id)!;
    assert.deepEqual(evaluatePublishedPackage(definition, pair.cards), { active: true, protectedCards: [] });
    assert.deepEqual(findActiveDeckPackages(pair.cards), []);
    assert.ok(!getRegisteredDeckPackageCatalog(pair.cards).some(p => p.id === pair.id));
    for (const member of pair.cards) assert.ok(getPublishedPackageMembership(member.cardName).some(p => p.id === pair.id));
    for (let i = 0; i < pair.cards.length; i++) {
      for (const section of ["sideboard", pair.cards[i].section === "main" ? "material" : "main"] as const) {
        assert.equal(evaluatePublishedPackage(definition, pair.cards.map((c, index) => index === i ? { ...c, section } : c)).active, false);
      }
      assert.equal(evaluatePublishedPackage(definition, pair.cards.filter((_, index) => index !== i)).active, false);
    }
  }
  assert.deepEqual(getPublishedPackageMembership("Inert Sword"), []);
});
