import type {
  CardDeckReferencesData,
  CardInclusionData,
  CardInclusionEntry,
  CommunityCoOccurrenceData,
  CommunityCoOccurrenceEntry,
  CommunitySourceCounts,
  DeckEraData,
  PopularityData,
  PriceDistributionData,
  ShoutAtYourDecksArchetypeClusteringData,
  CommunityFormatSummaryData,
  DeckFormat,
  ShoutAtYourDecksDeckSummary,
} from "@gatcg/shared";
import { usePublishedData } from "../../lib/sync/usePublishedData";

/** Standalone ShoutAtYourDecks-derived stats — deliberately separate from every Omnidex-derived hook elsewhere in this app (see docs/CALCULATIONS.md, "ShoutAtYourDecks analytics"). */
function formatPath(format: DeckFormat, file: string): string {
  return `/data/shoutatyourdecks/analytics/${format === "PANTHEON" ? "pantheon/" : ""}${file}.json`;
}

/** Blended ShoutAtYourDecks + Sleeved community population — see pipeline/src/community/blend.ts
 * and docs/CALCULATIONS.md, "Community population (blended)". Every site-facing community stat
 * (Community usage badges, Card Stats "Hype gap", Guided Deck Builder's Community population) reads
 * from here rather than `formatPath` above, which stays ShoutAtYourDecks-only. Pair with
 * `useCommunitySourceCounts` to disclose the per-source split rather than presenting this as
 * single-sourced. */
function blendedPath(format: DeckFormat, file: string): string {
  return `/data/community/${format === "PANTHEON" ? "pantheon/" : ""}${file}.json`;
}

export function useCommunityBlendedCardInclusion(format: DeckFormat = "STANDARD") {
  return usePublishedData<CardInclusionData>(`community-blended-card-inclusion-${format}`, blendedPath(format, "card-inclusion"));
}

export function useCommunityBlendedCoOccurrence(format: DeckFormat = "STANDARD") {
  return usePublishedData<CommunityCoOccurrenceData>(`community-blended-co-occurrence-${format}`, blendedPath(format, "co-occurrence"));
}

export function useCommunityBlendedDeckReferences() {
  return usePublishedData<CardDeckReferencesData>("community-blended-deck-references", "/data/community/deck-references.json");
}

export function useCommunitySourceCounts() {
  return usePublishedData<CommunitySourceCounts>("community-source-counts", "/data/community/sources.json");
}

export function useCommunityCardInclusion(format: DeckFormat = "STANDARD") {
  return usePublishedData<CardInclusionData>(`shoutatyourdecks-card-inclusion-${format}`, formatPath(format, "card-inclusion"));
}

export function useCommunityCoOccurrence(format: DeckFormat = "STANDARD") {
  return usePublishedData<CommunityCoOccurrenceData>(`shoutatyourdecks-co-occurrence-${format}`, formatPath(format, "co-occurrence"));
}

export function useCommunityPopularity(format: DeckFormat = "STANDARD") {
  return usePublishedData<PopularityData>(`shoutatyourdecks-popularity-${format}`, formatPath(format, "popularity"));
}

export function useCommunityPriceDistribution(format: DeckFormat = "STANDARD") {
  return usePublishedData<PriceDistributionData>(
    `shoutatyourdecks-price-distribution-${format}`,
    formatPath(format, "price-distribution"),
  );
}

export function useCommunityArchetypes(format: DeckFormat = "STANDARD") {
  return usePublishedData<ShoutAtYourDecksArchetypeClusteringData>(
    `shoutatyourdecks-archetypes-${format}`,
    formatPath(format, "archetypes"),
  );
}

export function useCommunityDeckEra(format: DeckFormat = "STANDARD") {
  return usePublishedData<DeckEraData>(`shoutatyourdecks-deck-era-${format}`, formatPath(format, "deck-era"));
}

export function useCommunityFormatSummary() {
  return usePublishedData<CommunityFormatSummaryData>("shoutatyourdecks-format-summary", "/data/shoutatyourdecks/analytics/format-summary.json");
}

export function useCommunityDeckIndex() {
  // The root index remains available between community analytics rebuilds; Pantheon browsing
  // filters its classified records locally and therefore does not disappear during a partial run.
  return usePublishedData<{ generatedAt: string; decks: ShoutAtYourDecksDeckSummary[] }>("shoutatyourdecks-index", "/data/shoutatyourdecks/index.json");
}

