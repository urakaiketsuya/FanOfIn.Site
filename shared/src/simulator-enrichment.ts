import type { SimulatorSummary } from "./simulator-types.js";

/** Resolve known catalog identities without changing simulator IDs or aggregates. */
export function enrichSimulatorNames(summary: SimulatorSummary, cards: readonly { uuid: string; name: string }[]): SimulatorSummary {
  const names = new Map(cards.map(card => [card.uuid, card.name]));
  const name = (id: string, supplied: string | null) => names.get(id) ?? (supplied?.trim() || null);
  return { ...summary,
    champions: summary.champions.map(row => ({ ...row, championName: name(row.championId, row.championName) })),
    matchups: summary.matchups.map(row => ({ ...row, champion1Name: name(row.champion1, row.champion1Name), champion2Name: name(row.champion2, row.champion2Name) })),
  };
}
