import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

export interface SimulatorSummary {
  schemaVersion: 1;
  source: "GrandArchiveSim";
  generatedAt: string;
  games: number;
  firstPlayer: { games: number; wins: number; winRate: number | null };
  champions: Array<{
    championId: string;
    element: string;
    games: number;
    wins: number;
    winRate: number | null;
  }>;
  matchups: Array<{
    champion1: string;
    champion2: string;
    games: number;
    champion1Wins: number;
    champion2Wins: number;
  }>;
}

function assertSummary(value: unknown): asserts value is SimulatorSummary {
  if (!value || typeof value !== "object") throw new Error("simulator API returned a non-object");
  const summary = value as Partial<SimulatorSummary>;
  if (summary.schemaVersion !== 1 || summary.source !== "GrandArchiveSim") {
    throw new Error("simulator API returned an unsupported summary schema");
  }
  if (typeof summary.generatedAt !== "string" || typeof summary.games !== "number") {
    throw new Error("simulator API summary is missing required metadata");
  }
  if (!Array.isArray(summary.champions) || !Array.isArray(summary.matchups)) {
    throw new Error("simulator API summary is missing aggregate arrays");
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
