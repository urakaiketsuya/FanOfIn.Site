import { buildSpiritCanonicalNames, type ArchetypeData, type ArchetypeElementBreakdown, type ArchetypeSpiritBreakdown, type ArchetypeSummary, type BattleChartEntry, type TopCardsBySection } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { tallySectionCounts, topCardsFromCounts, type DeckSignature, type SectionCardCount } from "./decklists.js";
import type { AnalysisContext } from "./context.js";
import { config } from "../config.js";

const MAX_SAMPLE_DECKS = 5;
const MAX_TOP_CARDS_PER_SECTION = 12;

interface SectionAccumBucket {
  deckCount: number;
  mainCounts: Map<string, SectionCardCount>;
  materialCounts: Map<string, SectionCardCount>;
  sideboardCounts: Map<string, SectionCardCount>;
}

function newBucket(): SectionAccumBucket {
  return { deckCount: 0, mainCounts: new Map(), materialCounts: new Map(), sideboardCounts: new Map() };
}

function tallyIntoBucket(bucket: SectionAccumBucket, sig: DeckSignature): void {
  bucket.deckCount += 1;
  tallySectionCounts(bucket.mainCounts, sig.mainCards);
  tallySectionCounts(bucket.materialCounts, sig.materialCards);
  tallySectionCounts(bucket.sideboardCounts, sig.sideboardCards);
}

