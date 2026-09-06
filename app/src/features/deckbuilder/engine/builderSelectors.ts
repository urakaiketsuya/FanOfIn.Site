import type { ArchetypeTaxonomyData, Card, CompositionWinRateData, CompositionWinRateStat, OmnidexDecklist } from "@gatcg/shared";
import type { SuggestedBuild, SuggestedCard } from "../useSuggestedBuild";
import type { ArchetypeTuningOption } from "../model/builderTypes";

export function applyCollectionConstraints(
  build: SuggestedBuild,
  ownedByName: ReadonlyMap<string, number>,
): SuggestedBuild {
  const cap = (cards: SuggestedCard[]) => cards.flatMap((card) => {
    if (card.locked) return [card];
    const quantity = Math.min(card.quantity, ownedByName.get(card.cardName) ?? 0);
    return quantity > 0 ? [{ ...card, quantity }] : [];
  });
  const material = cap(build.material);
  const main = cap(build.main);
  const sideboard = cap(build.sideboard);
  return {
    ...build,
    material,
    main,
    sideboard,
    suggestions: cap(build.suggestions),
    unresolved: {
      main: build.unresolved.main + total(build.main) - total(main),
      material: build.unresolved.material + total(build.material) - total(material),
      sideboard: build.unresolved.sideboard + total(build.sideboard) - total(sideboard),
    },
  };
}

export interface ReviewGroups {
  pairs: { removal: SuggestedCard; addition: SuggestedCard }[];
  unpairedRemovals: SuggestedCard[];
  unpairedSuggestions: SuggestedCard[];
}

/**
 * Every card the engine would place if nothing were treated as already-decided — the auto-filled
 * Main/Material/Sideboard entries that aren't locked yet (`SuggestedCard.locked === false`), plus
 * the ordinary leftover-ranked `suggestions`. The full Guided Deck Builder never needs this (its
 * auto-fill already IS the deck, so only genuine leftovers go through Review) — this exists for a
 * suggestions-only surface where nothing is committed until the viewer explicitly accepts it, so an
 * unlocked auto-fill pick is exactly as much "just a suggestion" as an unplaced leftover one.
 */
export function derivePendingSuggestions(build: SuggestedBuild): SuggestedCard[] {
  const unplacedFromFill = [...build.main, ...build.material, ...build.sideboard].filter((card) => !card.locked);
  return [...unplacedFromFill, ...build.suggestions];
}

export function deriveReviewGroups(removals: SuggestedCard[], suggestions: SuggestedCard[]): ReviewGroups {
  const available = [...suggestions];
  const pairs: ReviewGroups["pairs"] = [];
  const unpairedRemovals: SuggestedCard[] = [];
  for (const removal of removals) {
    const contextualName = removal.contextualReplacement?.cardName;
    const matchIndex = contextualName
      ? available.findIndex((addition) => addition.cardName === contextualName)
      : available.findIndex((addition) => addition.section === removal.section);
    if (matchIndex < 0) unpairedRemovals.push(removal);
    else pairs.push({ removal, addition: available.splice(matchIndex, 1)[0] });
  }
  return { pairs, unpairedRemovals, unpairedSuggestions: available };
}

export function buildToDecklist(build: Pick<SuggestedBuild, "main" | "material" | "sideboard">, keptOnly = false): OmnidexDecklist {
  const lines = (cards: SuggestedCard[]) => cards
    .filter((card) => !keptOnly || card.locked)
    .map((card) => ({ card: card.cardName, quantity: card.quantity }));
  return { main: lines(build.main), material: lines(build.material), sideboard: lines(build.sideboard) };
}

export function calculateLinePrice(lines: { name: string; quantity: number }[], priceByName: ReadonlyMap<string, number>) {
  let sum = 0;
  let missing = 0;
  for (const line of lines) {
    const unit = priceByName.get(line.name);
    if (unit === undefined) missing += 1;
    else sum += unit * line.quantity;
  }
  return { sum, missing };
}

function total(cards: SuggestedCard[]) {
  return cards.reduce((sum, card) => sum + card.quantity, 0);
}

const COMPOSITION_MIN_BUCKET_SAMPLE = 30;
const COMPOSITION_GAP_FLOOR = 0.02;

export interface CompositionGap {
  type: string;
  currentPct: number;
  currentBucket: string;
  currentWinRate: number;
  bestBucket: string;
  bestWinRate: number;
  gap: number;
}

export function computeCompositionGaps(
  mainLines: { name: string; quantity: number }[],
  cardsByName: ReadonlyMap<string, Card>,
  compositionWinRateData: CompositionWinRateData | undefined,
): CompositionGap[] {
  if (!compositionWinRateData || mainLines.length === 0) return [];
  const typeCounts = new Map<string, number>();
  let totalCards = 0;
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card) continue;
    totalCards += line.quantity;
    for (const type of card.types) typeCounts.set(type, (typeCounts.get(type) ?? 0) + line.quantity);
  }
  if (totalCards === 0) return [];
  const byType = new Map<string, CompositionWinRateStat[]>();
  for (const stat of compositionWinRateData.stats) byType.set(stat.type, [...(byType.get(stat.type) ?? []), stat]);
  const gaps: CompositionGap[] = [];
  for (const [type, buckets] of byType) {
    const eligible = buckets.filter((bucket) => bucket.deckCount >= COMPOSITION_MIN_BUCKET_SAMPLE);
    if (eligible.length === 0) continue;
    const currentPct = ((typeCounts.get(type) ?? 0) / totalCards) * 100;
    const currentLabel = compositionBucketLabel(currentPct);
    const current = eligible.find((bucket) => bucket.bucket === currentLabel);
    if (!current) continue;
    const best = eligible.reduce((left, right) => right.adjustedWinRate > left.adjustedWinRate ? right : left);
    const gap = best.adjustedWinRate - current.adjustedWinRate;
    if (gap >= COMPOSITION_GAP_FLOOR && best.bucket !== currentLabel) gaps.push({ type, currentPct, currentBucket: currentLabel, currentWinRate: current.adjustedWinRate, bestBucket: best.bucket, bestWinRate: best.adjustedWinRate, gap });
  }
  return gaps.sort((left, right) => right.gap - left.gap);
}

function compositionBucketLabel(percent: number): string {
  const lower = Math.min(90, Math.floor(percent / 10) * 10);
  return `${lower}-${lower + 10}%`;
}

export function deriveArchetypeOptions(championName: string | null, taxonomy: ArchetypeTaxonomyData | undefined): ArchetypeTuningOption[] {
  if (!championName || !taxonomy) return [];
  return taxonomy.clusters
    .filter((cluster) => cluster.championName === championName || (cluster.championBreakdown ?? []).some((entry) => entry.championName === championName))
    .map((cluster) => {
      const route = taxonomy.materialArchetypes?.find((candidate) => candidate.id === cluster.materialArchetypeId);
      return { id: cluster.id, name: cluster.name, routeName: route?.name ?? cluster.championName, routeDeckCount: route?.deckCount ?? cluster.deckCount, deckCount: cluster.deckCount, confidence: cluster.confidence ?? "established" };
    })
    .sort((left, right) => Number(right.confidence === "established") - Number(left.confidence === "established") || right.deckCount - left.deckCount || left.name.localeCompare(right.name));
}
