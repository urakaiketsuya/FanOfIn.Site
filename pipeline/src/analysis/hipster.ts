import type { DeckHipsterScore, PlayerHipsterScore } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";

export interface HipsterResult {
  deckScores: DeckHipsterScore[];
  playerScores: PlayerHipsterScore[];
}

/**
 * Novelty score: for each deck (processed in chronological order), how rare its cards were
 * *within its own Champion's field* up to that point — comparing against the whole
 * cross-archetype field would mostly just measure how identifiable a champion's cards are
 * (nearly every card in an Alice list is "rare" if the comparison set includes every other
 * champion's decks too), which isn't the intended signal. The interesting question is "is this
 * an unusual build of THIS champion," so the running field is tracked per champion. Decks within
 * the same event are scored against the field as it stood before that event, not each other.
 */
export function computeHipsterScores(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): HipsterResult {
  const sorted = [...bundles].sort((a, b) => a.event.date.localeCompare(b.event.date));

  const fieldCountsByChampion = new Map<string, Map<string, number>>();
  const totalDecksByChampion = new Map<string, number>();
  const deckScores: DeckHipsterScore[] = [];
  const playerAccum = new Map<number, { sum: number; n: number }>();

  for (const bundle of sorted) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);

    const deckInfos = bundle.decklists
      .map((entry) => ({
        player: entry.player,
        championName: signatures.get(entry.player)?.championName,
        names: new Set([...entry.decklist.main, ...entry.decklist.material].map((l) => l.card)),
      }))
      .filter((d): d is { player: number; championName: string; names: Set<string> } => Boolean(d.championName) && d.names.size > 0);

    for (const { player, championName, names } of deckInfos) {
      const fieldCounts = fieldCountsByChampion.get(championName) ?? new Map<string, number>();
      const totalSoFar = totalDecksByChampion.get(championName) ?? 0;

      let noveltySum = 0;
      for (const name of names) {
        const seenCount = fieldCounts.get(name) ?? 0;
        noveltySum += totalSoFar === 0 ? 1 : Math.max(0, 1 - seenCount / totalSoFar);
      }
      const score = noveltySum / names.size;
      deckScores.push({ eventId: bundle.id, eventName: bundle.event.name, eventDate: bundle.event.date, player, championName, score });

      const acc = playerAccum.get(player) ?? { sum: 0, n: 0 };
      acc.sum += score;
      acc.n += 1;
      playerAccum.set(player, acc);
    }

    for (const { championName, names } of deckInfos) {
      const fieldCounts = fieldCountsByChampion.get(championName) ?? new Map<string, number>();
      for (const name of names) fieldCounts.set(name, (fieldCounts.get(name) ?? 0) + 1);
      fieldCountsByChampion.set(championName, fieldCounts);
      totalDecksByChampion.set(championName, (totalDecksByChampion.get(championName) ?? 0) + 1);
    }
  }

  const playerScores = Array.from(playerAccum.entries())
    .map(([playerId, { sum, n }]) => ({ playerId, avgScore: sum / n, deckCount: n }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return { deckScores, playerScores };
}
