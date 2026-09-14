export interface ConditionalComboOdds {
  anchorCopies: number;
  optionCopies: number;
  probability: number;
  seen: number;
}

export interface ProbabilityRequirementGroup {
  /** Mutually interchangeable cards in this OR group, expressed as their combined copies. */
  copies: number;
  /** Minimum cards from this group needed. Every group is joined with AND. */
  required: number;
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const smaller = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= smaller; i++) result = (result * (n - smaller + i)) / i;
  return result;
}

/**
 * Exact multivariate-hypergeometric probability for an AND of disjoint requirement groups. Cards
 * inside one group are OR alternatives; `required: 2` means any two cards from that group. A card
 * should occur in only one group so its copies are not counted twice.
 */
export function probabilityOfRecipe(deckSize: number, groups: ProbabilityRequirementGroup[], seen: number): number {
  if (deckSize <= 0 || groups.length === 0) return 0;
  const draws = Math.max(0, Math.min(seen, deckSize));
  const normalized = groups.map((group) => ({
    copies: Math.max(0, Math.floor(group.copies)),
    required: Math.max(1, Math.floor(group.required)),
  }));
  const groupedCopies = normalized.reduce((sum, group) => sum + group.copies, 0);
  if (groupedCopies > deckSize || normalized.some((group) => group.copies < group.required)) return 0;
  const otherCopies = deckSize - groupedCopies;
  const denominator = choose(deckSize, draws);
  if (denominator === 0) return 0;

  let successfulWays = 0;
  const visit = (index: number, usedDraws: number, ways: number) => {
    if (index === normalized.length) {
      const otherDraws = draws - usedDraws;
      if (otherDraws >= 0 && otherDraws <= otherCopies) successfulWays += ways * choose(otherCopies, otherDraws);
      return;
    }
    const group = normalized[index];
    const maxHits = Math.min(group.copies, draws - usedDraws);
    for (let hits = group.required; hits <= maxHits; hits++) visit(index + 1, usedDraws + hits, ways * choose(group.copies, hits));
  };
  visit(0, 0, 1);
  return Math.max(0, Math.min(1, successfulWays / denominator));
}

/** First number of cards seen at which a recipe reaches the requested consistency target. */
export function cardsSeenForRecipeTarget(deckSize: number, groups: ProbabilityRequirementGroup[], target: number): number | null {
  for (let seen = 1; seen <= deckSize; seen++) if (probabilityOfRecipe(deckSize, groups, seen) >= target) return seen;
  return null;
}

/** Exact without-replacement chance of seeing anchor A and at least one card from option group B. */
export function conditionalComboOdds(deckSize: number, anchorCopies: number, optionCopies: number, seen: number): ConditionalComboOdds {
  const draws = Math.max(0, Math.min(seen, deckSize));
  const anchors = Math.max(0, Math.min(anchorCopies, deckSize));
  const options = Math.max(0, Math.min(optionCopies, deckSize - anchors));
  const probability = probabilityOfRecipe(deckSize, [{ copies: anchors, required: 1 }, { copies: options, required: 1 }], draws);
  return { anchorCopies: anchors, optionCopies: options, probability: Math.max(0, Math.min(1, probability)), seen: draws };
}
