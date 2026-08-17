import type { PlayerDeckProfile, PlayerTopChampion } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures, tallySectionCounts, topCardsFromCounts, type SectionCardCount } from "./decklists.js";

const TOP_CHAMPIONS = 5;
const MAX_TOP_CARDS_PER_SECTION = 12;

interface Accum {
  totalDecks: number;
  championCounts: Map<string, number>;
  mainCounts: Map<string, SectionCardCount>;
  materialCounts: Map<string, SectionCardCount>;
  sideboardCounts: Map<string, SectionCardCount>;
}

/**
 * Per-player aggregation across every public decklist they submitted: which Champions they
 * play most, and which cards show up most often in their decks (by how many decks include the
 * card, not raw copies, so a 4-of doesn't outweigh being a staple across many different decks),
 * broken out by main/material/sideboard since those are structurally different card pools.
 */
export function computePlayerDeckProfiles(
  bundles: OmnidexEventBundle[],
  cardIndex: Map<string, CardSignature>,
): PlayerDeckProfile[] {
  const byPlayer = new Map<number, Accum>();

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);

    for (const entry of bundle.decklists) {
      const acc = byPlayer.get(entry.player) ?? {
        totalDecks: 0,
        championCounts: new Map<string, number>(),
        mainCounts: new Map<string, SectionCardCount>(),
        materialCounts: new Map<string, SectionCardCount>(),
        sideboardCounts: new Map<string, SectionCardCount>(),
      };
      acc.totalDecks += 1;

      const sig = signatures.get(entry.player);
      if (sig?.championName) acc.championCounts.set(sig.championName, (acc.championCounts.get(sig.championName) ?? 0) + 1);
      if (sig) {
        tallySectionCounts(acc.mainCounts, sig.mainCards);
        tallySectionCounts(acc.materialCounts, sig.materialCards);
        tallySectionCounts(acc.sideboardCounts, sig.sideboardCards);
      }

      byPlayer.set(entry.player, acc);
    }
  }

  return Array.from(byPlayer.entries()).map(([playerId, acc]) => {
    const topChampions: PlayerTopChampion[] = Array.from(acc.championCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CHAMPIONS)
      .map(([name, deckCount]) => ({ name, deckCount }));

    return {
      playerId,
      totalDecks: acc.totalDecks,
      topChampions,
      topCards: {
        main: topCardsFromCounts(acc.mainCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
        material: topCardsFromCounts(acc.materialCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
        sideboard: topCardsFromCounts(acc.sideboardCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
      },
    };
  });
}
