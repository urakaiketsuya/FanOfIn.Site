import { useMemo } from "react";
import {
  computeCardImpactEntries,
  computeSingleCardImpact,
  type Card,
  type CardImpactEntry,
  type CardQuantityStatsData,
  type CardSectionRow,
} from "@gatcg/shared";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { cardPillarScore, type RatingPillar } from "../../lib/deckIdentity";
import { weightedJaccard } from "../../lib/decodedDecks";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";

/** Same reasoning as useAllDecodedDecks' CATALOG_SETTLE_MS (app/src/lib/decodedDecks.ts) — the
 * catalog sync writes in batches, and this hook's own `cardsByName` feeds the big `useMemo` below
 * that computes the actual rendered build, so an undebounced catalog here was still enough on its
 * own to make the whole page recompute/re-render on every sync write, even after that other hook
 * was fixed. */
const CATALOG_SETTLE_MS = 500;
/** How much a card's own `cardPillarScore` (roughly 0-4 for a strong signal) can nudge its position
 * in the ranked list, in the same units as `adjustedLift` (a win-rate delta, typically within
 * ±0.15) — small enough that pillar bias only breaks ties among comparably-performing real cards,
 * never overrides a clearly better lift with a stylistically-matching but weaker one. */
const PILLAR_BOOST_WEIGHT = 0.01;

/** Mirrors pipeline/src/config.ts's defaults — see useChampionCardImpact.ts for why these are plain literals here. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
/** A with/without split needs at least this many rows total before it's worth ranking against — below this, fall back to the broader (lock-unconditioned) population instead of showing nothing. */
const MIN_RANKING_POPULATION = MIN_SAMPLE_SIZE * 2;
/**
 * Same element does not mean similar deck — real-data-verified: Arisanna's "Spirit of Wind" and
 * "Fragmented Spirit of Wind" decks score only 0.19 weighted-Jaccard against each other (two nearly
 * unrelated sub-archetypes that happen to share a Champion and element), while Diao Chan's and
 * Merlin's same-element Spirit pairs score 0.72 and 0.65 respectively. Same bar as the Variants tab
 * and the pipeline's own archetype `CLUSTER_THRESHOLD` for "is this really the same build" — the
 * Spirit-element fallback below only uses a broader same-element population when it actually
 * resembles what real data on the exact combo already shows, not just because it shares an element.
 */
const SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY = 0.45;
/** How many ranked-but-unplaced cards to surface as "cards that might help" beyond the assembled build — matters most for a fully-locked build (e.g. from a paste), where every Material/Main/Sideboard slot is already spoken for and the ranked pool would otherwise never be shown at all. */
const MAX_EXTRA_SUGGESTIONS = 8;
/** A locked card's own lift needs to clear this far below zero (not just "any negative number") before it's worth flagging as a removal candidate — same shrinkage-noise-floor reasoning as the positive suggestion side. */
const REMOVAL_LIFT_CEILING = -0.02;
const MAX_REMOVAL_SUGGESTIONS = 5;
/** How much better the best global quantity bucket's win rate needs to be than the population's modal quantity before it's worth overriding — a card's own global win-rate-by-quantity curve is real data, but a tiny/noisy edge shouldn't flip the number away from what this Champion's own decks actually run. */
const QUANTITY_OPTIMIZATION_MARGIN = 0.01;
/** Global copy-count evidence is deliberately a last resort. Five decks is enough to display a
 * card-impact split, but nowhere near enough to overturn what a coherent local population runs. */
const MIN_GLOBAL_QUANTITY_SAMPLE = 30;

type DeckSection = "main" | "material" | "sideboard";

export interface SuggestedCard {
  cardName: string;
  quantity: number;
  locked: boolean;
  /** Which section this card is placed in (for entries already in material/main/sideboard) — or, for an unplaced `suggestions` entry, which section it *would* go into if added. */
  section: DeckSection;
  /** null when there's no lift number to show — either it's the viewer's picked Spirit, or a Champion-level print so near-universally run that it never cleared the with/without sample bar (see the "staple" note below). */
  adjustedLift: number | null;
  sample: { with: number; without: number } | null;
  /** Set only when the global card-quantity data (win rate by copy count, not scoped to this Champion) meaningfully beat the population's own modal quantity for this card — the quantity this slot *would* have gotten otherwise. Never applies to a locked card (its quantity is the viewer's own choice, including via manual edits). */
  optimizedFrom: number | null;
  quantityEvidence: { source: "matching population" | "global"; sampleSize: number };
  /** "spirit" = the viewer's own Spirit pick, not ranked. "staple" = a Champion-level print included because it's the most commonly run print at that level, not because it cleared the lift sample bar (near-100%-adoption cards usually don't — their "without" bucket is too thin). "ranked" = a normal lift-ranked suggestion. */
  reason: "spirit" | "staple" | "ranked";
}