function bucketToTopCards(bucket: SectionAccumBucket, cardIndex: Map<string, CardSignature>): TopCardsBySection {
  return {
    main: topCardsFromCounts(bucket.mainCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
    material: topCardsFromCounts(bucket.materialCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
    sideboard: topCardsFromCounts(bucket.sideboardCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
  };
}

interface ArchetypeAccum {
  classes: string[];
  elements: string[];
  deckCount: number;
  events: Set<number>;
  winRateSum: number;
  winRateN: number;
  sampleDecks: { eventId: number; player: number }[];
  mainCounts: Map<string, SectionCardCount>;
  materialCounts: Map<string, SectionCardCount>;
  sideboardCounts: Map<string, SectionCardCount>;
  /** Keyed by Spirit card name (e.g. "Spirit of Water"). */
  spirits: Map<string, SectionAccumBucket>;
  spiritElements: Map<string, string | null>;
  /** Keyed by Spirit element (e.g. "WATER"), aggregating across every Spirit sharing that element. */
  elementBuckets: Map<string, SectionAccumBucket>;
}

function newAccum(classes: string[], elements: string[]): ArchetypeAccum {
  return {
    classes,
    elements,
    deckCount: 0,
    events: new Set<number>(),
    winRateSum: 0,
    winRateN: 0,
    sampleDecks: [],
    mainCounts: new Map<string, SectionCardCount>(),
    materialCounts: new Map<string, SectionCardCount>(),
    sideboardCounts: new Map<string, SectionCardCount>(),
    spirits: new Map<string, SectionAccumBucket>(),
    spiritElements: new Map<string, string | null>(),
    elementBuckets: new Map<string, SectionAccumBucket>(),
  };
}

function accumulateDeck(a: ArchetypeAccum, sig: DeckSignature, eventId: number, player: number, winRate: number | undefined): void {
  a.deckCount += 1;
  a.events.add(eventId);
  if (winRate !== undefined) {
    a.winRateSum += winRate;
    a.winRateN += 1;
  }
  if (a.sampleDecks.length < MAX_SAMPLE_DECKS) a.sampleDecks.push({ eventId, player });
  tallySectionCounts(a.mainCounts, sig.mainCards);
  tallySectionCounts(a.materialCounts, sig.materialCards);
  tallySectionCounts(a.sideboardCounts, sig.sideboardCards);
}

function buildSummaries(accum: Map<string, ArchetypeAccum>, cardIndex: Map<string, CardSignature>): ArchetypeSummary[] {
  return Array.from(accum.entries())
    .map(([signature, a]) => ({
      signature,
      classes: a.classes,
      elements: a.elements,
      deckCount: a.deckCount,
      eventCount: a.events.size,
      avgWinRate: a.winRateN > 0 ? a.winRateSum / a.winRateN : 0,
      sampleDecks: a.sampleDecks,
      topCards: {
        main: topCardsFromCounts(a.mainCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
        material: topCardsFromCounts(a.materialCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
        sideboard: topCardsFromCounts(a.sideboardCounts, MAX_TOP_CARDS_PER_SECTION, cardIndex),
      },
      spirits: Array.from(a.spirits.entries())
        .map(
          ([spiritName, bucket]): ArchetypeSpiritBreakdown => ({
            spiritName,
            spiritElement: a.spiritElements.get(spiritName) ?? null,
            deckCount: bucket.deckCount,
            topCards: bucketToTopCards(bucket, cardIndex),
          }),
        )
        .sort((x, y) => y.deckCount - x.deckCount),
      elementBreakdown: Array.from(a.elementBuckets.entries())
        .map(
          ([element, bucket]): ArchetypeElementBreakdown => ({
            element,
            deckCount: bucket.deckCount,
            topCards: bucketToTopCards(bucket, cardIndex),
          }),
        )
        .sort((x, y) => y.deckCount - x.deckCount),
    }))
    .filter((a) => a.deckCount >= config.minBattleChartSampleSize)
    .sort((a, b) => b.deckCount - a.deckCount);
}

/**
 * Groups decks into archetypes by their identified Champion (see decklists.ts's
 * `findChampionName`) and tallies a champion-vs-champion battle chart from pairings where both
 * sides had a public decklist and an identifiable Champion. Decks with no identifiable Champion
 * (the card is simply missing from the submitted decklist — verified this isn't a matching bug)
 * are excluded rather than grouped by a class+element fallback, since that string isn't a real
 * Champion identity. Archetypes/matchups below `config.minBattleChartSampleSize` are suppressed
 * as noise.
 *
 * Named Spirit companions (e.g. "Kaze, Spirit of Wind" — has a personal name, unlike the generic
 * "Spirit of Wind") are additionally tracked as their own Champion-like identity in `namedSpirits`
 * — same full stats shape as a real Champion, aggregated across every deck that runs that Spirit
 * regardless of which Champion (if any) is present. Not mutually exclusive with `archetypes`: a
 * deck with both a real Champion and a named Spirit counts toward both.
 */
export function computeArchetypeAnalysis(
  bundles: OmnidexEventBundle[],
  ctx: AnalysisContext,
): Omit<ArchetypeData, "generatedAt"> {
  const archetypeAccum = new Map<string, ArchetypeAccum>();
  const namedSpiritAccum = new Map<string, ArchetypeAccum>();
  const battleAccum = new Map<string, BattleChartEntry>();
  // Folds named-alter Spirit prints (e.g. "Aithne, Spirit of Fire") into their base "Spirit of
  // Fire" population for the per-Champion Spirit breakdown below — without this, the Champion
  // Synergy page's Spirit filter shows every named alter as its own separate, thin option instead
  // of joining the shared base population it's mechanically identical to. `namedSpiritAccum`
  // below is intentionally exempt: it exists specifically to track named Spirits as their own
  // distinct identity, so it must keep the raw (uncanonicalized) name.
  const spiritCanonicalNames = buildSpiritCanonicalNames(Array.from(ctx.cardIndex.values()));

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);

    const winByPlayer = new Map<number, number>();
    if (!("error" in bundle.standings)) {
      for (const s of bundle.standings.standings) {
        if (s.id === undefined) continue; // team-format standings are keyed by team name, not player id
        const total = s.statsWins + s.statsLosses + s.statsTies;
        if (total > 0) winByPlayer.set(s.id, s.statsWins / total);
      }
    }

    for (const [player, sig] of signatures) {
      const winRate = winByPlayer.get(player);

      if (sig.championName) {
        const a = archetypeAccum.get(sig.championName) ?? newAccum(sig.classes, sig.elements);
        accumulateDeck(a, sig, bundle.id, player, winRate);

        if (sig.spiritName) {
          const canonicalSpiritName = spiritCanonicalNames.get(sig.spiritName) ?? sig.spiritName;
          const spiritBucket = a.spirits.get(canonicalSpiritName) ?? newBucket();
          tallyIntoBucket(spiritBucket, sig);
          a.spirits.set(canonicalSpiritName, spiritBucket);
          a.spiritElements.set(canonicalSpiritName, sig.spiritElement);

          if (sig.spiritElement) {
            const elementBucket = a.elementBuckets.get(sig.spiritElement) ?? newBucket();
            tallyIntoBucket(elementBucket, sig);
            a.elementBuckets.set(sig.spiritElement, elementBucket);
          }
        }

        archetypeAccum.set(sig.championName, a);
      }

      if (sig.spiritName?.includes(",")) {
        const s = namedSpiritAccum.get(sig.spiritName) ?? newAccum(sig.classes, sig.elements);
        accumulateDeck(s, sig, bundle.id, player, winRate);
        namedSpiritAccum.set(sig.spiritName, s);
      }
    }

    for (const roundData of bundle.pairingsByRound) {
      if ("error" in roundData) continue;
      for (const pairing of roundData.pairings) {
        if (pairing.pairing.length !== 2) continue;
        const [sideA, sideB] = pairing.pairing;
        const sigA = signatures.get(sideA.id)?.championName;
        const sigB = signatures.get(sideB.id)?.championName;
        if (!sigA || !sigB) continue;

        const [x, y, xSide, ySide] = sigA <= sigB ? [sigA, sigB, sideA, sideB] : [sigB, sigA, sideB, sideA];
        const key = `${x}__${y}`;
        const entry = battleAccum.get(key) ?? { a: x, b: y, aWins: 0, bWins: 0, ties: 0, games: 0 };
        entry.games += 1;
        if (xSide.status === "winner") entry.aWins += 1;
        else if (ySide.status === "winner") entry.bWins += 1;
        else entry.ties += 1;
        battleAccum.set(key, entry);
      }
    }
  }

  const archetypes = buildSummaries(archetypeAccum, ctx.cardIndex);
  const namedSpirits = buildSummaries(namedSpiritAccum, ctx.cardIndex);
  const battleChart = Array.from(battleAccum.values()).filter((b) => b.games >= config.minBattleChartSampleSize);

  return { archetypes, namedSpirits, battleChart };
}
