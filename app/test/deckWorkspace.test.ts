import assert from "node:assert/strict";
import test from "node:test";
import { loadActiveDeckWorkspace, saveActiveDeckWorkspace } from "../src/features/deckbuilder/persistence/deckWorkspace";

class MemoryStorage {
  value: string | null = null;
  getItem() { return this.value; }
  setItem(_key: string, value: string) { this.value = value; }
}

test("active deck workspace preserves Combo Lab as its source", () => {
  const storage = new MemoryStorage();
  saveActiveDeckWorkspace(storage, { source: "combo", title: "Test", sourceLabel: "Combo Lab", format: "STANDARD", championName: "Rai", spiritName: null, main: [{ name: "Fireball", quantity: 4 }], material: [], sideboard: [], maybeboard: [] });
  assert.equal(loadActiveDeckWorkspace(storage)?.source, "combo");
});
