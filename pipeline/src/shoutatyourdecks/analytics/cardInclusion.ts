import type { CardInclusionData, CardInclusionEntry, DeckLine, ShoutAtYourDecksDeck } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";
import { config } from "../../config.js";

type Section = "main" | "material" | "sideboard";

function tally(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CardInclusionEntry[] {
  const deckCounts = new Map<string, number>();
  const copyCounts = new Map<string, number>();
  const resolvedFlag = new Map<string, boolean>();
  const sectionCounts = new Map<string, Record<Section, number>>();

  const tallyLine = (line: DeckLine, section: Section, seenThisDeck: Set<string>) => {
    const card = resolveCard(cardIndex, line.name);
    const key = card?.name ?? line.name;
    if (!resolvedFlag.has(key)) resolvedFlag.set(key, Boolean(card));
    // Sideboard is excluded from copyCounts/deckCounts (deck-identity convention, see
    // docs/CALCULATIONS.md), but still tracked in sectionCounts — a card seen almost exclusively
    // in the sideboard should report that as its primarySection, not "mixed".
    if (section !== "sideboard") {
      copyCounts.set(key, (copyCounts.get(key) ?? 0) + line.quantity);
      if (!seenThisDeck.has(key)) {
        seenThisDeck.add(key);
        deckCounts.set(key, (deckCounts.get(key) ?? 0) + 1);
      }
    }
    const sections = sectionCounts.get(key) ?? { main: 0, material: 0, sideboard: 0 };
    sections[section] += line.quantity;
    sectionCounts.set(key, sections);
  };

  for (const deck of decks) {
    const seenThisDeck = new Set<string>();
    for (const line of deck.materialDeck) tallyLine(line, "material", seenThisDeck);
    for (const line of deck.mainDeck) tallyLine(line, "main", seenThisDeck);
    for (const line of deck.sideDeck) tallyLine(line, "sideboard", seenThisDeck);
  }

  const totalDecks = decks.length;
  return Array.from(deckCounts.entries())
    .map(([name, deckCount]) => {
      const sections = sectionCounts.get(name) ?? { main: 0, material: 0, sideboard: 0 };
      const sectionTotal = sections.main + sections.material + sections.sideboard;
      const shares: { section: Section; count: number }[] = [
        { section: "main", count: sections.main },
        { section: "material", count: sections.material },
        { section: "sideboard", count: sections.sideboard },
      ];
      const dominant = shares.find((s) => sectionTotal > 0 && s.count / sectionTotal >= 0.8);
      return {
        name,
        resolved: resolvedFlag.get(name) ?? false,
        deckCount,
        percentOfDecks: totalDecks > 0 ? deckCount / totalDecks : 0,
        totalCopies: copyCounts.get(name) ?? 0,
        avgCopiesWhenIncluded: (copyCounts.get(name) ?? 0) / deckCount,
        primarySection: (dominant?.section ?? "mixed") as CardInclusionEntry["primarySection"],
      };
    })
    .sort((a, b) => b.deckCount - a.deckCount);
}

export function computeCardInclusion(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CardInclusionData {
  const byChampion: Record<string, { deckCount: number; cards: CardInclusionEntry[] }> = {};
  const decksByChampion = new Map<string, ShoutAtYourDecksDeck[]>();
  for (const deck of decks) {
    const champion = deck.champion ?? "unknown";
    const list = decksByChampion.get(champion);
    if (list) list.push(deck);
    else decksByChampion.set(champion, [deck]);
  }

  for (const [champion, championDecks] of decksByChampion) {
    if (championDecks.length < config.sydMinChampionSampleSize) continue;
    byChampion[champion] = { deckCount: championDecks.length, cards: tally(championDecks, cardIndex) };
  }

  return {
    generatedAt: new Date().toISOString(),
    decksConsidered: decks.length,
    overall: tally(decks, cardIndex),
    byChampion,
  };
}
