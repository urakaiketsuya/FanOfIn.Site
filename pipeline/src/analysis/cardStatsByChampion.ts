import type { CardStatByChampion, ChampionCardStats } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { AnalysisContext } from "./context.js";
import { config } from "../config.js";

interface CardAccum {
  deckCount: number;
  totalCopies: number;
  winRateSum: number;
  winRateN: number;
}

interface ChampionAccum {
  winRateSum: number;
  winRateN: number;
  cards: Map<string, CardAccum>;
}

/**
 * Per-Champion card win rates: does running card X correlate with a higher win rate specifically
 * among THIS Champion's own decks — an absolute number, unlike `computeCardStats` (pools every
 * Champion meta-wide, so it can't answer "is this card good for Alice specifically") and unlike
 * Card Impact (a with/without lift, not a plain win rate). Reuses `ctx.getEventSignatures` for
 * Champion detection and resolved card lines, same as `archetypes.ts`, rather than re-walking raw
 * decklists and re-deriving Champion identity independently.
 */
export function computeCardStatsByChampion(bundles: OmnidexEventBundle[], ctx: AnalysisContext): ChampionCardStats[] {
  const accum = new Map<string, ChampionAccum>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);

    const winByPlayer = new Map<number, number>();
    if (!("error" in bundle.standings)) {
      for (const s of bundle.standings.standings) {
        if (s.id === undefined) continue; // team-format standings are keyed by team name, not player id
        const total = s.statsWins + s.statsLosses + s.statsTies;
        if (total > 0) winByPlayer.set(s.id, (s.statsWins + s.statsTies * 0.5) / total);
      }
    }

    for (const [player, sig] of signatures) {
      if (!sig.championName) continue;
      const winRate = winByPlayer.get(player);

      const champ = accum.get(sig.championName) ?? { winRateSum: 0, winRateN: 0, cards: new Map<string, CardAccum>() };
      if (winRate !== undefined) {
        champ.winRateSum += winRate;
        champ.winRateN += 1;
      }

      // Main + material only — sideboard is situational tech, same "deck identity" convention
      // used everywhere else in this codebase.
      const copiesByName = new Map<string, number>();
      for (const line of [...sig.mainCards, ...sig.materialCards]) {
        copiesByName.set(line.name, (copiesByName.get(line.name) ?? 0) + line.quantity);
      }
      for (const [name, copies] of copiesByName) {
        const a = champ.cards.get(name) ?? { deckCount: 0, totalCopies: 0, winRateSum: 0, winRateN: 0 };
        a.deckCount += 1;
        a.totalCopies += copies;
        if (winRate !== undefined) {
          a.winRateSum += winRate;
          a.winRateN += 1;
        }
        champ.cards.set(name, a);
      }

      accum.set(sig.championName, champ);
    }
  }

  const prior = config.winRateShrinkagePriorWeight;

  return Array.from(accum.entries())
    .map(([championName, champ]): ChampionCardStats => {
      // The shrinkage target for every card below is this Champion's own average, not a flat
      // 50% — same reasoning cardImpact.ts documents for ClusterCardImpact.baselineWinRate.
      const baselineWinRate = champ.winRateN > 0 ? champ.winRateSum / champ.winRateN : 0;
      const cards: CardStatByChampion[] = Array.from(champ.cards.entries())
        .map(([name, a]): CardStatByChampion => ({
          name,
          slug: ctx.cardIndex.get(name)?.slug ?? null,
          deckCount: a.deckCount,
          totalCopies: a.totalCopies,
          avgWinRate: a.winRateN > 0 ? a.winRateSum / a.winRateN : 0,
          // Shrinks toward baselineWinRate rather than a flat 50% — reduces to baselineWinRate
          // itself when winRateN is 0, same shape as shrinkWinRate's own formula with a custom
          // target instead of 0.5.
          adjustedWinRate: (a.winRateSum + prior * baselineWinRate) / (a.winRateN + prior),
        }))
        .sort((a, b) => b.deckCount - a.deckCount);
      return { championName, deckCount: champ.winRateN, baselineWinRate, cards };
    })
    .sort((a, b) => b.deckCount - a.deckCount);
}
