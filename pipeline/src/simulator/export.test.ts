import assert from "node:assert/strict";
import test from "node:test";
import { assertSummary } from "./export.js";

function validSummary() {
  return {
    schemaVersion: 1,
    source: "GrandArchiveSim",
    generatedAt: new Date().toISOString(),
    games: 5,
    firstPlayer: { games: 5, wins: 2, winRate: 0.4 },
    avgTurns: 6.2 as number | null,
    champions: [{ championId: "a", element: "FIRE", games: 5, wins: 2, winRate: 0.4 }],
    matchups: [{ champion1: "a", champion2: "b", games: 5, champion1Wins: 2, champion2Wins: 3 }],
    cardStats: [
      {
        cardId: "card-one",
        games: 5,
        avgDrawn: 2.4,
        avgDrawnToMemory: 0.2,
        avgMaterialized: 1.8,
        avgReserved: 0,
        avgDiscarded: 0.6,
        avgActivated: 1.2,
        winRate: 0.6 as number | null,
        attackEvents: 12,
        avgDamageDealt: 3.5,
        lethalHits: 2,
      },
    ],
    weapons: [{ weaponCardId: "weapon-one", games: 5, attackEvents: 8, cleaveRate: 0.25 }],
    turnStats: [
      {
        turn: 3,
        games: 5,
        avgCardsPlayed: 1.8,
        avgMemorySpent: 2.2,
        avgReserveSpent: 0.4,
        avgDamageDealt: 2.6,
        avgDamageTaken: 1.1,
        avgHealed: 0,
        avgLevel: 2.4,
        avgHp: 11.2,
      },
    ],
  };
}

test("accepts a well-formed summary, including below-threshold-gated cardStats/turnStats/weapons being empty arrays", () => {
  assert.doesNotThrow(() => assertSummary(validSummary()));
  const belowThreshold = { ...validSummary(), cardStats: [], weapons: [], turnStats: [] };
  assert.doesNotThrow(() => assertSummary(belowThreshold));
});

test("accepts a null avgTurns (zero games)", () => {
  const summary = validSummary();
  summary.avgTurns = null;
  assert.doesNotThrow(() => assertSummary(summary));
});

test("rejects a negative avgTurns", () => {
  const summary = validSummary();
  summary.avgTurns = -1;
  assert.throws(() => assertSummary(summary), /invalid avgTurns/);
});

test("rejects a weapons entry with an out-of-range cleaveRate", () => {
  const summary = validSummary();
  summary.weapons[0].cleaveRate = 1.5;
  assert.throws(() => assertSummary(summary), /invalid weapon aggregates/);
});

test("rejects a weapons entry with a negative attackEvents", () => {
  const summary = validSummary();
  summary.weapons[0].attackEvents = -1;
  assert.throws(() => assertSummary(summary), /invalid weapon aggregates/);
});

test("rejects a cardStats entry with a negative lethalHits", () => {
  const summary = validSummary();
  summary.cardStats[0].lethalHits = -1;
  assert.throws(() => assertSummary(summary), /invalid card aggregates/);
});

test("accepts a card/turn entry with a null winRate/no appearances distinction", () => {
  const summary = validSummary();
  summary.cardStats[0].winRate = null;
  assert.doesNotThrow(() => assertSummary(summary));
});

test("rejects a cardStats entry with an out-of-range winRate", () => {
  const summary = validSummary();
  summary.cardStats[0].winRate = 1.5;
  assert.throws(() => assertSummary(summary), /invalid card aggregates/);
});

test("rejects a cardStats entry with a negative average", () => {
  const summary = validSummary();
  summary.cardStats[0].avgDrawn = -1;
  assert.throws(() => assertSummary(summary), /invalid card aggregates/);
});

test("rejects a cardStats entry missing a required field", () => {
  const summary = validSummary() as { cardStats: Partial<ReturnType<typeof validSummary>["cardStats"][number]>[] };
  delete summary.cardStats[0].avgActivated;
  assert.throws(() => assertSummary(summary), /invalid card aggregates/);
});

test("rejects a turnStats entry with a negative turn number", () => {
  const summary = validSummary();
  summary.turnStats[0].turn = -1;
  assert.throws(() => assertSummary(summary), /invalid turn aggregates/);
});

test("rejects a turnStats entry with a non-finite average", () => {
  const summary = validSummary();
  summary.turnStats[0].avgHp = Number.POSITIVE_INFINITY;
  assert.throws(() => assertSummary(summary), /invalid turn aggregates/);
});

test("rejects a summary missing the cardStats/weapons/turnStats arrays entirely (pre-normalization API shape)", () => {
  const summary = validSummary() as Partial<ReturnType<typeof validSummary>>;
  delete summary.cardStats;
  delete summary.weapons;
  delete summary.turnStats;
  assert.throws(() => assertSummary(summary), /missing aggregate arrays/);
});
