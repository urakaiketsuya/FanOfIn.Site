import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SimulatorSummary } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Exported for `export.test.ts` — otherwise module-internal. */
export function assertSummary(value: unknown): asserts value is SimulatorSummary {
  if (!value || typeof value !== "object") throw new Error("simulator API returned a non-object");
  const summary = value as Partial<SimulatorSummary>;
  if (summary.schemaVersion !== 1 || summary.source !== "GrandArchiveSim") {
    throw new Error("simulator API returned an unsupported summary schema");
  }
  if (
    typeof summary.generatedAt !== "string"
    || Number.isNaN(Date.parse(summary.generatedAt))
    || typeof summary.games !== "number"
    || !Number.isSafeInteger(summary.games)
    || summary.games < 0
  ) {
    throw new Error("simulator API summary is missing required metadata");
  }
  const firstPlayer = summary.firstPlayer;
  if (
    !firstPlayer
    || !Number.isSafeInteger(firstPlayer.games)
    || firstPlayer.games < 0
    || !Number.isSafeInteger(firstPlayer.wins)
    || firstPlayer.wins < 0
    || firstPlayer.wins > firstPlayer.games
    || (firstPlayer.winRate !== null && (typeof firstPlayer.winRate !== "number" || firstPlayer.winRate < 0 || firstPlayer.winRate > 1))
  ) {
    throw new Error("simulator API summary has invalid first-player aggregates");
  }
  if (summary.avgTurns !== null && !isFiniteNonNegative(summary.avgTurns)) {
    throw new Error("simulator API summary has an invalid avgTurns");
  }
  if (
    !Array.isArray(summary.champions)
    || !Array.isArray(summary.matchups)
    || !Array.isArray(summary.cardStats)
    || !Array.isArray(summary.weapons)
    || !Array.isArray(summary.turnStats)
  ) {
    throw new Error("simulator API summary is missing aggregate arrays");
  }
  if (summary.champions.some((champion) => (
    !champion
    || typeof champion.championId !== "string"
    || typeof champion.element !== "string"
    || !Number.isSafeInteger(champion.games)
    || champion.games < 0
    || !Number.isSafeInteger(champion.wins)
    || champion.wins < 0
    || champion.wins > champion.games
    || (champion.winRate !== null && (typeof champion.winRate !== "number" || champion.winRate < 0 || champion.winRate > 1))
  ))) {
    throw new Error("simulator API summary has invalid champion aggregates");
  }
  if (summary.matchups.some((matchup) => (
    !matchup
    || typeof matchup.champion1 !== "string"
    || typeof matchup.champion2 !== "string"
    || !Number.isSafeInteger(matchup.games)
    || matchup.games < 0
    || !Number.isSafeInteger(matchup.champion1Wins)
    || matchup.champion1Wins < 0
    || !Number.isSafeInteger(matchup.champion2Wins)
    || matchup.champion2Wins < 0
    || matchup.champion1Wins + matchup.champion2Wins > matchup.games
  ))) {
    throw new Error("simulator API summary has invalid matchup aggregates");
  }
  if (summary.cardStats.some((card) => (
    !card
    || typeof card.cardId !== "string"
    || !Number.isSafeInteger(card.games)
    || card.games < 0
    || !isFiniteNonNegative(card.avgDrawn)
    || !isFiniteNonNegative(card.avgDrawnToMemory)
    || !isFiniteNonNegative(card.avgMaterialized)
    || !isFiniteNonNegative(card.avgReserved)
    || !isFiniteNonNegative(card.avgDiscarded)
    || !isFiniteNonNegative(card.avgActivated)
    || (card.winRate !== null && (typeof card.winRate !== "number" || card.winRate < 0 || card.winRate > 1))
    || !Number.isSafeInteger(card.attackEvents)
    || card.attackEvents < 0
    || !isFiniteNonNegative(card.avgDamageDealt)
    || !Number.isSafeInteger(card.lethalHits)
    || card.lethalHits < 0
  ))) {
    throw new Error("simulator API summary has invalid card aggregates");
  }
  if (summary.weapons.some((weapon) => (
    !weapon
    || typeof weapon.weaponCardId !== "string"
    || !Number.isSafeInteger(weapon.games)
    || weapon.games < 0
    || !Number.isSafeInteger(weapon.attackEvents)
    || weapon.attackEvents < 0
    || typeof weapon.cleaveRate !== "number"
    || weapon.cleaveRate < 0
    || weapon.cleaveRate > 1
  ))) {
    throw new Error("simulator API summary has invalid weapon aggregates");
  }
  if (summary.turnStats.some((turn) => (
    !turn
    || !Number.isSafeInteger(turn.turn)
    || turn.turn < 0
    || !Number.isSafeInteger(turn.games)
    || turn.games < 0
    || !isFiniteNonNegative(turn.avgCardsPlayed)
    || !isFiniteNonNegative(turn.avgMemorySpent)
    || !isFiniteNonNegative(turn.avgReserveSpent)
    || !isFiniteNonNegative(turn.avgDamageDealt)
    || !isFiniteNonNegative(turn.avgDamageTaken)
    || !isFiniteNonNegative(turn.avgHealed)
    || !isFiniteNonNegative(turn.avgLevel)
    || !isFiniteNonNegative(turn.avgHp)
  ))) {
    throw new Error("simulator API summary has invalid turn aggregates");
  }
}

export async function exportSimulatorSummary(): Promise<void> {
  const baseUrl = process.env.GATCG_SIMULATOR_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("GATCG_SIMULATOR_API_URL is required for the simulator export");
  const response = await fetch(`${baseUrl}/v1/grand-archive/analytics/summary`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`simulator API returned HTTP ${response.status}`);
  const summary: unknown = await response.json();
  assertSummary(summary);

  const outputDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/simulator");
  await mkdir(outputDirectory, { recursive: true });
  await writeJsonAtomic(path.join(outputDirectory, "summary.json"), summary);
  console.log(`simulator: published summary for ${summary.games} games`);
}