export interface SuggestedBuild {
  material: SuggestedCard[];
  main: SuggestedCard[];
  /** Locked cards first, then ranked sideboard-role suggestions up to this population's own modal sideboard size (0 when most decks don't run one) — same ranking core as Material/Main, just against the `sideboard` presence data instead. */
  sideboard: SuggestedCard[];
  /** Top ranked cards that didn't make it into Material/Main/Sideboard above — either because every slot in their section's target was already full, or (most visibly) because a fully-locked build (e.g. loaded from a paste) leaves no open slots at all. Unlocked, "Add" is the only action; adding one grows the build past its modal target on purpose. */
  suggestions: SuggestedCard[];
  /** Locked cards whose own with/without split (against the Spirit-only population, independent of any other lock) came out meaningfully negative — a candidate to cut, not just "no data either way." Always locked (they're already in material/main/sideboard); "Remove" is the only action. */
  removalSuggestions: SuggestedCard[];
  /** True when at least one card's quantity was overridden by the global quantity-vs-win-rate data — drives a one-line legend explaining the "*" marker, shown only when it'd actually apply to something on screen. */
  hasQuantityOptimizations: boolean;
  /** Size of the population actually used to rank suggestions for the remaining (unlocked) slots — not the same as the total matching-decks count once usedFallback is true. */
  rankingPopulationSize: number;
  /** True once enough cards are locked that the exact (Spirit + all locks) population got too thin to rank against, so remaining suggestions fell back to the Spirit-only population instead. */
  usedFallback: boolean;
  /** True when the chosen Champion+Spirit combo has too little (or zero) real data, so ranking fell back to other Spirits of the same element with this Champion instead (e.g. Fragmented Spirit of Wind has only 3 Diao Chan decks, Spirit of Wind has 47) — see `spiritElementFallbackSpirits` for which ones. Gated on `SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY` whenever there's enough exact data to check: same element doesn't always mean similar deck (real example: Arisanna's two same-element Spirit builds score just 0.19 similarity against each other), so this only fires when the broader population actually resembles what's already known about the exact combo. The Spirit slot itself still shows the viewer's actual pick either way; only the population everything else is ranked against is broadened. */
  usedSpiritElementFallback: boolean;
  /** The other Spirit(s) actually contributing decks to the element fallback above — empty unless `usedSpiritElementFallback` is true. */
  spiritElementFallbackSpirits: string[];
  /** Real average win rate of decks matching the Spirit filter AND every card currently locked in — the actual population everything is being ranked against. Shifts as locks are added/removed, so it doubles as "does this pick move the needle." Null only when there's no population at all yet. */
  conditionalWinRate: number | null;
  /** Real average win rate of decks matching just the Spirit filter (no lock condition) — a stable reference point for measuring how far locks have moved conditionalWinRate. */
  baselineWinRate: number | null;
  matchingDeckCount: number;
  unresolved: { main: number; material: number; sideboard: number };
  loading: boolean;
}

function legalMaxCopies(card: Card | undefined): number {
  return card?.legality?.STANDARD?.limit ?? 4;
}

/** NORM (colorless) always fits; an empty `identityElements` means there's no signal to filter on (e.g. a too-thin population) — both cases pass everything through unfiltered rather than risk hiding a legitimate pick. Exported for `useGlobalElementSuggestions.ts`, which needs the same gate with no deck population to derive one internally. */
export function isElementCompatible(card: Card | undefined, identityElements: Set<string>): boolean {
  if (identityElements.size === 0 || !card || card.elements.length === 0) return true;
  return card.elements.some((e) => e === "NORM" || identityElements.has(e));
}

/** The deck's actual castable elements — granted by its Champion and Spirit cards specifically (see `isElementCompatible`'s doc comment for why this isn't inferred from main-deck card frequency). Exported so `DeckBuilderIndex.tsx` can compute the same identity once for `useGlobalElementSuggestions.ts` (which has no deck population of its own to derive it from) instead of duplicating this formula. */
export function computeIdentityElements(championCard: Card | undefined, spiritCard: Card | undefined): Set<string> {
  return new Set([...(championCard?.elements ?? []), ...(spiritCard?.elements ?? [])].filter((e) => e !== "NORM"));
}

/**
 * Union of the elements granted by every level-print of this Champion's identity actually present
 * in the population's material sections — not just `championCard`'s own single print. Reported
 * live: a level-1 Diao Chan print might grant only Wind, but a level-3 print of the same Champion
 * commonly grants an additional element (e.g. Tera) — using only the "most common" print's
 * elements as the whole identity would filter out cards most real level-3 decks actually run.
 * Scans `spiritRows` (not the possibly lock-narrowed `rankingRows`) so a thin locked-conditioned
 * population can't hide a level this Champion's build still typically reaches. Falls back to
 * `championCard`'s own elements when no other print of the same identity turns up in the
 * population (matches the old single-print behavior exactly in that case).
 */
