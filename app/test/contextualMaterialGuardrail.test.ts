import assert from "node:assert/strict";
import test from "node:test";
import { findContextualMaterialReplacement, type ContextualMaterialRow } from "../src/features/deckbuilder/contextualMaterialGuardrail";

function row(materialCard: string, winRate: number): ContextualMaterialRow {
  return {
    main: new Map([["Shared Engine", 4]]),
    material: new Map([[materialCard, 1]]),
    sideboard: new Map(),
    winRate,
  };
}

const identity = new Map([["Shared Engine", 4], ["Weak Material", 1]]);

test("returns a positive same-cohort replacement for a negative Material card", () => {
  const rows = [...Array.from({ length: 5 }, () => row("Weak Material", 0)), ...Array.from({ length: 5 }, () => row("Strong Material", 1))];
  assert.deepEqual(findContextualMaterialReplacement("Weak Material", identity, rows, ["Strong Material"]), {
    cardName: "Strong Material",
    peerDecks: 10,
  });
});

test("suppresses a standalone cut when no visible alternative has positive evidence", () => {
  const rows = [...Array.from({ length: 5 }, () => row("Weak Material", 0)), ...Array.from({ length: 5 }, () => row("Strong Material", 1))];
  assert.equal(findContextualMaterialReplacement("Weak Material", identity, rows, ["Unobserved Material"]), undefined);
});

test("suppresses contextual claims from fewer than ten similar decks", () => {
  const rows = [...Array.from({ length: 4 }, () => row("Weak Material", 0)), ...Array.from({ length: 5 }, () => row("Strong Material", 1))];
  assert.equal(findContextualMaterialReplacement("Weak Material", identity, rows, ["Strong Material"]), undefined);
});

test("does not recommend cutting a card that is not negative in the local cohort", () => {
  const rows = [...Array.from({ length: 5 }, () => row("Weak Material", 1)), ...Array.from({ length: 5 }, () => row("Strong Material", 0))];
  assert.equal(findContextualMaterialReplacement("Weak Material", identity, rows, ["Strong Material"]), undefined);
});
