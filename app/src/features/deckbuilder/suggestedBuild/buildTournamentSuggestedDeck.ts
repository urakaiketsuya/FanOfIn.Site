import {
  computeCardImpactEntries,
  computeSingleCardImpact,
  type Card,
  type CardImpactEntry,
  type CardQuantityBucket,
  type CardSectionRow,
} from "@gatcg/shared";
import { cardPillarScore, type RatingPillar } from "../../../lib/deckIdentity";
import type { DeckBuilderRow } from "../useDeckBuilderPopulation";
import { computeDependencyReadiness, computeSynergyReadiness, type SynergyLine } from "../synergyReadiness";
import { getDeckPackageCatalog, type ActiveDeckPackage, type DeckPackageCatalogEntry } from "../packageGuardrails";
import { findContextualMaterialReplacement } from "../contextualMaterialGuardrail";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost } from "../validateDeck";
import { computeLocalQuantityBuckets, type QuantitySample } from "../../../lib/cardQuantityAdvice";
import {
  championIdentityName,
  findChampionIdentityElements,
  guoJiaFatestoneForIdentity,
  hasChampionBonus,
  intendedChampionLevel,
  isElementCompatible,
  findChampionCard,
  IDENTITY_STAPLE_PREVALENCE,
  MIN_IDENTITY_STAPLE_POPULATION,
} from "./identityRules";
import { modalQuantity, pickQuantity, pluralitySection, toSuggested, type DeckSection } from "./cardScoringAndQuantities";
import { modalSectionTotal } from "./sectionAssembly";
import { selectSuggestedBuildPopulation } from "./populationSelection";
import { annotateSuggestions, removalHarmsReadiness } from "./suggestionsAndRemovals";
export { computeIdentityElements, findChampionCard, guoJiaFatestoneForIdentity, hasChampionBonus, IDENTITY_STAPLE_PREVALENCE, MIN_IDENTITY_STAPLE_POPULATION, isElementCompatible } from "./identityRules";
/** How much a card's own `cardPillarScore` (roughly 0-4 for a strong signal) can nudge its position
 * in the ranked list, in the same units as `adjustedLift` (a win-rate delta, typically within
 * ±0.15) — small enough that pillar bias only breaks ties among comparably-performing real cards,
 * never overrides a clearly better lift with a stylistically-matching but weaker one. */
const PILLAR_BOOST_WEIGHT = 0.01;
/** Same reasoning and units as `PILLAR_BOOST_WEIGHT`, for the "balanced" source's community-popularity
 * nudge — `percentOfDecks` is already a 0-1 fraction, so a card run in 100% of blended community decks
 * gets at most a +0.03 boost, comparable in magnitude to a maxed-out pillar boost. This never touches
 * `adjustedLift` itself (still the real, honest win-rate number shown in the UI), only which
 * comparably-performing real card gets picked first for a limited slot — see docs/CALCULATIONS.md,
 * "Balanced source", for why this doesn't fall into the "fabricating a performance signal" trap the
 * Community source's own doc explicitly warns about. */
const COMMUNITY_BOOST_WEIGHT = 0.03;
/** Archetype inspiration is a preference, not a population filter. A defining card present in
 * every sighting of the selected build gets the same maximum tie-breaking nudge as a universally
 * played community card; lower prevalence scales the boost down proportionally. */
const ARCHETYPE_BOOST_WEIGHT = 0.03;
/** Collection preference is intentionally a tie-breaker: ownership can choose between similarly
 * supported cards, but cannot turn a weak or unsupported card into a performance recommendation. */
const COLLECTION_BOOST_WEIGHT = 0.025;
/** Same tie-breaking-only philosophy as `COMMUNITY_BOOST_WEIGHT`, but subtracted — for the
 * "balanced" source's decay penalty. `decay` (from `computeCardDecay`'s already-filtered top
 * signals, `DeckBuilderIndex.tsx`) is a 0-1 inclusion-rate drop, floored at 0.08 by that function's
 * own reporting bar; at 0.08 the penalty here is a barely-there ~0.004, and even a rare extreme
 * ~0.5 decay caps out around 0.025 — comparable to a maxed-out community boost, never enough to
 * outweigh a real `adjustedLift` gap. A card the decay report flags as declining (despite still
 * winning — that's the report's own bar) gets nudged behind an equally-good, non-declining
 * alternative; it is never excluded or scored below zero-lift cards. */
