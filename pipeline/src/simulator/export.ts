import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SimulatorSummary } from "@gatcg/shared";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

function assertSummary(value: unknown): asserts value is SimulatorSummary {
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
  if (!Array.isArray(summary.champions) || !Array.isArray(summary.matchups)) {
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
