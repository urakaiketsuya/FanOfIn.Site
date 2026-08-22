import { useMemo } from "react";
import type { ArchetypeCluster } from "@gatcg/shared";
import { combinedCardCounts, weightedJaccard, type DecodedDeck } from "../../lib/decodedDecks";

/**
 * Same threshold as the pipeline's own `CLUSTER_THRESHOLD` (`pipeline/src/analysis/archetypeTaxonomy.ts`)
 * — intentionally, since it's the bar already validated (real-data-verified against 55,840 decks
 * this session) for "is this really the same archetype, not just superficially similar." Not a new
 * concept, just applied to a deck this cluster's own exact-signature clustering never had a chance
 * to compare against a centroid at all (see docs/CALCULATIONS.md's Archetype taxonomy section and
 * this feature's own doc comment below for why most real decks fall into that gap).
 */
const VARIANT_SIMILARITY_THRESHOLD = 0.45;
const MAX_VARIANTS = 30;
/** A card the archetype typically runs (present in this share of its own member decks or more) that a variant lacks is worth flagging as "missing" — same bar as the pipeline's `DEFINING_MIN_IN_CLUSTER`, just applied to every card the cluster commonly runs, not only the curated `definingCards` subset (which additionally excludes universal staples — not the right exclusion for "what does this variant's list lack," where a missing staple is still worth surfacing). */
const TYPICAL_PRESENCE_THRESHOLD = 0.8;
/** A card present in fewer than this share of the archetype's own decks is uncommon enough to call out as a real tech choice specific to this variant, not just build-to-build noise (a 1-of card a couple of players happen to run). */
const UNUSUAL_PRESENCE_THRESHOLD = 0.2;

export interface ArchetypeVariant {
  deckId: string;
  championName: string | null;
  spiritName: string | null;
  winRate: number;
  similarity: number;
  /** In this deck, but not one of the cluster's own defining cards. */
  addedCards: string[];
  /** One of the cluster's defining cards, but not in this deck. */
  missingCards: string[];
  main: Map<string, number>;
  material: Map<string, number>;
  sideboard: Map<string, number>;
}

/**
 * Real decks that are close to (but not exact copies of) a published archetype cluster — the
 * ~88% of real decks `computeArchetypeTaxonomy` never gets a chance to fuzzy-match at all, because
 * it only clusters *between* decks that already share an exact duplicate from another player.
 * Real-data-verified: of the decks that never land in any cluster this way, ~78% score ≥0.45
 * weighted-Jaccard against a real published cluster's centroid — the same bar the pipeline itself
 * uses to decide two builds are "the same archetype."
 *
 * Deliberately **not** folded into the cluster's own `avgWinRate`/`definingCards`/`metaShare` —
 * those stay exactly as published, computed only from the tight exact-duplicate population. This
 * hook is purely additive: real, individually-inspectable decks, shown as variants rather than
 * blended into one softer number.
 */
export function useArchetypeVariants(cluster: ArchetypeCluster | undefined, decks: DecodedDeck[]): ArchetypeVariant[] {
  return useMemo((): ArchetypeVariant[] => {
    if (!cluster || decks.length === 0) return [];

    const clusterDeckIds = new Set(cluster.deckIds);

    // Centroid (avg copies per member deck) for weighted-Jaccard scoring, and presence rate
    // (fraction of member decks running the card at all, any copy count) for the diff — two
    // different questions ("how similar is this deck overall" vs. "does this deck run what the
    // archetype typically runs"), so two different tallies over the same member decks.
    const centroid = new Map<string, number>();
    const presenceCount = new Map<string, number>();
    let memberCount = 0;
    for (const deck of decks) {
      if (!clusterDeckIds.has(deck.deckId)) continue;
      const combined = combinedCardCounts(deck);
      for (const [name, qty] of combined) {
        centroid.set(name, (centroid.get(name) ?? 0) + qty);
        presenceCount.set(name, (presenceCount.get(name) ?? 0) + 1);
      }
      memberCount += 1;
    }
    if (memberCount === 0) return [];
    for (const [name, total] of centroid) centroid.set(name, total / memberCount);

    const typicalCards = new Set(
      Array.from(presenceCount.entries())
        .filter(([, count]) => count / memberCount >= TYPICAL_PRESENCE_THRESHOLD)
        .map(([name]) => name),
    );
    const unusualCards = new Set(
      Array.from(presenceCount.entries())
        .filter(([, count]) => count / memberCount < UNUSUAL_PRESENCE_THRESHOLD)
        .map(([name]) => name),
    );

    const variants: ArchetypeVariant[] = [];
    for (const deck of decks) {
      if (clusterDeckIds.has(deck.deckId)) continue;
      const combined = combinedCardCounts(deck);
      const similarity = weightedJaccard(combined, centroid);
      if (similarity < VARIANT_SIMILARITY_THRESHOLD) continue;

      // "Added" = genuinely uncommon for this archetype (present in this variant, rare or unseen
      // among the archetype's own decks) — a real tech choice, not just any non-defining card.
      // "Missing" = a card the archetype typically runs that this variant simply doesn't have.
      const addedCards = Array.from(combined.keys()).filter((name) => unusualCards.has(name) || !presenceCount.has(name));
      const missingCards = Array.from(typicalCards).filter((name) => !combined.has(name));

      variants.push({
        deckId: deck.deckId,
        championName: deck.championName,
        spiritName: deck.spiritName,
        winRate: deck.winRate,
        similarity,
        addedCards,
        missingCards,
        main: deck.main,
        material: deck.material,
        sideboard: deck.sideboard,
      });
    }

    variants.sort((a, b) => b.similarity - a.similarity);
    return variants.slice(0, MAX_VARIANTS);
  }, [cluster, decks]);
}
