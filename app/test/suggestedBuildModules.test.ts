import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { modalQuantity, pluralitySection } from "../src/features/deckbuilder/suggestedBuild/cardScoringAndQuantities";
import { selectSuggestedBuildPopulation } from "../src/features/deckbuilder/suggestedBuild/populationSelection";
import { modalSectionTotal } from "../src/features/deckbuilder/suggestedBuild/sectionAssembly";
import type { DeckBuilderRow } from "../src/features/deckbuilder/useDeckBuilderPopulation";

function row(deckId: string, main: Record<string, number>, material: Record<string, number>, winRate: number, spiritName = "Spirit"): DeckBuilderRow {
  return { deckId, main: new Map(Object.entries(main)), material: new Map(Object.entries(material)), sideboard: new Map(), spiritName, winRate };
}

test("population selection conditions only on data-backed locks and preserves fallback metrics", () => {
  const rows = Array.from({ length: 12 }, (_, index) => row(String(index), { Common: 4, ...(index < 6 ? { Locked: 2 } : {}) }, {}, index < 6 ? 0.75 : 0.25));
  const selected = selectSuggestedBuildPopulation(rows, "Spirit", new Map([["Locked", 2]]), new Map(), 5, 10);

  assert.equal(selected.conditionalRows.length, 6);
  assert.equal(selected.rankingRows.length, 12);
  assert.equal(selected.usedFallback, true);
  assert.equal(selected.conditionalWinRate, 0.75);
  assert.equal(selected.baselineWinRate, 0.5);
});

test("section and quantity helpers retain plurality and modal tie behavior", () => {
  const rows = [
    row("1", { Mixed: 2 }, { Anchor: 1 }, 0.5),
    row("2", {}, { Mixed: 1, Anchor: 1 }, 0.5),
    row("3", {}, { Mixed: 1 }, 0.5),
  ];

  assert.equal(pluralitySection(rows, "Mixed"), "material");
  assert.equal(modalQuantity(rows, "material", "Mixed", undefined as Card | undefined), 1);
  assert.equal(modalSectionTotal(rows, "material", 12), 1);
});