const DECAY_PENALTY_WEIGHT = 0.05;

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
/** How many ranked-but-unplaced cards to surface as "cards that might help" beyond the assembled build — matters most for a fully-locked build (e.g. from a paste), where every Material/Main/Sideboard slot is already spoken for and the ranked pool would otherwise never be shown at all. */
const MAX_EXTRA_SUGGESTIONS = 16;
/** A locked card's own lift needs to clear this far below zero (not just "any negative number") before it's worth flagging as a removal candidate — same shrinkage-noise-floor reasoning as the positive suggestion side. */
const REMOVAL_LIFT_CEILING = -0.02;
const MAX_REMOVAL_SUGGESTIONS = 5;
/** Named Champion-bonus cards are promoted from flex picks only when they describe a genuinely
 * dominant construction pattern. This avoids treating every thematic card with bonus text as
 * mandatory while rescuing near-universal staples that an isolated with/without lift suppresses. */
export interface SuggestedCard {
  cardName: string;
  quantity: number;
  locked: boolean;
  /** Which section this card is placed in (for entries already in material/main/sideboard) — or, for an unplaced `suggestions` entry, which section it *would* go into if added. */
  section: DeckSection;
  /** null when there's no lift number to show — either it's the viewer's picked Spirit, or a structural identity card that does not need an isolated with/without result. */
  adjustedLift: number | null;
  sample: { with: number; without: number } | null;
  /** Set only when a card-quantity win-rate comparison (see `quantityEvidence.source`) meaningfully beat the population's own modal quantity for this card — the quantity this slot *would* have gotten otherwise. Never applies to a locked card (its quantity is the viewer's own choice, including via manual edits). */
  optimizedFrom: number | null;
  /** "matching population" = no quantity override, just the modal count. "narrowed population" = overridden using a significance-tested comparison scoped to this build's own ranking population (Champion/Spirit/lock-conditioned, or a selected archetype's own decks) — a real quantity effect within *this* context, not confounded by which archetypes happen to run the card at which count. "global" = the same test, but only the flat meta-wide fallback cleared it. */
  quantityEvidence: { source: "matching population" | "narrowed population" | "global"; sampleSize: number };
  /** "spirit" = the viewer's own Spirit pick. "staple" = a structural Champion print. "identity-staple" = a card explicitly tied to the selected Champion by its rules text and supported by observed prevalence, or a deterministic Champion+Spirit identity card. "ranked" = a normal lift-ranked suggestion. */
  reason: "spirit" | "staple" | "identity-staple" | "ranked";
  /** Active construction packages this card helps stabilize. These are deterministic readiness
   * checks (Imbue/enabler or producer/consumer), kept separate from the observed win-rate lift. */
  readinessReasons?: string[];
  /** Continuous DIAO pillar-point changes, used for metric-specific tags even when the calibrated
   * 1-10 score remains within the same band. */
  diaoMetricChanges?: Partial<Record<RatingPillar, number>>;
  /** For a Material cut, the positive same-section alternative that also cleared the normal
   * sample/lift bars among leave-one-out nearest peers. Material cuts never appear without this. */
  contextualReplacement?: { cardName: string; peerDecks: number };
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
  /** Statistically eligible cuts withheld only because they belong to an active construction
   * package. The UI may reveal these on explicit request, but never mixes them into default cuts. */
  protectedRemovalSuggestions: SuggestedCard[];
  /** Active construction packages that suppressed otherwise eligible individual cuts. Packages
   * annotate and protect the build; they do not define its archetype. */
  protectedPackages: ActiveDeckPackage[];
  /** Every explicit construction-package rule, including inactive rules, for the Review audit UI. */
  packageCatalog: DeckPackageCatalogEntry[];
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

/**
 * Which section a ranked suggestion actually belongs in, resolving `entry.role`'s "mixed" case
 * (reported live as material cards showing up under Main) by a plain plurality vote over the same
 * ranking population instead of defaulting straight to "main". `entry.role` itself comes from
 * `computeSingleCardImpact`'s stricter >=80%-share bar (shared with every other Card Impact surface
 * on the site, so not something to change here) — a card at, say, 65% material / 35% main still
 * clearly belongs in Material for build-assembly purposes, it just doesn't clear that bar, and
 * defaulting the whole "mixed" bucket to Main was a real, silent placement bug.
 */
/** Average copies per deck (main+material combined, "deck identity" convention) across a row population — for scoring how similar two populations actually are via `weightedJaccard`, same centroid shape `useArchetypeVariants.ts`/`decodedDecks.ts` already use for real decks. */
/**
 * Assembles a suggested build for a Champion (+ optional Spirit filter), honoring any cards the
 * viewer has locked in. Locked cards are always included as-is — they need no data to justify
 * their presence, they're the viewer's own choice. Everything else is filled by ranking the
 * remaining population (decks that have the Spirit and every locked card) via the same
 * with/without/shrink core used by every other Card Impact surface (`computeCardImpactEntries`),
 * falling back to the Spirit-only population once locking has narrowed things too far to rank
 * against reliably.
 */
export function buildTournamentSuggestedDeck(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  rejectedCards: Set<string>,
  loading: boolean,
  cardsByName: Map<string, Card>,
  quantityBucketsByName: Map<string, CardQuantityBucket[]>,
  /** Section a lock is *known* to belong to (e.g. from a pasted decklist's own Main/Material/Sideboard headers) — trusted over the population-derived `sectionOf` guess below, which can misclassify a card the current population barely plays (see the Resonance Bauble bug: near-zero sample defaults to "main" regardless of the card's real section), and is the only way a card ever lands in the sideboard at all (there's no population-driven sideboard guess). Cards locked without a known section (manual "Add a card") still fall back to the main/material guess. */
  lockedSections: Map<string, "main" | "material" | "sideboard"> = new Map(),
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
  /** The "balanced" source's other half: the blended community population's card-inclusion map
   * (cardName -> at least `percentOfDecks`), used exactly like `pillarBias` above — a small boost
   * (see `COMMUNITY_BOOST_WEIGHT`) toward cards the community plays often, among cards that already
   * cleared the real lift bar. Omit for tournament-only ranking, unchanged from before this existed. */
  communityInclusion?: Map<string, { percentOfDecks: number }>,
  /** The "balanced" source's third nudge: cardName -> `decay` from `computeCardDecay`'s top signals
   * (`DeckBuilderIndex.tsx`) — cards whose inclusion rate is falling despite still winning. Applies
   * `DECAY_PENALTY_WEIGHT` as a small negative nudge, same tie-breaking-only bar as `pillarBias`/
   * `communityInclusion` above. Omit for no decay penalty, unchanged from before this existed. */
  decayingCards?: Map<string, number>,
  /** Selected archetype's defining-card prevalence (0-1). This only reorders positive-lift
   * candidates; it never makes an unsupported card eligible or changes the lift displayed. */
  archetypePrevalence?: Map<string, number>,
  /** Physical copies owned by canonical card name. Used only to prioritize/cap auto-suggestions;
   * explicit locked cards remain the user's authority. */
  collectionOwnedByName?: Map<string, number>,
  collectionMode: "all" | "prioritize" | "owned-only" = "all",
  /** Maximum Champion level to propose. The user can deliberately build at a lower level instead
   * of having every observed level silently reinserted by the recommendation population. */
  championLevelCap: number | null = null,
): SuggestedBuild {
  {
    if (loading || rows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        protectedRemovalSuggestions: [],
        protectedPackages: [],
        packageCatalog: getDeckPackageCatalog([]),
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

    const population = selectSuggestedBuildPopulation(rows, spiritFilter, lockedCards, cardsByName, MIN_SAMPLE_SIZE, MIN_RANKING_POPULATION);
    const {
      spiritRows,
      conditionalRows,
      rankingRows,
      baselineWinRate,
      conditionalWinRate,
      usedFallback,
      usedSpiritElementFallback,
      spiritElementFallbackSpirits,
    } = population;
    if (spiritRows.length === 0)
      return {
        material: [],
        main: [],
        sideboard: [],
        suggestions: [],
        removalSuggestions: [],
        protectedRemovalSuggestions: [],
        protectedPackages: [],
        packageCatalog: getDeckPackageCatalog([]),
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
    // Card-quantity win-rate buckets scoped to this same ranking population, not the flat global
    // dataset — sidesteps the archetype-selection confound a meta-wide (card, quantity) pool can't
    // separate from a real quantity effect (see cardQuantityAdvice.ts's pickBetterQuantityScoped).
    // Falls back to the global buckets on its own whenever a given card's local cells are too thin.
    const localQuantitySamples: QuantitySample[] = rankingRows.map((r) => {
      const copiesByName = new Map(r.main);
      for (const [name, qty] of r.material) copiesByName.set(name, (copiesByName.get(name) ?? 0) + qty);
      return { copiesByName, winRate: r.winRate };
    });
    const localQuantityBuckets = computeLocalQuantityBuckets(localQuantitySamples);

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
      const entry = computeSingleCardImpact(spiritSectionRows, name, baselineWinRate!, PRIOR_WEIGHT, MIN_SAMPLE_SIZE);
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
        !cardsByName.get(e.cardName)?.subtypes.includes("SPIRIT") &&
        cardsByName.get(e.cardName)?.legality?.STANDARD?.limit !== 0 &&
        !lockedNames.has(e.cardName) &&
        !rejectedCards.has(e.cardName) &&
        (collectionMode !== "owned-only" || (collectionOwnedByName?.get(e.cardName) ?? 0) > 0),
    );
    // Re-order (not re-score) by a small pillar-affinity, community-popularity, and/or decay
    // nudge — each entry's own `adjustedLift` stays the real, honest win-rate number shown in the
    // UI; only which comparably-good real card gets picked first for a limited slot shifts toward
    // the chosen playstyle, the blended community's own usage, or away from a card that's still
    // winning but visibly falling out of use.
    if (pillarBias || communityInclusion || decayingCards || archetypePrevalence || collectionMode === "prioritize") {
      const boostedScore = (e: CardImpactEntry): number => {
        const card = cardsByName.get(e.cardName);
        const pillarBoost = pillarBias && card ? PILLAR_BOOST_WEIGHT * cardPillarScore(card, pillarBias) : 0;
        const communityBoost = communityInclusion ? COMMUNITY_BOOST_WEIGHT * (communityInclusion.get(e.cardName)?.percentOfDecks ?? 0) : 0;
        const archetypeBoost = archetypePrevalence ? ARCHETYPE_BOOST_WEIGHT * (archetypePrevalence.get(e.cardName) ?? 0) : 0;
        const decayPenalty = decayingCards ? DECAY_PENALTY_WEIGHT * (decayingCards.get(e.cardName) ?? 0) : 0;
        const collectionBoost = collectionMode === "prioritize" && (collectionOwnedByName?.get(e.cardName) ?? 0) > 0 ? COLLECTION_BOOST_WEIGHT : 0;
        return e.adjustedLift + pillarBoost + communityBoost + archetypeBoost + collectionBoost - decayPenalty;
      };
      ranked.sort((a, b) => boostedScore(b) - boostedScore(a));
    }
    const entryByName = new Map(ranked.map((e) => [e.cardName, e]));

    const materialTarget = modalSectionTotal(spiritRows, "material", 12);
    const mainTarget = modalSectionTotal(spiritRows, "main", 60);
    const sideboardTarget = modalSectionTotal(spiritRows, "sideboard", 0);

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
    const intendedChampionIdentity = championCard ? championIdentityName(championCard) : null;
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
        if (intendedChampionIdentity) {
          if (championIdentityName(card) !== intendedChampionIdentity) continue;
        }
        const counts = championCardsByLevel.get(card.level) ?? new Map<string, number>();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        championCardsByLevel.set(card.level, counts);
      }
    }
    for (const [level, counts] of Array.from(championCardsByLevel.entries()).sort((a, b) => a[0] - b[0])) {
      if (championLevelCap !== null && level > championLevelCap) continue;
      if (lockedLevels.has(level)) continue;
      // Removing an inferred Champion print is a real choice. Previously it only put the card
      // into `rejectedCards`, but this structural fill ignored that set and restored it every
      // render, making the Remove button look broken.
      const names = Array.from(counts.keys()).filter((name) => !rejectedCards.has(name));
      if (names.length === 0) continue;
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

    // Dominant cards whose printed rules explicitly name this Champion are structural identity
    // support, not ordinary flex picks. Guo Jia's Spirit-matched Fatestone is forced into this set
    // because multiple Fatestones are element-legal while only the Spirit-matched one is intended.
    const identityFatestone = guoJiaFatestoneForIdentity(championCard, spiritCard);
    const namedBonusCandidates = Array.from(cardsByName.values()).flatMap((card) => {
      if (!hasChampionBonus(card, championCard) || card.types.includes("CHAMPION") || card.subtypes.includes("SPIRIT")) return [];
      const mainCount = spiritRows.filter((row) => row.main.has(card.name)).length;
      const materialCount = spiritRows.filter((row) => row.material.has(card.name)).length;
      const presence = spiritRows.filter((row) => row.main.has(card.name) || row.material.has(card.name)).length;
      const forced = card.name === identityFatestone;
      if (!forced && (spiritRows.length < MIN_IDENTITY_STAPLE_POPULATION || presence / spiritRows.length < IDENTITY_STAPLE_PREVALENCE)) return [];
      return [{ card, presence, section: materialCount >= mainCount ? "material" as const : "main" as const, forced }];
    }).sort((a, b) => Number(b.forced) - Number(a.forced) || b.presence - a.presence || a.card.name.localeCompare(b.card.name));
    const deferredIdentityStaples: SuggestedCard[] = [];
    for (const candidate of namedBonusCandidates) {
      const { card, presence, section } = candidate;
      if (
        placed.has(card.name) ||
        rejectedCards.has(card.name) ||
        card.legality?.STANDARD?.limit === 0 ||
        !isElementCompatible(card, identityElements) ||
        (collectionMode === "owned-only" && (collectionOwnedByName?.get(card.name) ?? 0) <= 0)
      ) continue;
      const quantity = section === "material" ? 1 : modalQuantity(spiritRows, "main", card.name, card);
      const suggestion = toSuggested(card.name, quantity, false, undefined, "identity-staple", section, null, {
        source: "matching population",
        sampleSize: presence,
      });
      const sectionCards = section === "material" ? material : main;
      const target = section === "material" ? materialTarget : mainTarget;
      const total = sectionCards.reduce((sum, item) => sum + item.quantity, 0);
      if (total + quantity <= target) sectionCards.push(suggestion);
      else deferredIdentityStaples.push(suggestion);
      placed.add(card.name);
    }

    let materialTotal = material.reduce((sum, c) => sum + c.quantity, 0);
    let mainTotal = main.reduce((sum, c) => sum + c.quantity, 0);
    let sideboardTotal = sideboard.reduce((sum, c) => sum + c.quantity, 0);
    let sideboardPoints = sideboard.reduce((sum, c) => sum + c.quantity * sideboardPointCost(cardsByName.get(c.cardName)), 0);

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
        if (sideboardTotal >= sideboardTarget || sideboardPoints >= SIDEBOARD_POINT_BUDGET) continue;
        const picked = pickQuantity(rankingRows, "sideboard", entry.cardName, card, quantityBucketsByName, localQuantityBuckets);
        const pointCost = sideboardPointCost(card);
        const affordableQty = Math.floor((SIDEBOARD_POINT_BUDGET - sideboardPoints) / pointCost);
        const ownedCap = collectionMode === "owned-only" ? (collectionOwnedByName?.get(entry.cardName) ?? 0) : Number.POSITIVE_INFINITY;
        const qty = Math.min(picked.quantity, sideboardTarget - sideboardTotal, affordableQty, ownedCap);
        if (qty <= 0) continue;
        sideboard.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "sideboard", qty === picked.quantity ? picked.optimizedFrom : null, picked.evidence));
        sideboardTotal += qty;
        sideboardPoints += qty * pointCost;
      } else {
        if (mainTotal >= mainTarget) continue;
        const picked = pickQuantity(rankingRows, "main", entry.cardName, card, quantityBucketsByName, localQuantityBuckets);
        const ownedCap = collectionMode === "owned-only" ? (collectionOwnedByName?.get(entry.cardName) ?? 0) : Number.POSITIVE_INFINITY;
        const qty = Math.min(picked.quantity, mainTarget - mainTotal, ownedCap);
        main.push(toSuggested(entry.cardName, qty, false, entry, "ranked", "main", qty === picked.quantity ? picked.optimizedFrom : null, picked.evidence));
        mainTotal += qty;
      }
      placed.add(entry.cardName);
      if (materialTotal >= materialTarget && mainTotal >= mainTarget && (sideboardTotal >= sideboardTarget || sideboardPoints >= SIDEBOARD_POINT_BUDGET)) break;
    }

    // Everything ranked that still didn't make it in — most visibly non-empty for a fully-locked
    // build (every target already met by locks alone, so the loop above placed nothing new even
    // though `ranked` has real candidates). Shown as swap-in ideas, not auto-filled.
    const rawSuggestions = [
      ...deferredIdentityStaples,
      ...ranked
      .filter((e) => {
        const card = cardsByName.get(e.cardName);
        return !placed.has(e.cardName) && !card?.types.includes("CHAMPION") && isElementCompatible(card, identityElements);
      })
      .map((e) => {
        const card = cardsByName.get(e.cardName);
        const section: DeckSection = e.role === "mixed" ? pluralitySection(rankingRows, e.cardName) : e.role;
        if (section === "material") return toSuggested(e.cardName, 1, false, e, "ranked", section);
        const picked = pickQuantity(rankingRows, section, e.cardName, card, quantityBucketsByName, localQuantityBuckets);
        return toSuggested(e.cardName, picked.quantity, false, e, "ranked", section, picked.optimizedFrom, picked.evidence);
      }),
    ];

    // Review suggestions should preserve the deck's construction packages, not optimize each card
    // as though it existed in isolation. Run the same deterministic engines shown in the Stats tab
    // against the assembled Main deck. Their candidate lists only annotate/reorder cards that
    // already passed the positive-lift bar; readiness never fabricates performance evidence.
    const readinessLines: SynergyLine[] = main.map((card) => ({ name: card.cardName, quantity: card.quantity }));
    const synergyReadiness = computeSynergyReadiness(readinessLines, cardsByName, cardsByName.values(), identityElements, ranked.map((entry) => entry.cardName));
    const dependencyReadiness = computeDependencyReadiness(readinessLines, cardsByName, cardsByName.values(), identityElements, ranked.map((entry) => entry.cardName));
    const suggestions = annotateSuggestions(
      rawSuggestions,
      material,
      main,
      cardsByName,
      intendedChampionIdentity,
      synergyReadiness,
      dependencyReadiness,
      MAX_EXTRA_SUGGESTIONS,
    );

    // Packages may connect sections, so evaluate the assembled deck rather than Main-only
    // readinessLines (for example, a Main activator protecting Material utility cards).
    const packageCatalog = getDeckPackageCatalog([...material, ...main, ...sideboard]);
    const protectedPackages = packageCatalog.filter((entry) => entry.active);
    const packageProtectedCards = new Set(protectedPackages.flatMap((deckPackage) => deckPackage.protectedCards));
    const assembledIdentity = new Map<string, number>();
    for (const card of [...material, ...main]) assembledIdentity.set(card.cardName, card.quantity);
    const materialAlternatives = suggestions.filter((card) => card.section === "material");
    function contextualMaterialReplacement(candidate: SuggestedCard): SuggestedCard["contextualReplacement"] {
      return findContextualMaterialReplacement(
        candidate.cardName,
        assembledIdentity,
        spiritRows,
        materialAlternatives.map((card) => card.cardName),
      );
    }
    const championLevelCeiling = intendedChampionLevel(lockedCards, cardsByName, intendedChampionIdentity);
    const eligibleRemovalSuggestions = [...material, ...main, ...sideboard]
      .filter((c) => {
        if (!c.locked || c.adjustedLift === null || c.adjustedLift > REMOVAL_LIFT_CEILING) return false;
        const card = cardsByName.get(c.cardName);
        const isRequiredChampionProgression =
          championLevelCeiling !== null &&
          !!card?.types.includes("CHAMPION") &&
          !card.subtypes.includes("SPIRIT") &&
          card.level !== null &&
          card.level !== undefined &&
          card.level <= championLevelCeiling &&
          (intendedChampionIdentity === null || championIdentityName(card) === intendedChampionIdentity);
        return !isRequiredChampionProgression && !removalHarmsReadiness(c, synergyReadiness, dependencyReadiness);
      })
      .sort((a, b) => a.adjustedLift! - b.adjustedLift!);
    const contextualRemovalSuggestions = eligibleRemovalSuggestions.flatMap((card) => {
      if (card.section !== "material") return [card];
      const contextualReplacement = contextualMaterialReplacement(card);
      return contextualReplacement ? [{ ...card, contextualReplacement }] : [];
    });
    const protectedRemovalSuggestions = contextualRemovalSuggestions.filter((card) => packageProtectedCards.has(card.cardName));
    const removalSuggestions = contextualRemovalSuggestions
      .filter((card) => !packageProtectedCards.has(card.cardName))
      .slice(0, MAX_REMOVAL_SUGGESTIONS);

    const hasQuantityOptimizations = [...material, ...main, ...sideboard, ...suggestions].some((c) => c.optimizedFrom !== null);

    return {
      material,
      main,
      sideboard,
      suggestions,
      removalSuggestions,
      protectedRemovalSuggestions,
      protectedPackages,
      packageCatalog,
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
  }
}
