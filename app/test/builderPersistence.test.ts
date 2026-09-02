import assert from "node:assert/strict";
import test from "node:test";
import { createBuilderShareParams, decodeCardSelections, encodeCardSelections, loadBuilderSession, saveBuilderSession } from "../src/features/deckbuilder/persistence/builderPersistence";
import type { BuilderSession } from "../src/features/deckbuilder/model/builderTypes";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("card selection codec preserves sections, quantities, and names containing colons", () => {
  const selections = [
    { name: "Spirit of Water", quantity: 1, section: "material" as const },
    { name: "Test: Card", quantity: 4, section: "main" as const },
  ];
  assert.deepEqual(decodeCardSelections(encodeCardSelections(selections)), selections);
});

test("builder sessions round-trip through the versioned storage contract", () => {
  const storage = new MemoryStorage();
  const session: BuilderSession = {
    selection: {
      format: "STANDARD",
      championName: "Lorraine, Blademaster",
      spiritName: "Spirit of Fire",
      archetypeId: null,
      populationSource: "balanced",
      pillarBias: null,
      championLevelCap: null,
      collectionMode: "all",
      lockedCards: [{ name: "Crux Sight", quantity: 4, section: "main" }],
      rejectedCards: [],
      maybeboard: [],
    },
    changeLog: [],
  };
  saveBuilderSession(storage, session);
  assert.deepEqual(loadBuilderSession(storage), session);
});

test("share params contain only the portable recipe", () => {
  const params = createBuilderShareParams({
    championName: "Silvie, Loved by All",
    spiritName: "Spirit of Wind",
    archetypeId: "silvie-wind",
    format: "PANTHEON",
    lockedCards: [{ name: "Creative Shock", quantity: 4, section: "main" }],
  });
  assert.equal(params.get("format"), "pantheon");
  assert.equal(params.get("locked"), "main:4:Creative Shock");
  assert.equal(params.has("populationSource"), false);
});
