import type { CardQuantityStat } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import { resolveCard, type CardSignature } from "../cards/catalog.js";
import { config } from "../config.js";

interface QuantityAccum {
  deckCount: number;
  winRateSum: number;
  winRateN: number;
}

/**
 * For each card, win rate broken out by how many copies a deck ran it at — answers "does running
 * 4x actually win more than 2x" directly, instead of only ever seeing a card's single overall
 * average (computeCardStats). Same per-deck accumulation shape as computeCardStats, just keyed by
 * (card, quantity) instead of just card.
 */
export function computeCardQuantityStats(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): CardQuantityStat[] {
  const accum = new Map<string, Map<number, QuantityAccum>>();

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
      const copiesByName = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        const name = resolveCard(cardIndex, line.card)?.name ?? line.card;
        copiesByName.set(name, (copiesByName.get(name) ?? 0) + line.quantity);
      }

      for (const [name, copies] of copiesByName) {
        let byQuantity = accum.get(name);
        if (!byQuantity) {
          byQuantity = new Map<number, QuantityAccum>();
          accum.set(name, byQuantity);
        }
        const a = byQuantity.get(copies) ?? { deckCount: 0, winRateSum: 0, winRateN: 0 };
        a.deckCount += 1;
        if (winRate !== undefined) {
          a.winRateSum += winRate;
          a.winRateN += 1;
        }
        byQuantity.set(copies, a);
      }
    }
  }

  const prior = config.winRateShrinkagePriorWeight;
  const result: CardQuantityStat[] = [];

  for (const [name, byQuantity] of accum) {
    const quantities = Array.from(byQuantity.entries())
      .map(([quantity, a]) => ({
        quantity,
        deckCount: a.deckCount,
        avgWinRate: a.winRateN > 0 ? a.winRateSum / a.winRateN : 0,
        adjustedWinRate: (a.winRateSum + prior * 0.5) / (a.winRateN + prior),
      }))
      .sort((a, b) => a.quantity - b.quantity);
    // A card only ever run at one quantity has nothing to compare — same "don't show a
    // comparison with only one side" reasoning used everywhere else in this codebase.
    if (quantities.length < 2) continue;
    result.push({ name, slug: cardIndex.get(name)?.slug ?? null, quantities });
  }

  return result.sort(
    (a, b) => b.quantities.reduce((n, q) => n + q.deckCount, 0) - a.quantities.reduce((n, q) => n + q.deckCount, 0),
  );
}
