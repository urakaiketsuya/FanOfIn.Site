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

export interface TimedProbabilityRequirementGroup extends ProbabilityRequirementGroup {
  /** Number of cards that may be seen before this requirement's deadline. */
  seen: number;
  /** Optional upper bound. Used by Avoid conditions; omitted means no upper bound. */
  maximum?: number;
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

/**
 * Exact probability for disjoint requirements that may have different access deadlines. The deck
 * is exposed one card at a time; when a group's deadline passes, its successful states are folded
 * into the undifferentiated remainder of the library. This preserves the dependency between groups
 * without treating their individual odds as independent.
 */
export function probabilityOfTimedRecipe(deckSize: number, groups: TimedProbabilityRequirementGroup[]): number {
  const n = Math.max(0, Math.floor(deckSize));
  if (n === 0 || groups.length === 0) return 0;
  const normalized = groups.map((group) => ({
    copies: Math.max(0, Math.floor(group.copies)),
    required: Math.max(0, Math.floor(group.required)),
    maximum: group.maximum == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(group.maximum)),
    seen: Math.max(0, Math.min(n, Math.floor(group.seen))),
  }));
  if (normalized.reduce((sum, group) => sum + group.copies, 0) > n || normalized.some((group) => group.copies < group.required || group.seen < group.required || group.maximum < group.required)) return 0;

  const lastDraw = Math.max(...normalized.map((group) => group.seen));
  let states = new Map<string, { counts: number[]; probability: number }>([[normalized.map(() => 0).join(","), { counts: normalized.map(() => 0), probability: 1 }]]);
  for (let draw = 1; draw <= lastDraw; draw++) {
    const remainingCards = n - draw + 1;
    const next = new Map<string, { counts: number[]; probability: number }>();
    const add = (counts: number[], probability: number) => {
      const key = counts.join(",");
      const prior = next.get(key);
      next.set(key, { counts, probability: (prior?.probability ?? 0) + probability });
    };
    for (const state of states.values()) {
      let explicitRemaining = 0;
      for (let index = 0; index < normalized.length; index++) if (normalized[index].seen >= draw) explicitRemaining += normalized[index].copies - state.counts[index];
      const otherRemaining = remainingCards - explicitRemaining;
      if (otherRemaining > 0) add([...state.counts], state.probability * otherRemaining / remainingCards);
      for (let index = 0; index < normalized.length; index++) {
        const group = normalized[index];
        if (group.seen < draw) continue;
        const available = group.copies - state.counts[index];
        if (available <= 0) continue;
        const counts = [...state.counts];
        counts[index]++;
        add(counts, state.probability * available / remainingCards);
      }
    }
    states = new Map();
    for (const state of next.values()) {
      let valid = true;
      const counts = [...state.counts];
      for (let index = 0; index < normalized.length; index++) {
        const group = normalized[index];
        if (group.seen !== draw) continue;
        if (counts[index] < group.required || counts[index] > group.maximum) { valid = false; break; }
        counts[index] = group.required;
      }
      if (!valid) continue;
      const key = counts.join(",");
      const prior = states.get(key);
      states.set(key, { counts, probability: (prior?.probability ?? 0) + state.probability });
    }
  }
  return Math.max(0, Math.min(1, [...states.values()].reduce((sum, state) => sum + state.probability, 0)));
}

/** First number of cards seen at which a recipe reaches the requested consistency target. */
export function cardsSeenForRecipeTarget(deckSize: number, groups: ProbabilityRequirementGroup[], target: number): number | null {
  for (let seen = 1; seen <= deckSize; seen++) if (probabilityOfRecipe(deckSize, groups, seen) >= target) return seen;
  return null;
}

/** Expected cards seen before every recipe requirement is satisfied (tail-sum expectation). */
export function expectedCardsSeenForRecipe(deckSize: number, groups: ProbabilityRequirementGroup[]): number | null {
  if (deckSize <= 0 || groups.length === 0 || groups.some((group) => group.copies < group.required)) return null;
  let expected = 0;
  for (let seen = 0; seen < deckSize; seen++) expected += 1 - probabilityOfRecipe(deckSize, groups, seen);
  return expected;
}

/** Exact without-replacement chance of seeing anchor A and at least one card from option group B. */
export function conditionalComboOdds(deckSize: number, anchorCopies: number, optionCopies: number, seen: number): ConditionalComboOdds {
  const draws = Math.max(0, Math.min(seen, deckSize));
  const anchors = Math.max(0, Math.min(anchorCopies, deckSize));
  const options = Math.max(0, Math.min(optionCopies, deckSize - anchors));
  const probability = probabilityOfRecipe(deckSize, [{ copies: anchors, required: 1 }, { copies: options, required: 1 }], draws);
  return { anchorCopies: anchors, optionCopies: options, probability: Math.max(0, Math.min(1, probability)), seen: draws };
}