export function usePantheonDeckIndex() {
  return usePublishedData<{ generatedAt: string; decks: ShoutAtYourDecksDeckSummary[] }>("shoutatyourdecks-pantheon-decks", "/data/shoutatyourdecks/analytics/pantheon/decks.json");
}

/**
 * "Diao Chan" -> "diao-chan" — a *prefix*, not a full key, into `CardInclusionData.byChampion` /
 * `CommunityCoOccurrenceData.byChampion`. Those are keyed by ShoutAtYourDecks' own per-print
 * champion slug (e.g. "diao-chan-enchantress"), not this app's base Champion names ("Diao Chan",
 * from the tournament pipeline) — confirmed empirically that every real key today carries a print
 * suffix, so a bare `byChampion[championToSlug(name)]` lookup never matches. Use
 * `championSlugsFor` below to resolve every matching print instead.
 */
export function championToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Every real `byChampion` key belonging to this base Champion name — a Champion can have multiple prints in the community data (e.g. two different Diana prints), and this app's picker only knows the base name, so all matching prints must be combined rather than picking one arbitrarily. */
export function championSlugsFor(byChampionKeys: string[], baseName: string): string[] {
  const base = championToSlug(baseName);
  return byChampionKeys.filter((key) => key === base || key.startsWith(`${base}-`));
}

/** Combines multiple champions' (i.e. multiple prints') card-inclusion buckets into one, deck-count-weighted so `percentOfDecks`/`avgCopiesWhenIncluded` stay correct across the merge rather than being an average-of-averages. `primarySection` isn't recomputable from this shape (the source section counts aren't kept per entry) — approximated as whichever contributing print had the most decks for that card. */
export function mergeCardInclusionBuckets(buckets: { deckCount: number; cards: CardInclusionEntry[] }[]): { deckCount: number; cards: CardInclusionEntry[] } {
  const deckCount = buckets.reduce((sum, bucket) => sum + bucket.deckCount, 0);
  const merged = new Map<string, { deckCount: number; totalCopies: number; resolved: boolean; primarySection: CardInclusionEntry["primarySection"]; primarySectionWeight: number }>();
  for (const bucket of buckets) {
    for (const card of bucket.cards) {
      const existing = merged.get(card.name);
      if (existing) {
        existing.deckCount += card.deckCount;
        existing.totalCopies += card.totalCopies;
        existing.resolved = existing.resolved || card.resolved;
        if (card.deckCount > existing.primarySectionWeight) {
          existing.primarySection = card.primarySection;
          existing.primarySectionWeight = card.deckCount;
        }
      } else {
        merged.set(card.name, { deckCount: card.deckCount, totalCopies: card.totalCopies, resolved: card.resolved, primarySection: card.primarySection, primarySectionWeight: card.deckCount });
      }
    }
  }
  const cards = Array.from(merged.entries())
    .map(([name, m]): CardInclusionEntry => ({
      name,
      resolved: m.resolved,
      deckCount: m.deckCount,
      percentOfDecks: deckCount > 0 ? m.deckCount / deckCount : 0,
      totalCopies: m.totalCopies,
      avgCopiesWhenIncluded: m.deckCount > 0 ? m.totalCopies / m.deckCount : 0,
      primarySection: m.primarySection,
    }))
    .sort((a, b) => b.deckCount - a.deckCount);
  return { deckCount, cards };
}

/** Combines multiple prints' co-occurrence lists for one specific key card into one, summing raw counts (not averaging rates) and recomputing `coOccurrenceRate` against the caller-supplied combined deck count for that key card — same reasoning as `mergeCardInclusionBuckets`. */
export function mergeCoOccurrenceForCard(
  buckets: Record<string, CommunityCoOccurrenceEntry[]>[],
  cardName: string,
  keyCardDeckCount: number,
): CommunityCoOccurrenceEntry[] {
  const counts = new Map<string, number>();
  for (const bucket of buckets) {
    for (const entry of bucket[cardName] ?? []) counts.set(entry.cardName, (counts.get(entry.cardName) ?? 0) + entry.count);
  }
  return Array.from(counts.entries())
    .map(([buddyName, count]): CommunityCoOccurrenceEntry => ({ cardName: buddyName, count, coOccurrenceRate: keyCardDeckCount > 0 ? count / keyCardDeckCount : 0 }))
    .sort((a, b) => b.count - a.count);
}
