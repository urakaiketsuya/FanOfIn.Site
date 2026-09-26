import type { ConfidenceTier } from "./analysis-types.js";

export const PACKAGE_CONFIDENCE_TIER_LABELS: Record<ConfidenceTier, string> = {
  strong: "Strong sample",
  limited: "Limited sample",
  exploratory: "Exploratory",
  textOnly: "Text-only — no deck confirmation yet",
};

export interface ConfidenceTierThreshold {
  tier: Exclude<ConfidenceTier, "textOnly">;
  minMatches: number;
}

// 12 preserves every currently-published package candidate's tier as "strong" — this cascade
// changes zero existing rows, it only adds looser tiers beneath them. 4 matches
// computePackageCandidates' own existing champion-cohort reporting floor
// (Math.max(3, Math.floor(minMatches / 3))). 1 means at least one real deck actually ran both
// cards. Thresholds must be supplied strictest (largest minMatches) first.
export const DEFAULT_PACKAGE_CONFIDENCE_TIERS: ConfidenceTierThreshold[] = [
  { tier: "strong", minMatches: 12 },
  { tier: "limited", minMatches: 4 },
  { tier: "exploratory", minMatches: 1 },
];

/**
 * Scores an anchor/member relationship against the tightest confidence tier its match count
 * clears, instead of a single hard cutoff that silently drops everything below it. Returns
 * `null` when no tier is cleared (matching count is 0, or below the loosest tier supplied) —
 * the caller decides whether to fall back to a `"textOnly"` entry (see
 * `useDeckWinConditions.ts`) or drop the candidate entirely (see `computePackageCandidates`).
 */
export function scoreTieredPackageConfidence(
  matchingCount: number,
  anchorCount: number,
  memberCount: number,
  populationCount: number,
  tiers: ConfidenceTierThreshold[] = DEFAULT_PACKAGE_CONFIDENCE_TIERS,
): { confidence: number; lift: number; tier: Exclude<ConfidenceTier, "textOnly"> } | null {
  const cleared = tiers.find((t) => matchingCount >= t.minMatches);
  if (!cleared) return null;
  const confidence = anchorCount > 0 ? matchingCount / anchorCount : 0;
  const baseline = populationCount > 0 ? memberCount / populationCount : 0;
  return { confidence, lift: baseline > 0 ? confidence / baseline : 0, tier: cleared.tier };
}

export interface PackageConditionGroup { cards: string[]; minimum: number }
export interface PackageReviewRule { requiredCards: string[]; groups: PackageConditionGroup[] }

/** Groups are independent requirements; a shared card can satisfy each group containing it. */
export function matchesPackageRule(cards: ReadonlySet<string>, rule: PackageReviewRule): boolean {
  return rule.requiredCards.every((card) => cards.has(card)) && rule.groups.every((group) =>
    new Set(group.cards.filter((card) => cards.has(card))).size >= group.minimum);
}

export function measurePackageRule(decks: ReadonlySet<string>[], rule: PackageReviewRule) {
  const anchorDecks = decks.filter((cards) => rule.requiredCards.every((card) => cards.has(card))).length;
  const optionDecks = decks.filter((cards) => matchesPackageRule(cards, { ...rule, requiredCards: [] })).length;
  const matchingDecks = decks.filter((cards) => matchesPackageRule(cards, rule)).length;
  const confidence = anchorDecks ? matchingDecks / anchorDecks : null;
  const baseline = decks.length ? optionDecks / decks.length : 0;
  return { matchingDecks, anchorDecks, populationDecks: decks.length, confidence,
    lift: confidence !== null && baseline > 0 ? confidence / baseline : null };
}