function findChampionIdentityElements(spiritRows: DeckBuilderRow[], championCard: Card | undefined, cardsByName: Map<string, Card>): Set<string> {
  const elements = new Set<string>();
  if (!championCard) return elements;
  const identityName = championCard.name.includes(",") ? championCard.name.split(",")[0].trim() : championCard.name;
  for (const row of spiritRows) {
    for (const name of row.material.keys()) {
      const card = cardsByName.get(name);
      if (!card?.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) continue;
      const cardIdentityName = card.name.includes(",") ? card.name.split(",")[0].trim() : card.name;
      if (cardIdentityName !== identityName) continue;
      for (const e of card.elements) if (e !== "NORM") elements.add(e);
    }
  }
  if (elements.size === 0) for (const e of championCard.elements) if (e !== "NORM") elements.add(e);
  return elements;
}

/** The Champion card actually in play, for reading its granted element(s) — a locked print (the viewer's own choice) wins over the population guess, same precedence as everywhere else a lock beats a population-derived signal in this file. Falls back to whichever Champion-type material card (CHAMPION type, not SPIRIT subtype) is most common in this Spirit-scoped population. Exported so callers (e.g. `DeckBuilderIndex.tsx`) can resolve it once against the *stable* single-Champion population and pass it back in as `championCardOverride`, for when `rows` itself comes from a cross-Champion suggestion pool. */
export function findChampionCard(spiritRows: DeckBuilderRow[], lockedCards: Map<string, number>, cardsByName: Map<string, Card>): Card | undefined {
  for (const name of lockedCards.keys()) {
    const card = cardsByName.get(name);
    if (card?.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT")) return card;
  }
  const counts = new Map<string, number>();
  for (const row of spiritRows) {
    for (const name of row.material.keys()) {
      const card = cardsByName.get(name);
      if (card?.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT")) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return best ? cardsByName.get(best[0]) : undefined;
}

/**
 * Which section a ranked suggestion actually belongs in, resolving `entry.role`'s "mixed" case
 * (reported live as material cards showing up under Main) by a plain plurality vote over the same
 * ranking population instead of defaulting straight to "main". `entry.role` itself comes from
 * `computeSingleCardImpact`'s stricter >=80%-share bar (shared with every other Card Impact surface
 * on the site, so not something to change here) — a card at, say, 65% material / 35% main still
 * clearly belongs in Material for build-assembly purposes, it just doesn't clear that bar, and
 * defaulting the whole "mixed" bucket to Main was a real, silent placement bug.
 */
function pluralitySection(rows: DeckBuilderRow[], cardName: string): DeckSection {
  let mainCount = 0;
  let materialCount = 0;
  let sideboardCount = 0;
  for (const row of rows) {
    if (row.main.has(cardName)) mainCount++;
    if (row.material.has(cardName)) materialCount++;
    if (row.sideboard.has(cardName)) sideboardCount++;
  }
  if (materialCount > 0 && materialCount >= mainCount && materialCount >= sideboardCount) return "material";
  if (sideboardCount > 0 && sideboardCount >= mainCount) return "sideboard";
  return "main";
}

/** Most common quantity this card was run at, among rows that include it in the given section — falls back to the legal max when the card was never seen in this population (e.g. added via free-text search). */
function modalQuantity(rows: DeckBuilderRow[], section: DeckSection, cardName: string, card: Card | undefined): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const qty = row[section].get(cardName);
    if (qty !== undefined) counts.set(qty, (counts.get(qty) ?? 0) + 1);
  }
  if (counts.size === 0) return legalMaxCopies(card);
  const [best] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return Math.min(best, legalMaxCopies(card));
}

/** Most common total copy count for a section across the population — the assembly target, rather than assuming a fixed 60/12 (real decklists vary, e.g. 60 vs 61). A sideboard target of 0 is a real, valid answer (most decks for a Champion may simply not run one) — no fallback games it upward. */
function modalTotal(rows: DeckBuilderRow[], section: DeckSection, fallback: number): number {
  if (rows.length === 0) return fallback;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const total = Array.from(row[section].values()).reduce((a, b) => a + b, 0);
    if (total > 0) counts.set(total, (counts.get(total) ?? 0) + 1);
  }
  if (counts.size === 0) return fallback;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

/** Average copies per deck (main+material combined, "deck identity" convention) across a row population — for scoring how similar two populations actually are via `weightedJaccard`, same centroid shape `useArchetypeVariants.ts`/`decodedDecks.ts` already use for real decks. */
function rowsCentroid(rows: DeckBuilderRow[]): Map<string, number> {
  const centroid = new Map<string, number>();
  for (const row of rows) {
    for (const [name, qty] of row.main) centroid.set(name, (centroid.get(name) ?? 0) + qty);
    for (const [name, qty] of row.material) centroid.set(name, (centroid.get(name) ?? 0) + qty);
  }
  if (rows.length === 0) return centroid;
  for (const [name, total] of centroid) centroid.set(name, total / rows.length);
  return centroid;
}

function toSuggested(
  cardName: string,
  quantity: number,
  locked: boolean,
  entry: CardImpactEntry | undefined,
  reason: SuggestedCard["reason"],
  section: DeckSection,
  optimizedFrom: number | null = null,
  quantityEvidence: SuggestedCard["quantityEvidence"] = { source: "matching population", sampleSize: 0 },
): SuggestedCard {
  return {
    cardName,
    quantity,
    locked,
    section,
    adjustedLift: entry?.adjustedLift ?? null,
    sample: entry ? { with: entry.deckCountWith, without: entry.deckCountWithout } : null,
    reason,
    optimizedFrom,
    quantityEvidence,
  };
}

/**
 * Picks a slot's quantity from the population's own modal count, unless the card's global
 * win-rate-by-quantity data (not scoped to this Champion — a card's copy-count curve is a
 * card-level property, e.g. "Dungeon Guide wins more at 4x than 2x" holds regardless of who's
 * playing it) shows a clearly better quantity within the legal max. Returns the chosen quantity
 * plus, when it differs from modal, what it was optimized *from* — for the UI to disclose the
 * override rather than silently showing a number that doesn't match "what people actually run."
 */
function pickQuantity(
  rows: DeckBuilderRow[],
  section: DeckSection,
  cardName: string,
  card: Card | undefined,
  quantityBucketsByName: Map<string, { quantity: number; deckCount: number; adjustedWinRate: number }[]>,
): { quantity: number; optimizedFrom: number | null; evidence: SuggestedCard["quantityEvidence"] } {
  const modal = modalQuantity(rows, section, cardName, card);
  const localSample = rows.filter((r) => r[section].has(cardName)).length;
  const buckets = quantityBucketsByName.get(cardName);
  if (!buckets) return { quantity: modal, optimizedFrom: null, evidence: { source: "matching population", sampleSize: localSample } };

  const max = legalMaxCopies(card);
  const eligible = buckets.filter((b) => b.deckCount >= MIN_GLOBAL_QUANTITY_SAMPLE && b.quantity >= 1 && b.quantity <= max);
  if (eligible.length === 0) return { quantity: modal, optimizedFrom: null, evidence: { source: "matching population", sampleSize: localSample } };

  const best = eligible.reduce((a, b) => (b.adjustedWinRate > a.adjustedWinRate ? b : a));
  if (best.quantity === modal) return { quantity: modal, optimizedFrom: null, evidence: { source: "matching population", sampleSize: localSample } };

  const modalWinRate = eligible.find((b) => b.quantity === modal)?.adjustedWinRate ?? null;
  if (modalWinRate !== null && best.adjustedWinRate - modalWinRate < QUANTITY_OPTIMIZATION_MARGIN) {
    return { quantity: modal, optimizedFrom: null, evidence: { source: "matching population", sampleSize: localSample } };
  }
  return { quantity: best.quantity, optimizedFrom: modal, evidence: { source: "global", sampleSize: best.deckCount } };
}

/**
 * Assembles a suggested build for a Champion (+ optional Spirit filter), honoring any cards the
 * viewer has locked in. Locked cards are always included as-is — they need no data to justify
 * their presence, they're the viewer's own choice. Everything else is filled by ranking the
 * remaining population (decks that have the Spirit and every locked card) via the same
 * with/without/shrink core used by every other Card Impact surface (`computeCardImpactEntries`),
 * falling back to the Spirit-only population once locking has narrowed things too far to rank
 * against reliably.
 */
export function useSuggestedBuild(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
  loading: boolean,
  /** Section a lock is *known* to belong to (e.g. from a pasted decklist's own Main/Material/Sideboard headers) — trusted over the population-derived `sectionOf` guess below, which can misclassify a card the current population barely plays (see the Resonance Bauble bug: near-zero sample defaults to "main" regardless of the card's real section), and is the only way a card ever lands in the sideboard at all (there's no population-driven sideboard guess). Cards locked without a known section (manual "Add a card") still fall back to the main/material guess. */
  lockedSections: Map<string, "main" | "material" | "sideboard"> = new Map(),
  /** Global (not Champion-scoped) win rate by copy count, published per-card — lets a suggested/ranked-fill quantity be overridden toward whichever copy count actually wins more, when the data clearly says so. Omit to always use the population's modal quantity, same as before this existed. */
  cardQuantityStatsData?: CardQuantityStatsData,
  /**
   * The Champion card to read granted elements from, resolved by the caller against the *stable*
   * single-Champion population (`useDeckBuilderPopulation`'s own rows for the selected Champion) —
   * not against whichever `rows` this call is ranking against. Needed once `rows` can come from a
   * cross-Champion suggestion pool (same Spirit/class/nearest deck/archetype cluster, any
   * Champion): `findChampionCard`'s own population-plurality guess would otherwise pick whichever
   * Champion happens to be most common across a mixed-Champion `rows` set, which is meaningless.
   * Omit to fall back to the population-guess behavior (correct and unchanged for the two
   * single-Champion pools, where `rows` already only ever contains one Champion's decks anyway).
   */
  championCardOverride?: Card,
  /** When set, ranked suggestions get a small boost (see `PILLAR_BOOST_WEIGHT`) toward cards that
   * score well on this rating pillar (`cardPillarScore`, the same signals `computeDeckRating`'s
   * DIAO Score uses) — a nudge toward a chosen playstyle among cards that already cleared the
   * real win-rate-lift bar, never a replacement for that bar. Omit for unbiased lift-only ranking,
   * unchanged from before this existed. */
  pillarBias?: RatingPillar | null,
): SuggestedBuild {
  const cardCatalog = useCardCatalog();
  const settledCardCatalog = useDebouncedValue(cardCatalog, CATALOG_SETTLE_MS);
  const cardsByName = useMemo(() => new Map(settledCardCatalog.map((c) => [c.name, c])), [settledCardCatalog]);
  const quantityBucketsByName = useMemo(() => {
    const map = new Map<string, { quantity: number; deckCount: number; adjustedWinRate: number }[]>();
    for (const c of cardQuantityStatsData?.cards ?? []) map.set(c.name, c.quantities);
    return map;
  }, [cardQuantityStatsData]);

  return useMemo((): SuggestedBuild => {
    if (loading || rows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        hasQuantityOptimizations: false,
        rankingPopulationSize: 0,
        usedFallback: false,
        usedSpiritElementFallback: false,
        spiritElementFallbackSpirits: [],
        conditionalWinRate: null,
        baselineWinRate: null,
        matchingDeckCount: 0,
        unresolved: { main: 0, material: 0, sideboard: 0 },
        loading,
      };

    const exactSpiritRows = spiritFilter === null ? rows : rows.filter((r) => r.spiritName === spiritFilter);
    // The exact Champion+Spirit combo itself may have too little real data to rank against
    // reliably — same MIN_RANKING_POPULATION bar the locked-cards fallback below already uses for
    // "too thin to trust" (real example: Fragmented Spirit of Wind has only 3 Diao Chan decks,
    // Spirit of Wind has 47) — rather than ranking against a near-anecdotal population or showing
    // nothing, consider falling back to this Champion's decks with any Spirit sharing the chosen
    // one's element(s). Real elements only (granted by the Spirit card itself, same source
    // `computeIdentityElements` reads from) — a Spirit with no elements (shouldn't happen, but data
    // can surprise) has nothing to match on, so no fallback rather than matching everything.
    let spiritRows = exactSpiritRows;
    let usedSpiritElementFallback = false;
    let spiritElementFallbackSpirits: string[] = [];
    if (spiritRows.length < MIN_RANKING_POPULATION && spiritFilter !== null) {
      const chosenSpiritElements = new Set((cardsByName.get(spiritFilter)?.elements ?? []).filter((e) => e !== "NORM"));
      if (chosenSpiritElements.size > 0) {
        const fallbackRows = rows.filter((r) => {
          if (!r.spiritName) return false;
          const elements = cardsByName.get(r.spiritName)?.elements ?? [];
          return elements.some((e) => chosenSpiritElements.has(e));
        });
        const otherSpiritRows = fallbackRows.filter((r) => r.spiritName !== spiritFilter);
        // Same element does not mean similar deck (see SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY's own
        // doc comment) — when there's at least some real data for the exact combo, require the
        // other same-element Spirits' decks to actually resemble it before pooling them in. With
        // zero exact data there's nothing to validate against, so the element match alone (the only
        // signal available) still applies.
        const passesSimilarityCheck =
          exactSpiritRows.length === 0 ||
          weightedJaccard(rowsCentroid(exactSpiritRows), rowsCentroid(otherSpiritRows)) >= SPIRIT_ELEMENT_FALLBACK_MIN_SIMILARITY;
        if (fallbackRows.length > spiritRows.length && passesSimilarityCheck) {
          spiritRows = fallbackRows;
          usedSpiritElementFallback = true;
          spiritElementFallbackSpirits = Array.from(new Set(otherSpiritRows.map((r) => r.spiritName!))).sort();
        }
      }
    }
    if (spiritRows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        hasQuantityOptimizations: false,
        rankingPopulationSize: 0,
        usedFallback: false,
        usedSpiritElementFallback: false,
        spiritElementFallbackSpirits: [],
        conditionalWinRate: null,
        baselineWinRate: null,
        matchingDeckCount: 0,
        unresolved: { main: 0, material: 0, sideboard: 0 },
        loading: false,
      };

    const baselineWinRate = spiritRows.reduce((sum, r) => sum + r.winRate, 0) / spiritRows.length;

    // The deck's actual castable elements are granted by its Champion and Spirit cards
    // specifically, not inferred from which elements happen to be common across the main deck —
    // that was the wrong signal (and the real bug): a well-represented or high-lift off-element
    // splash (Water, Umbra, whatever) would count toward "identity" under a frequency-based proxy
    // just as much as a genuinely granted element, since nothing distinguished "the deck can cast
    // this" from "this happened to be common/lucky in a small sample." A locked Champion print
    // wins if the viewer already picked one; otherwise the most common Champion-type material card
    // in this Spirit-scoped population stands in for it.
    const championCard = championCardOverride ?? findChampionCard(spiritRows, lockedCards, cardsByName);
    const spiritCard = spiritFilter ? cardsByName.get(spiritFilter) : undefined;
    const championElements = findChampionIdentityElements(spiritRows, championCard, cardsByName);
    const identityElements = new Set([...championElements, ...(spiritCard?.elements ?? [])].filter((e) => e !== "NORM"));

    const lockedNames = new Set(lockedCards.keys());
    // Only condition on locks with a real sample behind them — a card only 1-4 decks in this
    // population have ever played (e.g. "Ariel, Archangel of Natura", confirmed live: exactly 1
    // Diao Chan deck) would otherwise let that single deck's own win rate dominate — or, at zero
    // occurrences, require every row to contain it, which is trivially impossible and zeroes out
    // the conditional population entirely. Neither is "this combo performs badly," it's "we don't
    // have enough data on this card here" — a different situation that shouldn't erase or distort
    // the win rate contributed by every OTHER lock already in place. Same MIN_SAMPLE_SIZE bar
    // Card Impact uses everywhere else for "is this enough data to trust." Real bug, reported live
    // (first as the win rate vanishing, then as a single deck swinging it) and fixed both ways.
    const conditionableLockedNames = Array.from(lockedNames).filter(
      (n) => spiritRows.filter((r) => r.main.has(n) || r.material.has(n)).length >= MIN_SAMPLE_SIZE,
    );
    const conditionalRows =
      conditionableLockedNames.length === 0 ? spiritRows : spiritRows.filter((r) => conditionableLockedNames.every((n) => r.main.has(n) || r.material.has(n)));
    // The real average for decks matching every (data-backed) lock exactly — reported even when
    // that same population was too thin to rank against and suggestions fell back to the broader
    // one below (ranking and "what does this combo actually average" are different questions).
    const conditionalWinRate = conditionalRows.length > 0 ? conditionalRows.reduce((sum, r) => sum + r.winRate, 0) / conditionalRows.length : null;

    const usedFallback = lockedNames.size > 0 && conditionalRows.length < MIN_RANKING_POPULATION;
    const rankingRows = usedFallback ? spiritRows : conditionalRows;

    // A locked card's OWN with/without split, independent of every other lock — `rankingRows` is
    // the wrong population for this (once conditioned on this exact card, its own "without" bucket
    // is empty by construction), so this runs against `spiritRows` instead, same population
    // `baselineWinRate` already uses. Lets a locked card show a real lift number instead of a flat
    // "locked" badge, and is what "which of my locked cards might actually be hurting me" needs.
    const spiritSectionRows: CardSectionRow[] = spiritRows.map((r) => ({
      sections: { main: new Set(r.main.keys()), material: new Set(r.material.keys()), sideboard: new Set(r.sideboard.keys()) },
      outcome: r.winRate,
    }));
    const lockedEntryByName = new Map<string, CardImpactEntry>();
    for (const name of lockedNames) {
      const entry = computeSingleCardImpact(spiritSectionRows, name, baselineWinRate, PRIOR_WEIGHT, MIN_SAMPLE_SIZE);
      if (entry) lockedEntryByName.set(name, entry);
    }

    const sectionRows: CardSectionRow[] = rankingRows.map((r) => ({
      sections: { main: new Set(r.main.keys()), material: new Set(r.material.keys()), sideboard: new Set(r.sideboard.keys()) },
      outcome: r.winRate,
    }));
    const baseline = rankingRows.reduce((sum, r) => sum + r.winRate, 0) / rankingRows.length;
    const ranked = computeCardImpactEntries(sectionRows, baseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE).filter(
      (e) =>
        e.adjustedLift > 0 &&
        cardsByName.get(e.cardName)?.legality?.STANDARD?.limit !== 0 &&
        !lockedNames.has(e.cardName) &&
        !rejectedCards.has(e.cardName),
    );
    // Re-order (not re-score) by a small pillar-affinity boost — each entry's own `adjustedLift`
    // stays the real, honest win-rate number shown in the UI; only which comparably-good real card
    // gets picked first for a limited slot shifts toward the chosen playstyle.
    if (pillarBias) {
      const boostedScore = (e: CardImpactEntry): number => {
        const card = cardsByName.get(e.cardName);
        return e.adjustedLift + (card ? PILLAR_BOOST_WEIGHT * cardPillarScore(card, pillarBias) : 0);
      };
      ranked.sort((a, b) => boostedScore(b) - boostedScore(a));
    }
    const entryByName = new Map(ranked.map((e) => [e.cardName, e]));

    const materialTarget = modalTotal(spiritRows, "material", 12);
    const mainTarget = modalTotal(spiritRows, "main", 60);
    const sideboardTarget = modalTotal(spiritRows, "sideboard", 0);

    const material: SuggestedCard[] = [];
    const main: SuggestedCard[] = [];
    const sideboard: SuggestedCard[] = [];
    const placed = new Set<string>();

    // Which section a card typically lives in, from raw presence in the (lock-independent)
    // Spirit-filtered population — NOT from `entryByName`, which deliberately excludes locked
    // cards (so a card doesn't compete against itself in the ranking) and would otherwise always
    // return undefined for every locked card, silently defaulting every one of them to "main"
    // regardless of where it's actually played. Plain plurality (whichever section has more
    // occurrences wins, material on a tie) — a >=80%-dominance bar used to gate this (mirroring
    // `computeCardImpactEntries`'s role convention) and defaulted anything short of that to "main",
    // which silently misplaced material cards that were, say, 60-79% material into Main. That bar
    // makes sense for `role`'s own purpose (flagging genuine uncertainty on Card Impact tables
    // elsewhere), but not for actually placing a card into a section here.
    function sectionOf(name: string): "main" | "material" {
      let mainCount = 0;
      let materialCount = 0;
      for (const row of spiritRows) {
        if (row.main.has(name)) mainCount++;
        if (row.material.has(name)) materialCount++;
      }
      if (mainCount === 0 && materialCount === 0) return "main";
      return materialCount >= mainCount ? "material" : "main";
    }

    // Locked cards go in first, at their own quantity, sectioned by wherever they're actually
    // played (falls back to "main" for a card never seen in this population). A known "sideboard"
    // section always wins — there's no population-derived guess for it, only explicit knowledge
    // from where the card was locked (e.g. a pasted decklist's own Sideboard section).
    for (const [name, qty] of lockedCards) {
      const card = cardsByName.get(name);
      const knownSection = lockedSections.get(name);
      if (knownSection === "sideboard") {
        sideboard.push(toSuggested(name, qty, true, lockedEntryByName.get(name), "ranked", "sideboard"));
        placed.add(name);
        continue;
      }
      // Champion and Regalia cards can never legally sit in the Main deck — verified against real
      // data (0 Main appearances across 549k+ real Champion/Regalia occurrences). A cached/shared
      // `knownSection` of "main" that contradicts this is stale or simply wrong (e.g. from a bad
      // paste), not authoritative, so this overrides it instead of silently misplacing the card.
      const isMainIneligible = card ? card.types.includes("CHAMPION") || card.types.includes("REGALIA") : false;
      const isMaterialCard = isMainIneligible || (knownSection ? knownSection === "material" : sectionOf(name) === "material");
      // The Material Deck is capped at 1 copy of each card by rule, independent of the card's own
      // Standard/UNIQUE copy limit (verified against real data: 8,454 real decks run a Resonance
      // Bauble at exactly 1x in Material, vs. a handful of outlier qty>1 lines that are data-entry
      // noise) — a locked card's stored quantity can predate knowing which section it'd land in
      // (e.g. "Add a card" defaults non-UNIQUE cards to 4x before section is ever determined), so
      // this clamps rather than trusting it.
      const finalQty = isMaterialCard ? 1 : qty;
      (isMaterialCard ? material : main).push(toSuggested(name, finalQty, true, lockedEntryByName.get(name), "ranked", isMaterialCard ? "material" : "main"));
      placed.add(name);
    }

    // Champion-level anchors: one print per level actually present in the ranking population,
    // highest-lift pick at that level (a locked print at the same level, handled above, wins
    // instead). Real decklists showed the levels/prints aren't fixed per Champion — some Champions
    // have multiple same-level variants — so this is picked from data, not the raw card list.
    // Scoped to the *intended* Champion's own identity (via `championCard`, same "before the
    // comma" identity `findChampionName` uses) rather than "whichever Champion is most common in
    // `rankingRows`" — that distinction only matters once `rows` can come from a cross-Champion
    // pool (same Spirit/class/nearest deck/archetype cluster, any Champion): scanning unscoped
    // there would suggest a print of whichever *borrowed* Champion happens to show up, not the one
    // the viewer actually picked. If the intended Champion has no print at all in a borrowed
    // population (the common case), no anchor gets placed here — correct: nothing to borrow.
    const championIdentityName = championCard
      ? championCard.name.includes(",")
        ? championCard.name.split(",")[0].trim()
        : championCard.name
      : null;
    const lockedLevels = new Set(
      Array.from(lockedCards.keys())
        .map((n) => cardsByName.get(n)?.level)
        .filter((l): l is number => l !== null && l !== undefined),
    );
    const championCardsByLevel = new Map<number, Map<string, number>>();
    for (const row of rankingRows) {
      for (const name of row.material.keys()) {
        const card = cardsByName.get(name);
        if (!card?.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT") || card.level === null || card.level === undefined) continue;
        if (placed.has(name)) continue;
        if (championIdentityName) {
          const cardIdentityName = card.name.includes(",") ? card.name.split(",")[0].trim() : card.name;
          if (cardIdentityName !== championIdentityName) continue;
        }
        const counts = championCardsByLevel.get(card.level) ?? new Map<string, number>();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        championCardsByLevel.set(card.level, counts);
      }
    }
    for (const [level, counts] of Array.from(championCardsByLevel.entries()).sort((a, b) => a[0] - b[0])) {
      if (lockedLevels.has(level)) continue;
      const names = Array.from(counts.keys());
      // Prefer the highest-lift print if any candidate at this level cleared the sample bar; a
      // near-universally-run print (most decks include all their Champion's level prints) usually
      // won't, since its "without" bucket is too thin — same "excludes defining/staple cards"
      // behavior documented for the general Card Impact feature. Unlike a flex-slot suggestion,
      // though, a Champion's level print is structurally close to mandatory, so fall back to
      // whichever print is simply most common at this level rather than omitting the level.
      const liftRanked = names.filter((n) => entryByName.has(n)).sort((a, b) => entryByName.get(b)!.adjustedLift - entryByName.get(a)!.adjustedLift);
      const best = liftRanked[0] ?? names.sort((a, b) => counts.get(b)! - counts.get(a)!)[0];
      if (!best) continue;
      material.push(toSuggested(best, 1, false, entryByName.get(best), entryByName.has(best) ? "ranked" : "staple", "material"));
      placed.add(best);
    }

    // The Spirit itself — the viewer's explicit pick, not ranked against alternatives.
    if (spiritFilter && !placed.has(spiritFilter)) {
      material.push(toSuggested(spiritFilter, 1, false, undefined, "spirit", "material"));
      placed.add(spiritFilter);
    }

    let materialTotal = material.reduce((sum, c) => sum + c.quantity, 0);
    let mainTotal = main.reduce((sum, c) => sum + c.quantity, 0);
    let sideboardTotal = sideboard.reduce((sum, c) => sum + c.quantity, 0);

    // "Any Spirit" is an exploratory comparison, not a coherent archetype. Keep its ranked cards
    // available as optional ideas below, but do not auto-assemble them into a falsely complete deck.
    const assemblyRanked = spiritFilter === null ? [] : ranked;
    for (const entry of assemblyRanked) {
      if (placed.has(entry.cardName)) continue;
      const card = cardsByName.get(entry.cardName);
      if (card?.types.includes("CHAMPION")) continue; // only ever placed as a level anchor above
      if (!isElementCompatible(card, identityElements)) continue;
      const section = entry.role === "mixed" ? pluralitySection(rankingRows, entry.cardName) : entry.role;
      if (section === "material") {
        if (materialTotal >= materialTarget) continue;
        material.push(toSuggested(entry.cardName, 1, false, entry, "ranked", "material"));
        materialTotal += 1;
      } else if (section === "sideboard") {
        if (sideboardTotal >= sideboardTarget) continue;
        const picked = pickQuantity(rankingRows, "sideboard", entry.cardName, card, quantityBucketsByName);
        const qty = Math.min(picked.quantity, sideboardTarget - sideboardTotal);
        sideboard.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "sideboard", qty === picked.quantity ? picked.optimizedFrom : null, picked.evidence));
        sideboardTotal += qty;
      } else {
        if (mainTotal >= mainTarget) continue;
        const picked = pickQuantity(rankingRows, "main", entry.cardName, card, quantityBucketsByName);
        const qty = Math.min(picked.quantity, mainTarget - mainTotal);
        main.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "main", qty === picked.quantity ? picked.optimizedFrom : null, picked.evidence));
        mainTotal += qty;
      }
      placed.add(entry.cardName);
      if (materialTotal >= materialTarget && mainTotal >= mainTarget && sideboardTotal >= sideboardTarget) break;
    }

    // Everything ranked that still didn't make it in — most visibly non-empty for a fully-locked
    // build (every target already met by locks alone, so the loop above placed nothing new even
    // though `ranked` has real candidates). Shown as swap-in ideas, not auto-filled.
    const suggestions = ranked
      .filter((e) => {
        const card = cardsByName.get(e.cardName);
        return !placed.has(e.cardName) && !card?.types.includes("CHAMPION") && isElementCompatible(card, identityElements);
      })
      .slice(0, MAX_EXTRA_SUGGESTIONS)
      .map((e) => {
        const card = cardsByName.get(e.cardName);
        const section: DeckSection = e.role === "mixed" ? pluralitySection(rankingRows, e.cardName) : e.role;
        if (section === "material") return toSuggested(e.cardName, 1, false, e, "ranked", section);
        const picked = pickQuantity(rankingRows, section, e.cardName, card, quantityBucketsByName);
        return toSuggested(e.cardName, picked.quantity, false, e, "ranked", section, picked.optimizedFrom, picked.evidence);
      });

    const removalSuggestions = [...material, ...main, ...sideboard]
      .filter((c) => c.locked && c.adjustedLift !== null && c.adjustedLift <= REMOVAL_LIFT_CEILING)
      .sort((a, b) => a.adjustedLift! - b.adjustedLift!)
      .slice(0, MAX_REMOVAL_SUGGESTIONS);

    const hasQuantityOptimizations = [...material, ...main, ...sideboard, ...suggestions].some((c) => c.optimizedFrom !== null);

    return {
      material,
      main,
      sideboard,
      suggestions,
      removalSuggestions,
      hasQuantityOptimizations,
      rankingPopulationSize: rankingRows.length,
      usedFallback,
      usedSpiritElementFallback,
      spiritElementFallbackSpirits,
      conditionalWinRate,
      baselineWinRate,
      matchingDeckCount: conditionalRows.length,
      unresolved: {
        main: Math.max(0, mainTarget - mainTotal),
        material: Math.max(0, materialTarget - materialTotal),
        sideboard: Math.max(0, sideboardTarget - sideboardTotal),
      },
      loading: false,
    };
  }, [rows, spiritFilter, lockedCards, rejectedCards, loading, cardsByName, lockedSections, quantityBucketsByName, championCardOverride, pillarBias]);
}
