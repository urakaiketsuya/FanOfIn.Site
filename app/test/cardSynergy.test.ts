import assert from "node:assert/strict";
import test from "node:test";
import { computeChampionAdjustedSynergy, type CardSynergyRow } from "../src/features/cards/useCardSynergy";

function row(championName: string, outcome: number, cards: string[]): CardSynergyRow {
  return {
    championName,
    outcome,
    sections: { main: new Set(cards), material: new Set([championName]), sideboard: new Set() },
  };
}

test("synergy removes Champion baseline effects and keeps positive within-Champion lift", () => {
  const rows: CardSynergyRow[] = [];
  for (const champion of ["Strong Champion", "Weak Champion"]) {
    for (let i = 0; i < 10; i++) {
      const championBase = champion === "Strong Champion" ? 0.4 : 0;
      rows.push(row(champion, championBase + (i < 5 ? 0.6 : 0), i < 5 ? ["Helpful Card"] : []));
    }
  }

  const entries = computeChampionAdjustedSynergy(rows);
  assert.equal(entries.some((entry) => entry.cardName === "Strong Champion"), false);
  assert.equal(entries.some((entry) => entry.cardName === "Weak Champion"), false);
  assert.equal(entries.some((entry) => entry.cardName === "Helpful Card" && entry.adjustedLift > 0), true);
  assert.equal(entries.every((entry) => entry.adjustedLift > 0), true);
});
