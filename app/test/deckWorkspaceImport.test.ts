import assert from "node:assert/strict";
import test from "node:test";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { decklistToWorkspace } from "../src/features/deckbuilder/persistence/deckWorkspaceImport";

function card(name: string, types: string[], subtypes: string[] = [], level?: number): Card {
  return { name, types, subtypes, level, editions: [] } as unknown as Card;
}

test("imported deck labels are reconciled with canonical catalog names", () => {
  const catalog = [
    card("Lorraine, Crux Knight", ["CHAMPION"], [], 3),
    card("Spirit of Fire", ["CHAMPION"], ["SPIRIT"], 0),
    card("Dungeon Guide", ["ALLY"]),
  ];
  const decklist: OmnidexDecklist = {
    main: [{ card: "  dungeon   guide ", quantity: 4 }],
    material: [
      { card: "spirit of fire", quantity: 1 },
      { card: "LORRAINE, CRUX KNIGHT", quantity: 1 },
    ],
    sideboard: [],
  };

  const workspace = decklistToWorkspace(decklist, new Map(catalog.map((entry) => [entry.name, entry])), "analysis");

  assert.equal(workspace.championName, "Lorraine");
  assert.equal(workspace.spiritName, "Spirit of Fire");
  assert.deepEqual(workspace.main, [{ name: "Dungeon Guide", quantity: 4 }]);
  assert.deepEqual(workspace.material.map((line) => line.name), ["Spirit of Fire", "Lorraine, Crux Knight"]);
});

test("an imported deck remains representable when no champion can be inferred", () => {
  const decklist: OmnidexDecklist = {
    main: [{ card: "Unknown Archived Card", quantity: 4 }],
    material: [],
    sideboard: [],
  };

  const workspace = decklistToWorkspace(decklist, new Map(), "combo");

  assert.equal(workspace.championName, null);
  assert.deepEqual(workspace.main, [{ name: "Unknown Archived Card", quantity: 4 }]);
});
