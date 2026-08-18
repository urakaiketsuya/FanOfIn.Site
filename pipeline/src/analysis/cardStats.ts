import type { CardStat } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { config } from "../config.js";

const RECENT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Accum {
  deckCount: number;
  totalCopies: number;
  events: Set<number>;
  winRateSum: number;
  winRateN: number;
  recentDeckCount: number;
  priorDeckCount: number;
}

/**
 * Card appearance/win-rate stats across every event with public decklists + standings.
 * "Hot" cards can be derived downstream by comparing recentDeckCount to priorDeckCount;
 * money-card filtering happens in build.ts by joining this against data/prices.json.
 */
export function computeCardStats(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): CardStat[] {
  const referenceMs = bundles.reduce((max, b) => Math.max(max, new Date(b.event.date).getTime()), 0);
  const recentCutoff = referenceMs - RECENT_WINDOW_DAYS * DAY_MS;
  const priorCutoff = referenceMs - 2 * RECENT_WINDOW_DAYS * DAY_MS;

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

    const eventMs = new Date(bundle.event.date).getTime();
    const isRecent = eventMs >= recentCutoff;
    const isPrior = eventMs >= priorCutoff && eventMs < recentCutoff;

    for (const entry of bundle.decklists) {
      const winRate = winByPlayer.get(entry.player);
      const copiesByName = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        copiesByName.set(line.card, (copiesByName.get(line.card) ?? 0) + line.quantity);
      }

      for (const [name, copies] of copiesByName) {
        const a = accum.get(name) ?? {
          deckCount: 0,
          totalCopies: 0,
          events: new Set<number>(),
          winRateSum: 0,
          winRateN: 0,
          recentDeckCount: 0,
          priorDeckCount: 0,
        };
        a.deckCount += 1;
        a.totalCopies += copies;
        a.events.add(bundle.id);
        if (winRate !== undefined) {
          a.winRateSum += winRate;
          a.winRateN += 1;
        }
        if (isRecent) a.recentDeckCount += 1;
        if (isPrior) a.priorDeckCount += 1;
        accum.set(name, a);
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;

  return Array.from(accum.entries())
    .map(([name, a]) => {
      const avgWinRate = a.winRateN > 0 ? a.winRateSum / a.winRateN : 0;
      return {
        name,
        slug: cardIndex.get(name)?.slug ?? null,
        deckCount: a.deckCount,
        totalCopies: a.totalCopies,
        eventCount: a.events.size,
        avgWinRate,
        adjustedWinRate: (a.winRateSum + prior * 0.5) / (a.winRateN + prior),
        recentDeckCount: a.recentDeckCount,
        priorDeckCount: a.priorDeckCount,
        marketPrice: null, // filled in by build.ts, which joins against data/prices.json
      };
    })
    .sort((a, b) => b.deckCount - a.deckCount);
}
