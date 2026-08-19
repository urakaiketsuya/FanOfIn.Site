import type { CardImpactEntry, CardImpactRole } from "./analysis-types.js";

export interface DeckSections {
  main: Set<string>;
  material: Set<string>;
  sideboard: Set<string>;
}

export interface CardSectionRow {
  sections: DeckSections;
  /** 1 = win, 0.5 = tie, 0 = loss (or an event-aggregate win rate, for a general/non-matchup caller). */
  outcome: number;
}

/**
 * Core with/without/shrink/role computation for a single card against a given row population:
 * split rows into "with"/"without" buckets by whether they contain `cardName` (any section),
 * shrink each bucket's average outcome toward `baseline` (not a flat 50%) using the standard
 * Bayesian-average shape, return `null` unless both buckets clear `minSample`, and classify the
 * card's role from whichever section accounts for >=80% of its "with" appearances.
 *
 * Factored out of `computeCardImpactEntries` so a caller that only needs one specific card's
 * number against a specific (often pre-filtered) row set — e.g. "answer card" scoring, which asks
 * about one candidate card within an already-narrowed population — doesn't have to pay for or
 * discard every other card's computation.
 */
export function computeSingleCardImpact(rows: CardSectionRow[], cardName: string, baseline: number, prior: number, minSample: number): CardImpactEntry | null {
  let withSum = 0;
  let withN = 0;
  let withoutSum = 0;
  let withoutN = 0;
  let mainCount = 0;
  let materialCount = 0;
  let sideboardCount = 0;

  for (const { sections, outcome } of rows) {
    const inMain = sections.main.has(cardName);
    const inMaterial = sections.material.has(cardName);
    const inSideboard = sections.sideboard.has(cardName);

    if (inMain || inMaterial || inSideboard) {
      withSum += outcome;
      withN++;
      if (inMain) mainCount++;
      if (inMaterial) materialCount++;
      if (inSideboard) sideboardCount++;
    } else {
      withoutSum += outcome;
      withoutN++;
    }
  }

  if (withN < minSample || withoutN < minSample) return null;

  const shrunkWith = (withSum + prior * baseline) / (withN + prior);
  const shrunkWithout = (withoutSum + prior * baseline) / (withoutN + prior);

  const sectionTotal = mainCount + materialCount + sideboardCount;
  const shares: { role: CardImpactRole; count: number }[] = [
    { role: "main", count: mainCount },
    { role: "material", count: materialCount },
    { role: "sideboard", count: sideboardCount },
  ];
  const dominant = shares.find((s) => s.count / sectionTotal >= 0.8);
  const role: CardImpactRole = dominant?.role ?? "mixed";

  return {
    cardName,
    role,
    deckCountWith: withN,
    deckCountWithout: withoutN,
    avgWinRateWith: withSum / withN,
    avgWinRateWithout: withoutSum / withoutN,
    adjustedLift: shrunkWith - shrunkWithout,
  };
}

/**
 * Core with/without/shrink/role computation behind every "Card Impact" surface in the app —
 * general (pipeline/src/analysis/cardImpact.ts), matchup-scoped
 * (pipeline/src/analysis/matchupCardImpact.ts), and Champion+Element-scoped (computed client-side
 * in app/src/features/decks/useChampionCardImpact.ts, since that one needs an open-ended,
 * user-chosen population — element checkboxes — that can't be precomputed pipeline-side). Shared
 * here so all four stay byte-identical in method rather than drifting into separate
 * reimplementations of the same formula.
 *
 * Every card name appearing in any row is scored via `computeSingleCardImpact`; cards that don't
 * clear both buckets' `minSample` are silently dropped (not zero-filled).
 */
export function computeCardImpactEntries(rows: CardSectionRow[], baseline: number, prior: number, minSample: number): CardImpactEntry[] {
  const allCardNames = new Set<string>();
  for (const { sections } of rows) {
    for (const n of sections.main) allCardNames.add(n);
    for (const n of sections.material) allCardNames.add(n);
    for (const n of sections.sideboard) allCardNames.add(n);
  }

  const entries: CardImpactEntry[] = [];
  for (const cardName of allCardNames) {
    const entry = computeSingleCardImpact(rows, cardName, baseline, prior, minSample);
    if (entry) entries.push(entry);
  }

  entries.sort((a, b) => b.adjustedLift - a.adjustedLift);
  return entries;
}
