import { computeKeywordComposition, type KeywordStat } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { config } from "../config.js";

interface Accum {
  deckCount: number;
  events: Set<number>;
  winRateSum: number;
  winRateN: number;
}

/**
 * Ability-keyword appearance/win-rate stats across every event with public decklists + standings —
 * same accumulation shape as `computeCardStats`, just grouped by keyword (via `computeKeywordComposition`)
 * instead of by card name, so "which keywords actually win" is a real, sortable meta-wide stat instead
 * of only being answerable per single deck.
 */
export function computeKeywordStats(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): KeywordStat[] {
  const accum = new Map<string, Accum>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;

    const winByPlayer = new Map<number, number>();
    if (!("error" in bundle.standings)) {
      for (const s of bundle.standings.standings) {
        if (s.id === undefined) continue; // team-format standings are keyed by team name, not player id
        const total = s.statsWins + s.statsLosses + s.statsTies;
        if (total > 0) winByPlayer.set(s.id, (s.statsWins + s.statsTies * 0.5) / total);
      }
    }

    for (const entry of bundle.decklists) {
      const winRate = winByPlayer.get(entry.player);
      const lines = [...entry.decklist.main, ...entry.decklist.material].map((l) => ({ name: l.card, quantity: l.quantity }));
      const keywordCounts = computeKeywordComposition(lines, cardIndex);

      for (const keyword of keywordCounts.keys()) {
        const a = accum.get(keyword) ?? { deckCount: 0, events: new Set<number>(), winRateSum: 0, winRateN: 0 };
        a.deckCount += 1;
        a.events.add(bundle.id);
        if (winRate !== undefined) {
          a.winRateSum += winRate;
          a.winRateN += 1;
        }
        accum.set(keyword, a);
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;

  return Array.from(accum.entries())
    .map(([keyword, a]) => {
      const avgWinRate = a.winRateN > 0 ? a.winRateSum / a.winRateN : 0;
      return {
        keyword,
        deckCount: a.deckCount,
        eventCount: a.events.size,
        avgWinRate,
        adjustedWinRate: (a.winRateSum + prior * 0.5) / (a.winRateN + prior),
      };
    })
    .sort((a, b) => b.deckCount - a.deckCount);
}
