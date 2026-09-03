import type { Card, CardImpactEntry, CardQuantityBucket } from "@gatcg/shared";
import { legalMaxCopies, pickBetterQuantity } from "../../lib/cardQuantityAdvice";

export type TrimSection = "main" | "material" | "sideboard";

/** A small ranking nudge (not a driver) toward cutting from a cost bucket the deck is already
 * stacked on, applied on top of Card Impact lift — mirrors the existing curve-aware nudges used
 * elsewhere in the Deck Builder's own scoring (see docs/CALCULATIONS.md). */
const CURVE_PEAK_NUDGE = -0.02;

/** Above this size a section is considered "over target" and worth surfacing trim suggestions
 * for, even though only Material/Sideboard are illegal past their own caps — a 60+ Main deck is a
 * consistency concern, not a legality one, so this tool treats 60 as Main's advisory target. */
export const TRIM_TARGET_SIZE: Record<TrimSection, number> = { main: 60, material: 12, sideboard: 15 };

export interface TrimCandidate {
  cardName: string;
  /** Copies this suggestion proposes removing. */
  cutQuantity: number;
  /** Copies that remain in the section after this cut (0 = drop the card entirely). */
  remainingQuantity: number;
  reason: "quantity-surplus" | "low-impact" | "no-data";
  detail: string;
  adjustedLift: number | null;
  priceEach: number | null;
}

export interface TrimPlan {
  section: TrimSection;
  unit: "cards" | "points";
  currentSize: number;
  targetSize: number;
  overBy: number;
  /** Ordered worst-to-cut-first; cumulative cutQuantity (in `unit`s) across this list covers at
   * least `overBy`, plus a few optional extras for choice. */
  candidates: TrimCandidate[];
}

const MAX_CANDIDATES = 12;

/** Names of the non-Champion cards sharing this section's most-populous cost bucket for one
 * currency (Memory or Reserve) — the "curve peak" `computeTrimPlan`'s nudge cuts from first. */
export function computeCurvePeakCardNames(lines: { cardName: string; quantity: number }[], cardsByName: Map<string, Card>, costField: "cost_memory" | "cost_reserve"): Set<string> {
  const counts = new Map<number, number>();
  const bucketByName = new Map<string, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.cardName);
    const cost = card?.[costField];
    if (!card || card.types.includes("CHAMPION") || cost === null || cost === undefined || cost < 0) continue;
    counts.set(cost, (counts.get(cost) ?? 0) + line.quantity);
    bucketByName.set(line.cardName, cost);
  }
  if (counts.size === 0) return new Set();
  const [peakBucket] = [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
  return new Set([...bucketByName.entries()].filter(([, bucket]) => bucket === peakBucket).map(([name]) => name));
}

/**
 * Ranks a deck section's cards for trimming toward `targetSize`, combining three already-computed
 * site signals rather than a new one: quantity-vs-optimal (`pickBetterQuantity`), Champion-scoped
 * Card Impact lift (`adjustedLift`), and — as a minor tiebreak nudge, not a driver — whether a card
 * sits in the deck's own most-crowded cost bucket. Price is disclosed per candidate but never
 * ranks it: this stays a "what hurts the deck least" tool, not a budget-cutting one. Returns null
 * when the section isn't over `targetSize`.
 */
export function computeTrimPlan(
  section: TrimSection,
  lines: { cardName: string; quantity: number }[],
  cardsByName: Map<string, Card>,
  targetSize: number,
  options: {
    impactByName?: Map<string, CardImpactEntry>;
    quantityBucketsByName?: Map<string, CardQuantityBucket[]>;
    priceByName?: Map<string, number | null>;
    curvePeakCardNames?: Set<string>;
    pointCost?: (card: Card | undefined) => number;
  } = {},
): TrimPlan | null {
  const pointCost = options.pointCost ?? (() => 1);
  const unitCost = (cardName: string) => (section === "sideboard" ? pointCost(cardsByName.get(cardName)) : 1);
  const currentSize = lines.reduce((sum, line) => sum + line.quantity * unitCost(line.cardName), 0);
  const overBy = currentSize - targetSize;
  if (overBy <= 0) return null;

  const remainingByName = new Map(lines.map((line) => [line.cardName, line.quantity]));
  const candidates: TrimCandidate[] = [];

  // Tier 1: quantity surplus — a strictly evidence-backed trim (this exact card already performs
  // better at a lower count), so these always lead regardless of lift.
  for (const line of lines) {
    const card = cardsByName.get(line.cardName);
    const advice = pickBetterQuantity(line.quantity, options.quantityBucketsByName?.get(line.cardName), legalMaxCopies(card));
    if (!advice || advice.quantity >= line.quantity) continue;
    const cutQuantity = line.quantity - advice.quantity;
    candidates.push({
      cardName: line.cardName,
      cutQuantity,
      remainingQuantity: advice.quantity,
      reason: "quantity-surplus",
      detail: `${advice.quantity}x outperforms ${line.quantity}x (${(advice.adjustedWinRate * 100).toFixed(0)}% adjusted win rate, n=${advice.sampleSize}).`,
      adjustedLift: options.impactByName?.get(line.cardName)?.adjustedLift ?? null,
      priceEach: options.priceByName?.get(line.cardName) ?? null,
    });
    remainingByName.set(line.cardName, advice.quantity);
  }

  // Tier 2: whole-card removal, ranked by adjustedLift (most negative first). Cards without a
  // Card Impact entry (too little data) sort after every scored card, disclosed as "no-data".
  type Scored = { cardName: string; score: number | null; priceEach: number | null; lift: number | null };
  const scored: Scored[] = [];
  for (const [cardName, quantity] of remainingByName) {
    if (quantity <= 0) continue;
    const lift = options.impactByName?.get(cardName)?.adjustedLift ?? null;
    const nudge = options.curvePeakCardNames?.has(cardName) ? CURVE_PEAK_NUDGE : 0;
    scored.push({ cardName, score: lift === null ? null : lift + nudge, priceEach: options.priceByName?.get(cardName) ?? null, lift });
  }
  scored.sort((a, b) => {
    if (a.score !== null && b.score !== null) return a.score - b.score;
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return (b.priceEach ?? 0) - (a.priceEach ?? 0);
  });

  for (const entry of scored) {
    const quantity = remainingByName.get(entry.cardName) ?? 0;
    if (quantity <= 0) continue;
    candidates.push({
      cardName: entry.cardName,
      cutQuantity: quantity,
      remainingQuantity: 0,
      reason: entry.lift === null ? "no-data" : "low-impact",
      detail: entry.lift === null
        ? "Not enough tournament data on this card to rank its impact — review by hand."
        : `${entry.lift >= 0 ? "+" : ""}${(entry.lift * 100).toFixed(1)}% win-rate lift vs. decks without it.`,
      adjustedLift: entry.lift,
      priceEach: entry.priceEach,
    });
  }

  // Trim the list to roughly what's needed to reach target, plus a few extra for choice.
  let cumulative = 0;
  let cutoffIndex = candidates.length;
  for (let i = 0; i < candidates.length; i++) {
    cumulative += candidates[i].cutQuantity * unitCost(candidates[i].cardName);
    if (cumulative >= overBy) { cutoffIndex = i + 1; break; }
  }
  const trimmed = candidates.slice(0, Math.min(MAX_CANDIDATES, cutoffIndex + 3));

  return {
    section,
    unit: section === "sideboard" ? "points" : "cards",
    currentSize,
    targetSize,
    overBy,
    candidates: trimmed,
  };
}
