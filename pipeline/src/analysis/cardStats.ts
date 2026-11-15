import { shrinkWinRate, type CardAdoptionPeriods, type CardStat } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import { resolveCard, type CardSignature } from "../cards/catalog.js";
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

function hasAvailableMain(entry: { decklist: { main: { card: string; quantity: number }[] } }): boolean {
  return entry.decklist.main.some(line => line.card.trim() && Number.isFinite(line.quantity) && line.quantity > 0);
}

/** End of the latest available-list event's UTC calendar day. Categories share this anchor. */
export function cardStatsReferenceEnd(bundles: OmnidexEventBundle[]): number | null {
  const dates = bundles.filter(b => !("error" in b.decklists) && b.decklists.some(hasAvailableMain))
    .map(b => Date.parse(b.event.date)).filter(Number.isFinite);
  if (!dates.length) return null;
  return Math.floor(dates.reduce((latest, date) => Math.max(latest, date), -Infinity) / DAY_MS) * DAY_MS + DAY_MS;
}

export function computeCardStats(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): CardStat[] {
  return computeCardStatsReport(bundles, cardIndex).cards;
}

/** Main + Material sightings; both periods use all available Main lists as population. */
export function computeCardStatsReport(
  bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>,
  referenceEnd: number | null = cardStatsReferenceEnd(bundles),
): { cards: CardStat[]; decksConsidered: number; adoptionPeriods?: CardAdoptionPeriods } {
  const recentCutoff = referenceEnd === null ? NaN : referenceEnd - RECENT_WINDOW_DAYS * DAY_MS;
  const priorCutoff = recentCutoff - RECENT_WINDOW_DAYS * DAY_MS;
  let recentDecks = 0;
  let priorDecks = 0;
  const seen = new Set<string>();
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
    const isRecent = eventMs >= recentCutoff && eventMs < (referenceEnd ?? NaN);
    const isPrior = eventMs >= priorCutoff && eventMs < recentCutoff;

    for (const entry of bundle.decklists) {
      if (!hasAvailableMain(entry)) continue;
      const id = `${bundle.id}:${entry.player}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (isRecent) recentDecks++;
      if (isPrior) priorDecks++;
      const winRate = winByPlayer.get(entry.player);
      const copiesByName = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        if (!line.card.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0) continue;
        // Resolve to the catalog's canonical name — this file reads raw decklists directly
        // (doesn't go through decklists.ts), so a mis-cased/curly-quote submission would
        // otherwise silently create its own disconnected entry with no slug or price.
        const name = resolveCard(cardIndex, line.card)?.name ?? line.card;
        copiesByName.set(name, (copiesByName.get(name) ?? 0) + line.quantity);
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

  const cards = Array.from(accum.entries())
    .map(([name, a]) => {
      const { avgWinRate, adjustedWinRate } = shrinkWinRate(a.winRateSum, a.winRateN, prior);
      return {
        name,
        slug: cardIndex.get(name)?.slug ?? null,
        deckCount: a.deckCount,
        totalCopies: a.totalCopies,
        eventCount: a.events.size,
        avgWinRate,
        adjustedWinRate,
        recentDeckCount: a.recentDeckCount,
        priorDeckCount: a.priorDeckCount,
        marketPrice: null, // filled in by build.ts, which joins against data/prices.json
      };
    })
    .sort((a, b) => b.deckCount - a.deckCount);
  return {
    cards,
    decksConsidered: seen.size,
    ...(referenceEnd === null ? {} : { adoptionPeriods: {
      recent: { start: new Date(recentCutoff).toISOString(), end: new Date(referenceEnd).toISOString(), decks: recentDecks },
      prior: { start: new Date(priorCutoff).toISOString(), end: new Date(recentCutoff).toISOString(), decks: priorDecks },
    } }),
  };
}
