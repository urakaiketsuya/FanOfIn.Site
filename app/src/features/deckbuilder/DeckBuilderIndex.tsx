import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, CommunityCoOccurrenceEntry, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { championSlugsFor, mergeCardInclusionBuckets, mergeCoOccurrenceForCard } from "../community/data";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardsByNames } from "../events/useCardsByNames";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { computeDeckIdentity, computeDeckRating, type RatingPillar } from "../../lib/deckIdentity";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import NotificationBanner from "../../components/ui/NotificationBanner";
import PageHeader from "../../components/ui/PageHeader";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { useNearestDecks, type NearestDeck } from "./useNearestDecks";
import { useBuildCounters } from "./useBuildCounters";
import { computeIdentityElements, findChampionCard, useSuggestedBuild, type SuggestedCard } from "./useSuggestedBuild";
import { useCommunitySuggestedBuild } from "./useCommunitySuggestedBuild";
import { useSimulatorSuggestedBuild } from "./useSimulatorSuggestedBuild";
import { useCardFieldVisibility } from "./useCardFieldVisibility";
import { useBuilderViewMode } from "./useBuilderViewMode";
import { usePriceTrendByName } from "../pricing/usePriceTrendByName";
import { useBuddyCards } from "./useBuddyCards";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost, validateDeck } from "./validateDeck";
import { computeDependencyReadiness, computeSynergyReadiness } from "./synergyReadiness";
import { computeNewReleaseCards } from "./newReleaseCards";
import { computeCardDecay } from "../../lib/cardDecay";
import { accountApi } from "../../lib/accountApi";
import { clearBuilderSession, loadBuilderSession, parseBuilderShareParams } from "./persistence/builderPersistence";
import { selectionsToMaps, type ChangeLogEntry, type LockedSection, type PopulationSource } from "./model/builderTypes";
import { buildToDecklist, calculateLinePrice, deriveArchetypeOptions, deriveReviewGroups } from "./engine/builderSelectors";
import { buildSuggestedDeck } from "./engine/buildSuggestedDeck";
import { useDeckBuilderData } from "./data/useDeckBuilderData";
import PageLayout from "../../components/layout/PageLayout";
import BuilderChangeLog from "./panels/BuilderChangeLog";
import ImprovementReviewPanel from "./panels/ImprovementReviewPanel";
import ToolsPanel from "./panels/BuilderToolsPanel";
import StatsPanel from "./panels/BuilderStatsPanel";
import BuddyCardsList from "./panels/BuilderBuddyPanel";
import { useBuilderWorkflowState } from "./controller/useBuilderWorkflowState";
import { useBuilderSessionPersistence } from "./controller/useBuilderSessionPersistence";
import { useBuilderCopyState } from "./controller/useBuilderCopyState";
import BuilderCopyPanel from "./panels/BuilderCopyPanel";
import BuilderBuildPanel from "./panels/BuilderBuildPanel";
import BuilderReviewPanel from "./panels/BuilderReviewPanel";

type BuilderTab = "build" | "review" | "stats" | "tools" | "buddies" | "copy" | "log";
const TAB_KEYS: BuilderTab[] = ["build", "review", "stats", "tools", "buddies", "copy", "log"];

type BuilderIntent = "seed" | "scratch";

const BUILDER_INTENTS: { key: BuilderIntent; title: string; description: string }[] = [
  { key: "seed", title: "Build around cards", description: "Choose a Champion and Spirit, lock the cards you care about, and fill the rest." },
  { key: "scratch", title: "Start from scratch", description: "Choose a Champion and Spirit, then optimize a full suggested list." },
];

interface UrlSeed {
  championName: string;
  spiritFilter: string | null;
  archetypeId: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
}

/**
 * Parses a shared link's ?champion=&spirit=&locked= params, for use as the *initial* state itself
 * (see the useState calls below) rather than seeding via an effect after mount. An effect-based
 * approach was tried first and had a real bug: the champion-reset effect (keyed on championName)
 * and a "seed from URL" effect both run on mount, in declaration order, and the reset effect's
 * very first run has no way to know a seed is coming a moment later — it queues a transition that
 * clears lockedCards, which then lands *after* the seed effect's own (higher-priority) update,
 * silently wiping the shared cards back out. Computing the seed before first render sidesteps the
 * race entirely: there's no reset-then-reseed dance because the state is correct from render one.
 */
function parseUrlSeed(searchParams: URLSearchParams): UrlSeed | null {
  const selection = parseBuilderShareParams(searchParams);
  if (!selection?.championName) return null;
  const { cards: lockedCards, sections: lockedSections } = selectionsToMaps(selection.lockedCards ?? []);
  return {
    championName: selection.championName,
    spiritFilter: selection.spiritName ?? null,
    archetypeId: selection.archetypeId ?? null,
    lockedCards,
    lockedSections,
  };
}

interface SessionSeed {
  championName: string;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  archetypeId: string | null;
  populationSource: PopulationSource;
  championLevelCap: number | null;
  collectionMode: "all" | "prioritize" | "owned-only";
  changeLog: ChangeLogEntry[];
  maybeboard: Map<string, number>;
}

/**
 * Restores the last in-progress session from this browser tab, so navigating away (e.g. clicking
 * a suggested card's own page) and back via the browser Back button doesn't reset every choice —
 * sessionStorage survives that unmount/remount, unlike plain component state. Scoped to the tab
 * (cleared when it closes) — distinct from the deliberate, on-demand "Copy share link" snapshot
 * (handleCopyShareLink below), which stays untouched. Wrapped in try/catch: a corrupted or
 * outdated-shape blob (e.g. from a future version of this file) should read as "no saved session,"
 * never crash the page — same defensive posture parseUrlSeed's callers already get from a missing
 * `?champion=` param.
 */
function loadSessionSeed(): SessionSeed | null {
  const session = loadBuilderSession(sessionStorage);
  if (!session?.selection.championName) return null;
  const locked = selectionsToMaps(session.selection.lockedCards);
  const maybeboard = selectionsToMaps(session.selection.maybeboard);
  return {
    championName: session.selection.championName,
    spiritFilter: session.selection.spiritName,
    lockedCards: locked.cards,
    lockedSections: locked.sections,
    rejectedCards: new Set(session.selection.rejectedCards),
    pillarBias: session.selection.pillarBias,
    archetypeId: session.selection.archetypeId,
    populationSource: session.selection.populationSource,
    championLevelCap: session.selection.championLevelCap,
    collectionMode: session.selection.collectionMode,
    changeLog: session.changeLog,
    maybeboard: maybeboard.cards,
  };
}

export default function DeckBuilderIndex() {
  useDocumentTitle(
    "Guided Deck Builder",
    "Build a Grand Archive deck from tournament win-rate, blended community-usage, or balanced recommendations, then tune, validate, share, buy, export, or playtest it.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const improveDeckId = searchParams.get("improveDeck");
  const isImproving = Boolean(improveDeckId);
  const intentParam = searchParams.get("intent");
  const builderIntent: BuilderIntent | null = intentParam === "seed" || intentParam === "scratch" ? intentParam : null;
  const [deckFormat, setDeckFormat] = useState<DeckFormat>(() => searchParams.get("format")?.toUpperCase() === "PANTHEON" ? "PANTHEON" : "STANDARD");
  // Computed fresh each render (cheap — parsing a couple of query params), but only its value on
  // the very first render actually matters: every useState below that reads from it only consults
  // its initializer once, on mount, same as React already guarantees for lazy useState.
  const urlSeed = parseUrlSeed(searchParams);
  // An explicit shared link always wins over a leftover session — someone opening a shared link
  // wants *that* state, not whatever this tab happened to have saved from before. Only consulted
  // once (mount), same as urlSeed itself — see loadSessionSeed's own doc comment for why a lazy
  // initializer, not an effect, is what avoids the reset-then-reseed race parseUrlSeed warns about.
  const sessionSeed = urlSeed ? null : loadSessionSeed();

  const workflow = useBuilderWorkflowState({
    championName: urlSeed?.championName ?? sessionSeed?.championName ?? null,
    spiritFilter: urlSeed?.spiritFilter ?? sessionSeed?.spiritFilter ?? null,
    lockedCards: urlSeed?.lockedCards ?? sessionSeed?.lockedCards ?? new Map(),
    maybeboard: sessionSeed?.maybeboard ?? new Map(),
    lockedSections: urlSeed?.lockedSections ?? sessionSeed?.lockedSections ?? new Map(),
    rejectedCards: sessionSeed?.rejectedCards ?? new Set(),
    pillarBias: sessionSeed?.pillarBias ?? null,
    archetypeId: urlSeed?.archetypeId ?? sessionSeed?.archetypeId ?? null,
    championLevelCap: sessionSeed?.championLevelCap ?? null,
    populationSource: sessionSeed?.populationSource ?? "balanced",
    collectionMode: sessionSeed?.collectionMode ?? "all",
    changeLog: sessionSeed?.changeLog ?? [],
  });
  const {
    championName, spiritFilter, lockedCards, maybeboard, lockedSections, rejectedCards,
    pillarBias, archetypeId, championLevelCap, populationSource, collectionMode, changeLog,
  } = workflow.state;
  const {
    setChampionName, setSpiritFilter, setLockedCards, setMaybeboard, setLockedSections,
    setRejectedCards, setPillarBias, setArchetypeId, setChampionLevelCap, setPopulationSource,
    setCollectionMode, setChangeLog,
  } = workflow;
  useBuilderSessionPersistence(deckFormat, workflow.state);
  const [spiritElement, setSpiritElement] = useState<string | null>(null);
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  const [visibleFields, setVisibleField] = useCardFieldVisibility();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [viewMode, setViewMode] = useBuilderViewMode();
  const priceTrendByName = usePriceTrendByName();
  const [dismissedReviewCards, setDismissedReviewCards] = useState<Set<string>>(new Set());
  const [showProtectedCuts, setShowProtectedCuts] = useState(false);
  const [tab, setTab] = useTabParam<BuilderTab>("tab", TAB_KEYS, "build");
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  // Set right before a state change that'll cause a recompute, read (and cleared) by the effect
  // below once that recompute lands — pairs the resulting suggestion diff with the action that
  // caused it. `subject` is excluded from the diff itself since "I locked X" already says X
  // changed; the log is about the ripple effect on everything else.
  const pendingActionRef = useRef<{ label: string; subject: string | null } | null>(null);
  const prevSuggestedRef = useRef<Set<string> | null>(null);
  const prevWinRateRef = useRef<number | null>(null);
  // Set right before setChampionName() by loadPastedDecklist() so the reset effect below doesn't
  // clobber the Spirit/locks it just derived — a normal Champion-dropdown change still resets to a
  // blank slate as usual. (Not used for the URL-seed case below — see lastResetChampionRef.)
  const skipNextResetRef = useRef(false);
  // The championName the reset effect has already dealt with (by resetting or by skipping) —
  // starts at the seeded Champion so its very first (mount) run is a no-op. This has to be an
  // idempotent *comparison* rather than a one-shot flag: React 18 StrictMode double-invokes mount
  // effects in dev, and a flag that gets flipped inside the effect body reads as "already
  // consumed" on the second invocation, incorrectly falling through to a real reset that clobbers
  // the just-seeded lockedCards a moment later. Comparing against a ref that's never mutated
  // during a no-op run stays correct across as many redundant invocations as StrictMode throws at it.
  const lastResetChampionRef = useRef(urlSeed?.championName ?? sessionSeed?.championName ?? null);

  function chooseIntent(intent: BuilderIntent) {
    const next = new URLSearchParams(searchParams);
    next.set("intent", intent);
    next.set("tab", "build");
    setSearchParams(next, { replace: true });
  }

  const showNearestDecks = lockedCards.size >= 2;
  const builderData = useDeckBuilderData({ championName, format: deckFormat, includeDecodedDecks: showNearestDecks });
  const {
    popularityIndex: popularityIndexData,
    liveCatalogByName,
    catalog: cardCatalog,
    catalogByName,
    spiritCanonicalNames,
    collectionOwnedByName,
    population: { rows, spiritsPresent, loading: populationLoading },
    cardQuantityStats: cardQuantityStatsData,
    compositionWinRates: compositionWinRateData,
    archetypeTaxonomy: archetypeTaxonomyData,
    cardImpact: cardImpactData,
    matchupCardImpact: matchupCardImpactData,
    decodedDecks: allDecks,
    communityInclusion: communityCardInclusion,
    communityCoOccurrence,
    simulatorSummary,
    priceByName,
  } = builderData;
  // Shared links and pasted decks can name a cosmetic equivalent. Store the canonical Spirit so
  // it uses the same population as the picker (Miao, Spirit of Water = Spirit of Water).
  useEffect(() => {
    if (!spiritFilter) return;
    const canonical = spiritCanonicalNames.get(spiritFilter);
    if (canonical && canonical !== spiritFilter) setSpiritFilter(canonical);
  }, [spiritFilter, spiritCanonicalNames, setSpiritFilter]);
  useEffect(() => {
    if (!improveDeckId) return;
    void accountApi.deck(improveDeckId).then(({ deck }) => {
      setMaybeboard(new Map(deck.maybeboard.map((line) => [line.card, line.quantity])));
    }).catch(() => undefined);
  }, [improveDeckId, setMaybeboard]);
  const collectionRejectedCards = useMemo(() => {
    if (collectionMode !== "owned-only") return rejectedCards;
    const next = new Set(rejectedCards);
    for (const card of cardCatalog) if ((collectionOwnedByName.get(card.name) ?? 0) === 0 && !lockedCards.has(card.name)) next.add(card.name);
    return next;
  }, [collectionMode, rejectedCards, cardCatalog, collectionOwnedByName, lockedCards]);
  const archetypeOptions = useMemo(() => deriveArchetypeOptions(championName, archetypeTaxonomyData), [championName, archetypeTaxonomyData]);
  const selectedArchetype = useMemo(
    () => archetypeOptions.some((option) => option.id === archetypeId)
      ? archetypeTaxonomyData?.clusters.find((cluster) => cluster.id === archetypeId)
      : undefined,
    [archetypeTaxonomyData, archetypeId, archetypeOptions],
  );
  const archetypePrevalence = useMemo(() => {
    if (!selectedArchetype) return undefined;
    return new Map(selectedArchetype.definingCards.map((card) => [card.name, card.prevalence]));
  }, [selectedArchetype]);
  // A selected build path is evidence, not merely decoration: keep the original Champion pool
  // but use only the path's observed decks for tournament/balanced recommendations. A Spirit
  // selection below further narrows that path, preventing a broad family from mixing Spirits.
  const recommendationRows = useMemo(() => {
    if (!selectedArchetype) return rows;
    const deckIds = new Set(selectedArchetype.deckIds);
    return rows.filter((row) => deckIds.has(row.deckId));
  }, [rows, selectedArchetype]);
  // Similar real decks become useful only once the viewer has expressed enough intent through
  // locks. Keep the expensive all-deck decode off the default path until then.

  // Resolved against the *stable* single-Champion population (`rows`, not whichever pool is
  // active) — see `useSuggestedBuild`'s `championCardOverride` doc comment for why this matters
  // once a cross-Champion pool is in play: without it, the Champion-print anchor and granted
  // elements would be guessed from whichever Champion happens to be common in a borrowed
  // population, not the one the viewer actually picked.
  const championCard = useMemo(() => findChampionCard(recommendationRows, lockedCards, catalogByName), [recommendationRows, lockedCards, catalogByName]);
  const spiritCardForIdentity = spiritFilter ? catalogByName.get(spiritFilter) : undefined;
  const identityElements = useMemo(
    () => computeIdentityElements(championCard, spiritCardForIdentity),
    [championCard, spiritCardForIdentity],
  );

  const communityChampData = useMemo(() => {
    if (!communityCardInclusion || !championName) return undefined;
    const slugs = championSlugsFor(Object.keys(communityCardInclusion.byChampion), championName);
    if (slugs.length === 0) return undefined;
    return mergeCardInclusionBuckets(slugs.map((slug) => communityCardInclusion.byChampion[slug]));
  }, [communityCardInclusion, championName]);
  const communityInclusionByName = useMemo(() => {
    if (!communityChampData) return undefined;
    return new Map(communityChampData.cards.map((c) => [c.name, c]));
  }, [communityChampData]);
  const communityLockedCards = useMemo(() => {
    if (deckFormat !== "PANTHEON" || !spiritFilter) return lockedCards;
    const next = new Map(lockedCards);
    next.set(spiritFilter, 1);
    return next;
  }, [deckFormat, spiritFilter, lockedCards]);

  // Computed here (rather than down with sortedSpirits/spiritStats below) so its top signals can
  // feed the "balanced" source's decay nudge right below — see DECAY_PENALTY_WEIGHT's doc comment.
  const decayReport = useMemo(
    () => computeCardDecay(recommendationRows, spiritFilter, catalogByName),
    [recommendationRows, spiritFilter, catalogByName],
  );
  const decayingCardBoost = useMemo(
    () => (decayReport ? new Map(decayReport.signals.map((s) => [s.cardName, s.decay])) : undefined),
    [decayReport],
  );
  // Grid-view "Meta trend" toggle wants the full signal (recent/prior rate, replacement
  // suggestion), not just decayingCardBoost's single ranking-nudge number. computeCardDecay only
  // returns its top 6 flagged decliners (see its own doc comment), so most cards have no entry here.
  const decaySignalByName = useMemo(
    () => (decayReport ? new Map(decayReport.signals.map((s) => [s.cardName, s])) : undefined),
    [decayReport],
  );
  // Champion-scoped real tournament inclusion rate per card, for the grid's "Hype gap" toggle —
  // mirrors CardStatsIndex.tsx's hypeGap idea (community brew rate minus tournament share) but
  // recomputed against this Champion's own population rather than the whole card pool, since that's
  // the more relevant denominator for "is this overhyped for THIS Champion specifically".
  const tournamentInclusionByName = useMemo(() => {
    if (recommendationRows.length === 0) return undefined;
    const counts = new Map<string, number>();
    for (const row of recommendationRows) {
      for (const name of row.main.keys()) counts.set(name, (counts.get(name) ?? 0) + 1);
      for (const name of row.material.keys()) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const byName = new Map<string, number>();
    for (const [name, count] of counts) byName.set(name, count / recommendationRows.length);
    return byName;
  }, [recommendationRows]);
  const hypeGapByName = useMemo(() => {
    if (!communityInclusionByName || !tournamentInclusionByName) return undefined;
    const byName = new Map<string, number>();
    for (const [name, entry] of communityInclusionByName) {
      byName.set(name, entry.percentOfDecks - (tournamentInclusionByName.get(name) ?? 0));
    }
    return byName;
  }, [communityInclusionByName, tournamentInclusionByName]);

  const tournamentBuild = useSuggestedBuild(
    recommendationRows,
    spiritFilter,
    lockedCards,
    collectionRejectedCards,
    populationLoading,
    lockedSections,
    cardQuantityStatsData,
    championCard,
    pillarBias,
    undefined,
    undefined,
    archetypePrevalence,
    collectionOwnedByName,
    collectionMode,
    championLevelCap,
  );
  // Same real tournament ranking as tournamentBuild above, plus a community-popularity nudge and a
  // decay penalty — see COMMUNITY_BOOST_WEIGHT's and DECAY_PENALTY_WEIGHT's doc comments. Computed
  // unconditionally (same pattern as tournamentBuild/communityBuild/simulatorResult below) so
  // switching sources doesn't need a recompute.
  const balancedBuild = useSuggestedBuild(
    recommendationRows,
    spiritFilter,
    lockedCards,
    collectionRejectedCards,
    populationLoading,
    lockedSections,
    cardQuantityStatsData,
    championCard,
    pillarBias,
    communityInclusionByName,
    decayingCardBoost,
    archetypePrevalence,
    collectionOwnedByName,
    collectionMode,
    championLevelCap,
  );
  const communityBuild = useCommunitySuggestedBuild(communityChampData, communityLockedCards, lockedSections, collectionRejectedCards, catalogByName, !communityCardInclusion, identityElements, deckFormat, championCard, spiritCardForIdentity);
  const simulatorResult = useSimulatorSuggestedBuild(communityBuild, simulatorSummary, cardCatalog);
  const effectivePopulationSource: PopulationSource = deckFormat === "PANTHEON" ? "community" : populationSource;
  const build = useMemo(() => buildSuggestedDeck(
    { format: deckFormat, populationSource, collectionMode },
    { tournament: tournamentBuild, balanced: balancedBuild, community: communityBuild, simulator: simulatorResult.build, collectionOwnedByName },
  ), [deckFormat, populationSource, collectionMode, tournamentBuild, balancedBuild, communityBuild, simulatorResult.build, collectionOwnedByName]);

  const reviewSuggestions = useMemo(
    () => build.suggestions.filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.suggestions, dismissedReviewCards],
  );
  const reviewRemovals = useMemo(
    () => [...build.removalSuggestions, ...(showProtectedCuts ? build.protectedRemovalSuggestions : [])]
      .filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build.removalSuggestions, build.protectedRemovalSuggestions, dismissedReviewCards, showProtectedCuts],
  );
  const reviewGroups = useMemo(() => deriveReviewGroups(reviewRemovals, reviewSuggestions), [reviewRemovals, reviewSuggestions]);
  const reviewItemCount = reviewGroups.pairs.length + reviewGroups.unpairedRemovals.length + reviewGroups.unpairedSuggestions.length;
  const reviewRemovalNames = useMemo(() => new Set(reviewRemovals.map((card) => card.cardName)), [reviewRemovals]);

  // A dismissal belongs to the current recommendation lens. Changing the Spirit, source, or
  // tuning can produce materially different evidence for the same card, so surface it again.
  useEffect(() => {
    setDismissedReviewCards(new Set());
    setShowProtectedCuts(false);
  }, [championName, spiritFilter, effectivePopulationSource, pillarBias, archetypeId]);

  const nearestDecks = useNearestDecks(allDecks, lockedCards);
  const buildCounters = useBuildCounters(nearestDecks, cardImpactData, matchupCardImpactData);
  const hurtYouCards = buildCounters.selectedMatchup?.opponentCards ?? [];
  const hurtYouCardImages = useCardsByNames(useMemo(() => hurtYouCards.map((c) => c.cardName), [hurtYouCards]));
  const gateLoading = deckFormat === "PANTHEON"
    ? !communityCardInclusion
    : effectivePopulationSource === "community"
      ? !communityCardInclusion
      : effectivePopulationSource === "simulator"
        ? !communityCardInclusion || !simulatorSummary
        : populationLoading;
  const gateHasData = deckFormat === "PANTHEON" || effectivePopulationSource === "community" || effectivePopulationSource === "simulator"
    ? Boolean(communityChampData)
    : rows.length > 0;

  const spiritStats = useMemo(() => {
    const stats = new Map<string, { decks: number }>();
    for (const spirit of spiritsPresent) {
      const matching = rows.filter((row) => row.spiritName === spirit);
      stats.set(spirit, { decks: matching.length });
    }
    return stats;
  }, [rows, spiritsPresent]);
  const sortedSpirits = useMemo(
    () => [...spiritsPresent].sort((a, b) => (spiritStats.get(b)?.decks ?? 0) - (spiritStats.get(a)?.decks ?? 0) || a.localeCompare(b)),
    [spiritsPresent, spiritStats],
  );
  const spiritElements = useMemo(
    () => Array.from(new Set(sortedSpirits.flatMap((name) => liveCatalogByName.get(name)?.elements ?? [])))
      .filter((element) => element !== "NORM")
      .sort(),
    [sortedSpirits, liveCatalogByName],
  );
  const spiritsForElement = useMemo(
    () => spiritElement ? sortedSpirits.filter((name) => liveCatalogByName.get(name)?.elements.includes(spiritElement)) : sortedSpirits,
    [spiritElement, sortedSpirits, liveCatalogByName],
  );
  function spiritOptionLabel(name: string): string {
    const stats = spiritStats.get(name);
    if (!stats) return name;
    return `${name} — ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"}`;
  }

  useEffect(() => {
    const current = new Set(
      [...build.material, ...build.main].filter((c) => !c.locked).map((c) => c.cardName),
    );
    const pending = pendingActionRef.current;
    const prev = prevSuggestedRef.current;
    const prevWinRate = prevWinRateRef.current;
    if (prev && pending) {
      const subject = pending.subject;
      const added = Array.from(current).filter((n) => !prev.has(n) && n !== subject);
      const removed = Array.from(prev).filter((n) => !current.has(n) && n !== subject);
      const winRateDelta =
        prevWinRate !== null && build.conditionalWinRate !== null ? build.conditionalWinRate - prevWinRate : null;
      setChangeLog((log) => [{ label: pending.label, added, removed, winRateDelta }, ...log].slice(0, 25));
    }
    prevSuggestedRef.current = current;
    prevWinRateRef.current = build.conditionalWinRate;
    pendingActionRef.current = null;
  }, [build, setChangeLog]);

  const championsPresent = useMemo(() => {
    if (!popularityIndexData) return [];
    return Array.from(new Set(popularityIndexData.entries.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [popularityIndexData]);

  const cardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const cardNameSet = useMemo(() => new Set(cardNames), [cardNames]);

  const allNames = useMemo(
    () => [...build.material, ...build.main, ...build.sideboard].map((c) => c.cardName),
    [build.material, build.main, build.sideboard],
  );
  // Buddy Cards' own exclusion set — everything actually in the deck, plus everything already
  // recommended under "Cards that might help" (build.suggestions). Not the same as allNames (the
  // real decklist used for price/export/etc.): a card only suggested, not yet added, shouldn't be
  // hidden from the export, but showing it again as a "buddy" is redundant with a suggestion the
  // tool is already making through the ranked lens.
  const placedNames = useMemo(
    () => new Set([...allNames, ...build.suggestions.map((c) => c.cardName)]),
    [allNames, build.suggestions],
  );
  const buddyCards = useBuddyCards(rows, spiritFilter, lockedCards, placedNames);
  const communityBuddyCards = useMemo(() => {
    const result = new Map<string, CommunityCoOccurrenceEntry[]>();
    if (!communityCoOccurrence || !championName) return result;
    const slugs = championSlugsFor(Object.keys(communityCoOccurrence.byChampion), championName);
    if (slugs.length === 0) return result;
    const buckets = slugs.map((slug) => communityCoOccurrence.byChampion[slug]);
    // Same exclusion as useBuddyCards's own excludeNames — a card already in the assembled build
    // isn't a useful "buddy" suggestion (there's nowhere to add it).
    for (const name of lockedCards.keys()) {
      const keyCardDeckCount = communityInclusionByName?.get(name)?.deckCount ?? 0;
      result.set(name, mergeCoOccurrenceForCard(buckets, name, keyCardDeckCount).filter((b) => !placedNames.has(b.cardName)));
    }
    return result;
  }, [communityCoOccurrence, championName, communityInclusionByName, lockedCards, placedNames]);
  const buddyNames = useMemo(() => Array.from(buddyCards.values()).flatMap((list) => list.map((b) => b.cardName)), [buddyCards]);
  const suggestionNames = useMemo(() => build.suggestions.map((c) => c.cardName), [build.suggestions]);
  const cardsByName = useCardsByNames(useMemo(() => [...allNames, ...buddyNames, ...suggestionNames, ...maybeboard.keys()], [allNames, buddyNames, suggestionNames, maybeboard]));

  useEffect(() => {
    if (lastResetChampionRef.current === championName) {
      // Already handled this exact championName (the seeded initial value, or a StrictMode
      // dev double-invoke re-running this same effect) — idempotent no-op.
      return;
    }
    lastResetChampionRef.current = championName;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
    } else {
      startTransition(() => {
        setSpiritFilter(null);
        setSpiritElement(null);
        // A seed-card build intentionally starts with cards before its identity. Preserve those
        // choices while the user tries compatible Champions; all other workflows reset normally.
        if (builderIntent !== "seed") {
          setLockedCards(new Map());
          setLockedSections(new Map());
        }
        setMaybeboard(new Map());
        setRejectedCards(new Set());
        setDismissedReviewCards(new Set());
        setArchetypeId(null);
        setChangeLog([]);
      });
    }
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championName, builderIntent]);

  // The shared link's params (see handleCopyShareLink below) already did their job as the
  // *initial* state above — this just clears them once mounted, so the URL doesn't look "stuck"
  // to the original shared state once the viewer starts editing.
  useEffect(() => {
    if (!urlSeed) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("champion");
        next.delete("spirit");
        next.delete("pool");
        next.delete("pillar");
        next.delete("archetype");
        next.delete("locked");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Bulk equivalent of picking a Champion+Spirit then locking every remaining card by hand —
   * detects the Champion (material CHAMPION-type card, non-Spirit) and Spirit (material
   * CHAMPION+SPIRIT card, same rule useDeckBuilderPopulation uses) from the pasted list, then
   * locks everything else (including the specific Champion-level prints run, so the algorithm
   * doesn't silently swap in a different print at that level).
   */
  function loadPastedDecklist() {
    const { decklist, skippedLines } = parseDecklist(pasteText);
    const lines = [...decklist.main, ...decklist.material, ...decklist.sideboard];
    if (lines.length === 0) {
      setPasteError(skippedLines.length > 0 ? "Couldn't recognize any card lines in that paste." : "Paste a decklist first.");
      return;
    }

    let detectedChampion: string | null = null;
    let detectedSpirit: string | null = null;
    const newLocked = new Map<string, number>();
    const newSections = new Map<string, "main" | "material" | "sideboard">();

    for (const section of ["main", "material", "sideboard"] as const) {
      for (const line of decklist[section]) {
        const card = catalogByName.get(line.card);
        if (card?.types.includes("CHAMPION")) {
          if (card.subtypes.includes("SPIRIT")) {
            detectedSpirit = line.card;
            continue;
          }
          if (!detectedChampion) detectedChampion = card.name.split(",")[0].trim();
        }
        newLocked.set(line.card, (newLocked.get(line.card) ?? 0) + line.quantity);
        newSections.set(line.card, section);
      }
    }

    if (!detectedChampion) {
      setPasteError("Couldn't find a Champion card in this decklist.");
      return;
    }

    if (detectedChampion !== championName) skipNextResetRef.current = true;
    setChampionName(detectedChampion);
    setSpiritFilter(detectedSpirit ? (spiritCanonicalNames.get(detectedSpirit) ?? detectedSpirit) : null);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setMaybeboard(new Map());
    setRejectedCards(new Set());
    setDismissedReviewCards(new Set());
    setChangeLog([]);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;

    setPasteText("");
    setPasteError(null);
    setPasteOpen(false);
    setTab("review");
  }

  /** Loads a `useNearestDecks` result as the new starting point — same shape as `loadPastedDecklist`, just sourced from an already-decoded real deck instead of re-parsing text. */
  function loadNearestDeck(deck: NearestDeck) {
    const newLocked = new Map<string, number>();
    const newSections = new Map<string, LockedSection>();
    for (const [section, lines] of [
      ["main", deck.main],
      ["material", deck.material],
      ["sideboard", deck.sideboard],
    ] as const) {
      for (const [name, qty] of lines) {
        newLocked.set(name, qty);
        newSections.set(name, section);
      }
    }

    if (deck.championName && deck.championName !== championName) skipNextResetRef.current = true;
    if (deck.championName) setChampionName(deck.championName);
    setSpiritFilter(deck.spiritName ? (spiritCanonicalNames.get(deck.spiritName) ?? deck.spiritName) : null);
    setLockedCards(newLocked);
    setLockedSections(newSections);
    setMaybeboard(new Map());
    setRejectedCards(new Set());
    setChangeLog([]);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
  }

  /** `section` is the section this card is being locked FROM (known for sure, since it's the list the click came from) — recorded so the section survives even if the current population barely plays this card (see lockedSections' doc comment). Omitted when unlocking. */
  function toggleLock(name: string, quantity: number, section?: "main" | "material" | "sideboard") {
    const willLock = !lockedCards.has(name);
    pendingActionRef.current = { label: willLock ? `Chose ${name}` : `Released ${name}`, subject: name };
    startTransition(() => {
      setLockedCards((prev) => {
        const next = new Map(prev);
        if (next.has(name)) next.delete(name);
        else next.set(name, quantity);
        return next;
      });
      setLockedSections((prev) => {
        const next = new Map(prev);
        if (willLock && section) next.set(name, section);
        else next.delete(name);
        return next;
      });
    });
  }

  /** Editing a locked card's own copy count — doesn't touch lock state or section, just the quantity. No changelog entry: this is a fine-tune, not a suggestion-changing action, and firing one per keystroke on the number input would spam the log. */
  function setLockedQuantity(name: string, quantity: number) {
    startTransition(() =>
      setLockedCards((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Map(prev);
        next.set(name, quantity);
        return next;
      }),
    );
  }

  /** Locked cards are dropped from the deck entirely; a non-locked (suggested) card is instead excluded from future suggestions, so a different card fills that slot. */
  function removeCard(name: string, locked: boolean) {
    pendingActionRef.current = { label: locked ? `Removed ${name}` : `Excluded ${name} from suggestions`, subject: name };
    startTransition(() => {
      if (locked) {
        setLockedCards((prev) => {
          const next = new Map(prev);
          const removed = catalogByName.get(name);
          // Champion levels are a progression: removing level 2 must also remove any later
          // locked levels for that same Champion, otherwise the material deck is invalid.
          if (removed?.types.includes("CHAMPION") && !removed.subtypes.includes("SPIRIT") && removed.level !== null && removed.level !== undefined) {
            const identity = removed.name.split(",")[0].trim();
            for (const lockedName of next.keys()) {
              const candidate = catalogByName.get(lockedName);
              if (candidate?.types.includes("CHAMPION") && !candidate.subtypes.includes("SPIRIT") && candidate.level !== null && candidate.level !== undefined && candidate.level > removed.level && candidate.name.split(",")[0].trim() === identity) next.delete(lockedName);
            }
          }
          next.delete(name);
          return next;
        });
        setLockedSections((prev) => {
          const next = new Map(prev);
          const removed = catalogByName.get(name);
          if (removed?.types.includes("CHAMPION") && !removed.subtypes.includes("SPIRIT") && removed.level !== null && removed.level !== undefined) {
            const identity = removed.name.split(",")[0].trim();
            for (const lockedName of next.keys()) {
              const candidate = catalogByName.get(lockedName);
              if (candidate?.types.includes("CHAMPION") && !candidate.subtypes.includes("SPIRIT") && candidate.level !== null && candidate.level !== undefined && candidate.level > removed.level && candidate.name.split(",")[0].trim() === identity) next.delete(lockedName);
            }
          }
          next.delete(name);
          return next;
        });
      } else {
        setRejectedCards((prev) => new Set(prev).add(name));
      }
    });
  }

  function addCard(name: string) {
    if (!cardNameSet.has(name) || (lockedCards.has(name) && addDestination !== "maybeboard")) return;
    const card = cardCatalog.find((c) => c.name === name);
    // Champion/Regalia cards are Material-deck-only and capped at 1 copy there regardless of the
    // card's own UNIQUE/Standard limit (see useSuggestedBuild.ts's build-time precheck for the
    // real-data verification) — computed here too so the stored quantity starts correct instead of
    // only getting clamped once the build assembles.
    const isMaterialOnly = card ? card.types.includes("CHAMPION") || card.types.includes("REGALIA") : false;
    const defaultQty = isMaterialOnly ? 1 : 4;
    const currentSideboardPoints = build.sideboard.reduce(
      (sum, entry) => sum + entry.quantity * sideboardPointCost(catalogByName.get(entry.cardName)),
      0,
    );
    const fitsSideboard = currentSideboardPoints + defaultQty * sideboardPointCost(card) <= SIDEBOARD_POINT_BUDGET;
    if (addDestination === "maybeboard") {
      setMaybeboard((previous) => new Map(previous).set(name, defaultQty));
      setCardInput("");
      setAddDestination("automatic");
      return;
    }
    const placeInSideboard = addDestination === "sideboard" && fitsSideboard;
    pendingActionRef.current = { label: `Added ${name}`, subject: name };
    startTransition(() => {
      setLockedCards((prev) => {
        const next = new Map(prev);
        next.set(name, defaultQty);
        return next;
      });
      if (placeInSideboard) {
        setLockedSections((prev) => new Map(prev).set(name, "sideboard"));
      }
    });
    setCardInput("");
    setAddDestination("automatic");
  }

  function removeMaybeCard(name: string) {
    setMaybeboard((previous) => {
      const next = new Map(previous);
      next.delete(name);
      return next;
    });
  }

  function setMaybeQuantity(name: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setMaybeboard((previous) => new Map(previous).set(name, Math.min(quantity, 4)));
  }

  function promoteMaybeCard(name: string) {
    const quantity = maybeboard.get(name);
    if (!quantity || lockedCards.has(name)) return;
    const card = catalogByName.get(name);
    const section: LockedSection = card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" : "main";
    pendingActionRef.current = { label: `Added ${name} from maybeboard`, subject: name };
    startTransition(() => {
      setLockedCards((previous) => new Map(previous).set(name, quantity));
      setLockedSections((previous) => new Map(previous).set(name, section));
      setMaybeboard((previous) => {
        const next = new Map(previous);
        next.delete(name);
        return next;
      });
    });
  }

  /** "Add" from the "Cards that might help" list — same as toggleLock, just with the section/quantity the suggestion already carries instead of guessing. */
  function addSuggestion(card: SuggestedCard) {
    toggleLock(card.cardName, card.quantity, card.section);
  }

  function dismissReview(...cardNames: string[]) {
    setDismissedReviewCards((previous) => {
      const next = new Set(previous);
      for (const name of cardNames) next.add(name);
      return next;
    });
  }

  function applyRecommendationSwap(removal: SuggestedCard, addition: SuggestedCard) {
    pendingActionRef.current = { label: `Swapped ${removal.cardName} for ${addition.cardName}`, subject: null };
    startTransition(() => {
      setLockedCards((previous) => {
        const next = new Map(previous);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.quantity);
        return next;
      });
      setLockedSections((previous) => {
        const next = new Map(previous);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.section);
        return next;
      });
      setRejectedCards((previous) => new Set(previous).add(removal.cardName));
      setDismissedReviewCards((previous) => {
        const next = new Set(previous);
        next.add(removal.cardName);
        next.add(addition.cardName);
        return next;
      });
    });
  }

  /** Re-ranking the suggested build by switching data source or tuning bias is itself a
   * suggestion-changing action, same as locking/excluding a card — logged the same way so the
   * change log reflects what actually moved instead of only crediting direct card clicks. Guarded
   * on an actual value change so clicking the already-selected tab/pillar doesn't leave a stale
   * pendingActionRef for the next real change to pick up. */
  function changePopulationSource(source: PopulationSource, label: string) {
    if (source !== populationSource) pendingActionRef.current = { label: `Switched to ${label} data`, subject: null };
    setPopulationSource(source);
  }

  function changePillarBias(pillar: RatingPillar | null) {
    if (pillar !== pillarBias) {
      pendingActionRef.current = {
        label: pillar === null ? "Reset tuning to Balanced" : `Tuned toward ${pillar[0].toUpperCase()}${pillar.slice(1)}`,
        subject: null,
      };
    }
    setPillarBias(pillar);
  }

  function changeArchetype(archetype: string | null) {
    if (archetype !== archetypeId) {
      const selected = archetypeOptions.find((option) => option.id === archetype);
      pendingActionRef.current = {
        label: selected ? `Inspired by ${selected.name}` : "Removed archetype inspiration",
        subject: null,
      };
    }
    startTransition(() => setArchetypeId(archetype));
  }

  function changeChampionLevelCap(cap: number | null) {
    if (cap !== championLevelCap) {
      pendingActionRef.current = { label: cap === null ? "Restored automatic Champion progression" : `Set Champion progression through Level ${cap}`, subject: null };
    }
    startTransition(() => setChampionLevelCap(cap));
  }

  const mainTotal = build.main.reduce((sum, c) => sum + c.quantity, 0);
  const materialTotal = build.material.reduce((sum, c) => sum + c.quantity, 0);
  const sideboardTotal = build.sideboard.reduce((sum, c) => sum + c.quantity, 0);
  const selectedAddCard = cardNameSet.has(cardInput) && !lockedCards.has(cardInput)
    ? catalogByName.get(cardInput)
    : undefined;
  const selectedAddQuantity = selectedAddCard?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? 1 : 4;
  const currentSideboardPoints = build.sideboard.reduce(
    (sum, card) => sum + card.quantity * sideboardPointCost(catalogByName.get(card.cardName)),
    0,
  );
  const selectedSideboardPoints = selectedAddCard ? selectedAddQuantity * sideboardPointCost(selectedAddCard) : 0;
  const canAddToSideboard = Boolean(selectedAddCard) && currentSideboardPoints + selectedSideboardPoints <= SIDEBOARD_POINT_BUDGET;
  const sideboardDestinationSelected = addDestination === "sideboard" && canAddToSideboard;
  // Deck price/Stats stay scoped to material+main — same "sideboard is situational tech, not part
  // of deck identity" convention as everywhere else in this codebase (Popular Decks, Archetypes,
  // etc.); sideboard gets its own separate price line below instead, matching DecklistView.tsx.
  const buildLines = useMemo(
    () => [...build.material, ...build.main].map((c) => ({ name: c.cardName, quantity: c.quantity })),
    [build.material, build.main],
  );
  const mainOnlyLines = useMemo(() => build.main.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.main]);
  const materialOnlyLines = useMemo(() => build.material.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.material]);
  const sideboardLines = useMemo(() => build.sideboard.map((c) => ({ name: c.cardName, quantity: c.quantity })), [build.sideboard]);

  // Lifted out of StatsPanel (rather than computed only when that tab is active) so a tab-label
  // badge can reflect these findings even while the user is looking at the Build tab — otherwise
  // discovery-worthy signals (a card decaying out of the meta, a new-set combo, an under-supported
  // package) stay invisible behind a tab most users never click.
  const preferredSuggestionNames = useMemo(() => build.suggestions.map((card) => card.cardName), [build.suggestions]);
  const synergyReadiness = useMemo(
    () => computeSynergyReadiness(mainOnlyLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestionNames),
    [mainOnlyLines, catalogByName, identityElements, preferredSuggestionNames],
  );
  const dependencyReadiness = useMemo(
    () => computeDependencyReadiness(mainOnlyLines, catalogByName, catalogByName.values(), identityElements, preferredSuggestionNames),
    [mainOnlyLines, catalogByName, identityElements, preferredSuggestionNames],
  );
  const newReleaseCards = useMemo(() => {
    const includedNames = new Set(buildLines.map((line) => line.name));
    const deckCards = buildLines.map((line) => catalogByName.get(line.name)).filter((c): c is Card => c !== undefined);
    return computeNewReleaseCards(catalogByName.values(), deckCards, identityElements, includedNames);
  }, [buildLines, catalogByName, identityElements]);
  const statsSignalCount = buildLines.length === 0 ? 0 :
    (decayReport?.signals.length ?? 0) + newReleaseCards.length +
    synergyReadiness.filter((s) => s.recommendations.length > 0).length +
    dependencyReadiness.filter((d) => d.recommendations.length > 0).length;

  const decklist: OmnidexDecklist = useMemo(() => buildToDecklist(build), [build]);
  const keptDecklist: OmnidexDecklist = useMemo(() => buildToDecklist(build, true), [build]);
  /** Link to `/compare` seeding the current in-progress build (as a `?custom=` deck) alongside one
   * real deck (as a `?add=eventId:player`, reusing `NearestDeck.deckId`'s existing format) — lets the
   * viewer see exactly where their build overlaps/diverges from a real result, not just the
   * similarity percentage `useNearestDecks` already scores it with. */
  function nearestDeckCompareLink(d: NearestDeck): string {
    const label = `${championName ?? "My build"}${spiritFilter ? ` (${spiritFilter})` : ""}`;
    const params = new URLSearchParams();
    params.set("add", d.deckId);
    params.set("custom", encodeCustomDecks([{ label, decklist, format: deckFormat }]));
    return `/compare?${params.toString()}`;
  }
  const validation = useMemo(
    () => validateDeck({ main: build.main, material: build.material, sideboard: build.sideboard }, catalogByName, identityElements, deckFormat),
    [build.main, build.material, build.sideboard, catalogByName, identityElements, deckFormat],
  );
  const deckIdentity = useMemo(() => computeDeckIdentity(buildLines, cardsByName), [buildLines, cardsByName]);
  const rating = useMemo(
    () => computeDeckRating(buildLines, cardsByName, championName, deckIdentity.classes),
    [buildLines, cardsByName, championName, deckIdentity.classes],
  );
  function resetBuilder(): void {
    // Clear the persisted snapshot as well as component state. This matters when the user resets
    // and immediately navigates away before React's autosave effect gets a chance to run.
    clearBuilderSession(sessionStorage);
    pendingActionRef.current = null;
    prevSuggestedRef.current = null;
    prevWinRateRef.current = null;
    skipNextResetRef.current = false;
    lastResetChampionRef.current = null;
    startTransition(() => {
      setChampionName(null);
      setSpiritFilter(null);
      setSpiritElement(null);
      setLockedCards(new Map());
      setLockedSections(new Map());
      setRejectedCards(new Set());
      setCardInput("");
      setAddDestination("automatic");
      setMaybeboard(new Map());
      setPillarBias(null);
      setArchetypeId(null);
      setPopulationSource("balanced");
      setChangeLog([]);
      setDismissedReviewCards(new Set());
      setShowProtectedCuts(false);
      setPasteOpen(false);
      setPasteText("");
      setPasteError(null);
    });
  }
  // Buying/exporting covers the whole deck including sideboard tech, same as DecklistView.tsx.
  const totalPrice = useMemo(() => calculateLinePrice(buildLines, priceByName), [buildLines, priceByName]);
  const sideboardPrice = useMemo(() => calculateLinePrice(sideboardLines, priceByName), [sideboardLines, priceByName]);
  const importedCardCount = Array.from(lockedCards.values()).reduce((sum, quantity) => sum + quantity, 0);
  const identityComplete = Boolean(championName && spiritFilter);
  const startingCardsComplete = isImproving ? importedCardCount > 0 : builderIntent === "seed" ? lockedCards.size > 0 : identityComplete;
  const buildComplete = identityComplete && mainTotal > 0;
  const reviewComplete = buildComplete && reviewItemCount === 0;
  const validationComplete = validation.status === "Legal";
  function focusBuilderStep(id: string, destination?: BuilderTab) {
    if (destination) setTab(destination);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const copyPanel = useBuilderCopyState({
    build, buildLines, sideboardLines, decklist, keptDecklist, cardsByName, championName, spiritFilter,
    archetypeId, deckFormat, lockedCards, lockedSections, improveDeckId, maybeboard,
  });

  return (
    <PageLayout>
      <PageHeader
        title={isImproving ? "Improve your deck" : "Guided Deck Builder"}
        description={(
          isImproving
            ? <>Your saved list is the baseline. Review evidence-backed changes, keep only the ones you want, then save a new version when you are ready.</>
            : <>Start from a Champion, an Element, and a Spirit to generate a suggested deck from real decklists. You can also paste a list to tune cards you already have.</>
        )}
      />

      <nav className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3" aria-label="Guided deck-building steps">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Your deck-building path</p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-5">
          {[
            { label: "Identity", summary: identityComplete ? `${championName} · ${spiritFilter}` : "Choose Champion and Spirit", complete: identityComplete, id: "deck-builder-identity" },
            { label: "Starting cards", summary: startingCardsComplete ? (isImproving ? `${importedCardCount} baseline cards` : builderIntent === "seed" ? `${lockedCards.size} cards locked` : "Fresh suggested shell") : "Choose your starting point", complete: startingCardsComplete, id: "deck-builder-starting" },
            { label: "Build", summary: buildComplete ? `${mainTotal} main cards` : "Shape your deck", complete: buildComplete, id: "deck-builder-panel-build", tab: "build" as BuilderTab },
            { label: "Review", summary: reviewComplete ? "Changes reviewed" : reviewItemCount > 0 ? `${reviewItemCount} changes to review` : "Review recommendations", complete: reviewComplete, id: "deck-builder-panel-review", tab: "review" as BuilderTab },
            { label: "Validate & save", summary: validationComplete ? "Ready to save" : validation.status, complete: validationComplete, id: "deck-builder-panel-copy", tab: "copy" as BuilderTab },
          ].map((step, index) => (
            <li key={step.label}>
              <button type="button" onClick={() => focusBuilderStep(step.id, step.tab)} className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${step.tab === tab ? "bg-ctp-blue/10" : "hover:bg-ctp-surface0"}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step.complete ? "bg-ctp-green text-ctp-base" : step.tab === tab ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext0"}`}>{step.complete ? "✓" : index + 1}</span>
                <span className="min-w-0"><span className="block text-xs font-semibold text-ctp-text">{step.label}</span><span className="mt-0.5 block truncate text-[10px] text-ctp-subtext0">{step.summary}</span></span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {!isImproving && !identityComplete && <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="builder-start">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="builder-start" className="font-semibold text-ctp-text">What do you want to do?</h2>
            <p className="mt-1 text-sm text-ctp-subtext1">Pick a starting point. You can change direction without losing your current build.</p>
          </div>
          <Link to="/my-decks" className="text-sm text-ctp-blue hover:underline">Improve a saved deck →</Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link to="/card-discovery" className="rounded-lg border border-ctp-surface1 bg-ctp-base p-3 text-left transition-colors hover:border-ctp-blue/60">
            <span className="text-sm font-semibold text-ctp-text">Find new cards</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">Explore new-release cards that connect to a Champion, Spirit, or cards you already play.</span>
          </Link>
          {BUILDER_INTENTS.map((intent) => <button
            key={intent.key}
            type="button"
            onClick={() => chooseIntent(intent.key)}
            aria-pressed={builderIntent === intent.key}
            className={`rounded-lg border p-3 text-left transition-colors ${builderIntent === intent.key ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base hover:border-ctp-blue/60"}`}
          >
            <span className={`text-sm font-semibold ${builderIntent === intent.key ? "text-ctp-blue" : "text-ctp-text"}`}>{intent.title}</span>
            <span className="mt-1 block text-xs leading-5 text-ctp-subtext1">{intent.description}</span>
          </button>)}
        </div>
        {builderIntent === "seed" && <p className="mt-3 rounded-md border border-ctp-green/40 bg-ctp-green/10 px-3 py-2 text-xs text-ctp-subtext1">Choose your Champion and Spirit, then add the cards you already want to play. They stay locked while recommendations fill the remaining slots.</p>}
        {builderIntent === "scratch" && <p className="mt-3 rounded-md border border-ctp-blue/40 bg-ctp-blue/10 px-3 py-2 text-xs text-ctp-subtext1">Choose a Champion, Element, and Spirit to generate an evidence-backed shell. Use the Review tab to decide which changes to keep.</p>}
      </section>}

      {isImproving && <ImprovementReviewPanel importedCardCount={importedCardCount} reviewItemCount={reviewItemCount} onReview={() => setTab("review")} />}

      {!identityComplete && <div id="deck-builder-starting" className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm" role="group" aria-label="Deck format">
        {(["STANDARD", "PANTHEON"] as const).map((format) => <button key={format} type="button" aria-pressed={deckFormat === format} onClick={() => { setDeckFormat(format); if (format === "PANTHEON") setPopulationSource("community"); const next = new URLSearchParams(searchParams); if (format === "PANTHEON") next.set("format", "pantheon"); else next.delete("format"); setSearchParams(next, { replace: true }); }} className={`rounded-md px-3 py-1.5 ${deckFormat === format ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{format === "PANTHEON" ? "Pantheon" : "Standard"}</button>)}
      </div>}
      {!identityComplete && deckFormat === "PANTHEON" && <p className="mt-2 text-xs text-ctp-subtext0">Pantheon recommendations use format-separated community adoption and singleton legality. They do not use Standard tournament win rates.</p>}

      <div id="deck-builder-identity" className={isImproving ? "mt-4" : "mt-4 flex flex-wrap items-center gap-2 text-sm"}>
        {isImproving && championName && <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm">
            <span className="text-ctp-subtext0">Reviewing:</span>
            <span className="font-medium text-ctp-text">{championName}</span>
            <span className="text-ctp-subtext0">·</span>
            <span className={spiritFilter ? "text-ctp-green" : "text-ctp-yellow"}>{spiritFilter ?? "Spirit required"}</span>
            <button type="button" onClick={() => setIdentityEditorOpen((open) => !open)} className="ml-auto text-xs text-ctp-blue hover:underline">
              {identityEditorOpen ? "Done changing identity" : "Change identity"}
            </button>
          </div>
          {identityEditorOpen && <p className="mt-2 text-xs text-ctp-yellow">Changing Champion clears the imported baseline. Changing Spirit keeps the baseline but changes the recommendation lens.</p>}
        </>}
        {(!isImproving || identityEditorOpen) && <>
        <label htmlFor="deck-builder-champion" className="text-ctp-subtext0">Champion:</label>
        <select
          id="deck-builder-champion"
          value={championName ?? ""}
          onChange={(e) => setChampionName(e.target.value || null)}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">Choose a Champion…</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {championName && (!isImproving || identityEditorOpen) && (
          <>
            <label htmlFor="deck-builder-element" className="ml-2 text-ctp-subtext0">Element:</label>
            <select
              id="deck-builder-element"
              value={spiritElement ?? liveCatalogByName.get(spiritFilter ?? "")?.elements.find((element) => element !== "NORM") ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setSpiritElement(value);
                if (spiritFilter && value && !liveCatalogByName.get(spiritFilter)?.elements.includes(value)) setSpiritFilter(null);
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose an element…</option>
              {spiritElements.map((element) => <option key={element} value={element}>{element}</option>)}
            </select>
            {(spiritElement || spiritFilter) && <>
            <label htmlFor="deck-builder-spirit" className="ml-2 text-ctp-subtext0">Spirit:</label>
            <select
              id="deck-builder-spirit"
              value={spiritFilter ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                pendingActionRef.current = { label: `Set Spirit to ${value ?? "Any Spirit"}`, subject: null };
                startTransition(() => setSpiritFilter(value));
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">Choose a Spirit…</option>
              {spiritsForElement.map((name) => (
                <option key={name} value={name}>
                  {spiritOptionLabel(name)}
                </option>
              ))}
            </select>
            </>}
          </>
        )}
        </>}
        {championName && (
          <button
            type="button"
            onClick={resetBuilder}
            className="ml-1 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red"
          >
            Reset builder
          </button>
        )}
      </div>
      {!isImproving && <div className="mt-2">
        {!pasteOpen ? (
          <button type="button" onClick={() => setPasteOpen(true)} className="text-xs text-ctp-blue hover:underline">
            Or paste a decklist for recommendations &rarr;
          </button>
        ) : (
          <div className="mt-1 max-w-sm">
            <p className="text-xs text-ctp-subtext0">
              Paste a decklist — one card per line, e.g. "4x Card Name", with optional "Main"/"Material" section
              headers. The Champion (and Spirit, if run) are detected automatically and everything else locks in as
              your starting point for recommendations.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Main\n4x Dungeon Guide\n...\n\nMaterial\n1x Spirit of Water"}
              rows={6}
              className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {deckFormat === "STANDARD" && <button
                type="button"
                onClick={loadPastedDecklist}
                disabled={pasteText.trim().length === 0}
                className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load decklist
              </button>}
              <button
                type="button"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteText("");
                  setPasteError(null);
                }}
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
              >
                Cancel
              </button>
            </div>
            {pasteError && <p className="mt-1.5 text-xs text-ctp-red">{pasteError}</p>}
          </div>
        )}
      </div>}

      {builderIntent === "seed" && (!championName || !spiritFilter || gateLoading || !gateHasData || lockedCards.size === 0) && <section className="mt-5 rounded-lg border border-ctp-green/40 bg-ctp-green/5 p-3" aria-labelledby="seed-cards">
        <h2 id="seed-cards" className="text-sm font-semibold text-ctp-text">Start with your cards</h2>
        <p className="mt-1 text-xs text-ctp-subtext1">Add one or more cards, then choose the Champion and Spirit that should support them. Your selected cards stay locked as the deck fills in.</p>
        <div className="mt-3 flex max-w-xl flex-wrap gap-2">
          <input
            type="text"
            list="deck-builder-card-options"
            value={cardInput}
            onChange={(event) => setCardInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput); }}
            placeholder="Type a card name…"
            className="min-w-52 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <button type="button" disabled={!cardNameSet.has(cardInput) || lockedCards.has(cardInput)} onClick={() => addCard(cardInput)} className="rounded-md border border-ctp-green/60 px-3 py-1.5 text-sm text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-50">Add card</button>
        </div>
        <datalist id="deck-builder-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
        {lockedCards.size > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{Array.from(lockedCards.keys()).map((name) => <button key={name} type="button" onClick={() => removeCard(name, true)} className="rounded-full border border-ctp-green/40 px-2 py-0.5 text-xs text-ctp-green hover:border-ctp-red hover:text-ctp-red" title="Remove seed card">{name} ×</button>)}</div>}
      </section>}

      {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>}

      {builderIntent === "seed" && championName && spiritFilter && lockedCards.size === 0 && !gateLoading && gateHasData && <p className="mt-6 rounded-lg border border-ctp-green/40 bg-ctp-green/5 px-4 py-3 text-sm text-ctp-subtext1">Add at least one card you want to build around. We’ll use it with {championName} and {spiritFilter} to shape the suggested deck.</p>}

      {championName && gateLoading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {championName && !gateLoading && !gateHasData && (
        <p className="mt-6 text-ctp-subtext1">
          No decks found for {championName}.
        </p>
      )}

      {championName && !gateLoading && gateHasData && !spiritFilter && (
        <p className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
          Select an element and Spirit above to generate a coherent core. The builder will keep unsupported slots unresolved
          instead of mixing this Champion's different strategies.
        </p>
      )}

      {championName && spiritFilter && !gateLoading && gateHasData && (builderIntent !== "seed" || lockedCards.size > 0) && (
        <>
          {effectivePopulationSource === "simulator" && <div className="mt-2 rounded-lg border border-ctp-mauve/50 bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-subtext1">
            <span className="font-semibold text-ctp-mauve">Experimental:</span>{" "}
            Clarent currently reports {simulatorSummary?.games ?? 0} game{simulatorSummary?.games === 1 ? "" : "s"} and {simulatorResult.matchedCards} catalog-resolved card sample{simulatorResult.matchedCards === 1 ? "" : "s"}. Simulator telemetry does not contain complete Champion-scoped decklists, so community construction supplies the legal shell; qualifying simulator rows only change card priority. No simulator evidence means the shell stays unchanged.
          </div>}

          {isPending && <p role="status" className="mt-1 text-xs text-ctp-subtext0">Recalculating suggestions…</p>}
          {rejectedCards.size > 0 && <p className="mt-1 text-xs text-ctp-subtext0">{rejectedCards.size} card{rejectedCards.size === 1 ? "" : "s"} excluded · <button type="button" onClick={() => { pendingActionRef.current = { label: "Reset excluded cards", subject: null }; startTransition(() => setRejectedCards(new Set())); }} className="hover:text-ctp-blue hover:underline">reset</button></p>}
          {build.usedSpiritElementFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Too few {championName} decks run {spiritFilter} specifically — suggestions also draw on other{" "}
              {championName} decks with a same-element Spirit ({build.spiritElementFallbackSpirits.join(", ")}).
            </p>
          )}
          {build.usedFallback && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Not enough decks have every card you've chosen — remaining suggestions are based on the broader{" "}
              {spiritFilter ?? "any Spirit"} {championName} population instead.
            </p>
          )}
          {build.matchingDeckCount > 0 && build.matchingDeckCount < 10 && (
            <p className="mt-1 text-xs text-ctp-yellow">
              Insufficient sample for a stable summary (n={build.matchingDeckCount}). Treat this as a statistical shell;
              the observed rate and card ordering may be highly sensitive to a few decks.
            </p>
          )}

          <section className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" aria-labelledby="deck-builder-checklist">
            <h2 id="deck-builder-checklist" className="text-sm font-semibold text-ctp-text">Deck-building checklist</h2>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
              {isImproving && <p className={importedCardCount > 0 ? "text-ctp-green" : "text-ctp-yellow"}>{importedCardCount > 0 ? `✓ ${importedCardCount} baseline cards loaded` : "○ Imported deck is empty"}</p>}
              <p className={championName ? "text-ctp-green" : "text-ctp-subtext1"}>{championName ? "✓ Champion selected" : "○ Choose a Champion"}</p>
              <p className={spiritFilter ? "text-ctp-green" : "text-ctp-subtext1"}>{spiritFilter ? "✓ Spirit selected" : "○ Choose an element and Spirit"}</p>
              <p className={validation.status === "Legal" ? "text-ctp-green" : "text-ctp-yellow"}>{validation.status === "Legal" ? "✓ Construction checks pass" : `○ ${validation.status}: review deck size and legality`}</p>
            </div>
          </section>

          <div className="mt-4">
            <Tabs<BuilderTab>
              tabs={[
                { key: "build", label: "Build" },
                { key: "review", label: reviewItemCount > 0 ? `Review & decide (${reviewItemCount})` : "Review & decide" },
                { key: "stats", label: statsSignalCount > 0 ? `Stats (${statsSignalCount})` : "Stats" },
                { key: "tools", label: "Advanced" },
                { key: "buddies", label: "Buddy Cards" },
                { key: "copy", label: "Validate & save" },
                { key: "log", label: `Log (${changeLog.length})` },
              ]}
              active={tab}
              onChange={setTab}
              label="Deck builder sections"
              baseId="deck-builder"
            />
          </div>

          {newReleaseCards.length > 0 && (
            <div className="mt-4">
              <NotificationBanner
                tone="highlight"
                title="New cards available"
                description={`${newReleaseCards.length} new card${newReleaseCards.length === 1 ? "" : "s"} from recent sets`}
                action={{ label: "Explore new cards", to: "/card-discovery" }}
              />
            </div>
          )}
          {reviewItemCount > 0 && tab !== "review" && (
            <div className="mt-4">
              <NotificationBanner
                tone="warning"
                title={`${reviewItemCount} recommendation${reviewItemCount === 1 ? "" : "s"} ready`}
                description="Review suggested additions, cuts, and section-compatible swaps."
                action={{ label: "Review recommendations", onClick: () => setTab("review") }}
              />
            </div>
          )}
          {tab === "build" && (
            <BuilderBuildPanel
              builderIntent={builderIntent}
              cardInput={cardInput}
              onCardInputChange={setCardInput}
              addDestination={addDestination}
              onAddDestinationChange={setAddDestination}
              cardNameSet={cardNameSet}
              cardNames={cardNames}
              onAddCard={addCard}
              canAddToSideboard={canAddToSideboard}
              selectedSideboardPoints={selectedSideboardPoints}
              currentSideboardPoints={currentSideboardPoints}
              sideboardDestinationSelected={sideboardDestinationSelected}
              customizeOpen={customizeOpen}
              onToggleCustomizeOpen={() => setCustomizeOpen((v) => !v)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              visibleFields={visibleFields}
              onVisibleFieldChange={setVisibleField}
              pillarBias={pillarBias}
              effectivePopulationSource={effectivePopulationSource}
              onJumpToTools={() => setTab("tools")}
              build={build}
              isPending={isPending}
              materialTotal={materialTotal}
              mainTotal={mainTotal}
              sideboardTotal={sideboardTotal}
              cardsByName={cardsByName}
              catalogByName={catalogByName}
              priceByName={priceByName}
              priceTrendByName={priceTrendByName}
              communityInclusionByName={communityInclusionByName}
              hypeGapByName={hypeGapByName}
              decaySignalByName={decaySignalByName}
              simulatorEvidenceByName={simulatorResult.evidenceByName}
              reviewRemovalNames={reviewRemovalNames}
              onToggleLock={toggleLock}
              onChangeQuantity={setLockedQuantity}
              onRemoveCard={removeCard}
              maybeboard={maybeboard}
              onMaybeQuantityChange={setMaybeQuantity}
              lockedCards={lockedCards}
              onPromoteMaybeCard={promoteMaybeCard}
              onRemoveMaybeCard={removeMaybeCard}
            />
          )}

          {tab === "review" && (
            <BuilderReviewPanel
              build={build}
              effectivePopulationSource={effectivePopulationSource}
              simulatorMatchedCards={simulatorResult.matchedCards}
              simulatorEvidenceByName={simulatorResult.evidenceByName}
              lockedCards={lockedCards}
              mainTotal={mainTotal}
              totalPrice={totalPrice}
              sideboardPrice={sideboardPrice}
              dismissedReviewCards={dismissedReviewCards}
              onRestoreDismissed={() => setDismissedReviewCards(new Set())}
              showProtectedCuts={showProtectedCuts}
              onToggleShowProtectedCuts={() => setShowProtectedCuts((shown) => !shown)}
              reviewItemCount={reviewItemCount}
              reviewGroups={reviewGroups}
              cardsByName={cardsByName}
              priceByName={priceByName}
              visibleFields={visibleFields}
              communityInclusionByName={communityInclusionByName}
              onApplySwap={applyRecommendationSwap}
              onDismissReview={dismissReview}
              onAddSuggestion={addSuggestion}
              onRemoveCard={removeCard}
              showNearestDecks={showNearestDecks}
              nearestDecks={nearestDecks}
              nearestDeckCompareLink={nearestDeckCompareLink}
              onLoadNearestDeck={loadNearestDeck}
              buildCounters={buildCounters}
              hurtYouCards={hurtYouCards}
              hurtYouCardImages={hurtYouCardImages}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onBackToBuild={() => setTab("build")}
              onContinueToValidation={() => setTab("copy")}
              reviewComplete={reviewComplete}
            />
          )}

          {tab === "stats" && (
            <div role="tabpanel" id="deck-builder-panel-stats" aria-labelledby="deck-builder-tab-stats">
              <StatsPanel
                lines={buildLines}
                mainLines={mainOnlyLines}
                cardsByName={cardsByName}
                catalogByName={catalogByName}
                synergyReadiness={synergyReadiness}
                dependencyReadiness={dependencyReadiness}
                newReleaseCards={newReleaseCards}
                compositionWinRateData={compositionWinRateData}
                onAddCard={addCard}
                decayReport={decayReport}
              />
            </div>
          )}

          <TabPanel baseId="deck-builder" tab="tools" active={tab}>
              <ToolsPanel
                rating={rating}
                mainLines={mainOnlyLines}
                materialLines={materialOnlyLines}
                catalogByName={catalogByName}
                pillarBias={pillarBias}
                onPillarBiasChange={changePillarBias}
                archetypeId={archetypeId}
                archetypeOptions={archetypeOptions}
                onArchetypeChange={changeArchetype}
                championLevelCap={championLevelCap}
                onChampionLevelCapChange={changeChampionLevelCap}
                validation={validation}
                unresolvedMain={build.unresolved.main}
                deckFormat={deckFormat}
                populationSource={effectivePopulationSource}
                onChangePopulationSource={changePopulationSource}
                collectionMode={collectionMode}
                onCollectionModeChange={(mode) => startTransition(() => setCollectionMode(mode))}
              />
          </TabPanel>

          <TabPanel baseId="deck-builder" tab="buddies" active={tab}>
              <BuddyCardsList
                lockedNames={Array.from(lockedCards.keys())}
                buddyCards={buddyCards}
                communityBuddyCards={communityBuddyCards}
                cardsByName={cardsByName}
                onAdd={addCard}
              />
          </TabPanel>

          {tab === "copy" && (
            <BuilderCopyPanel
              validation={validation}
              validationComplete={validationComplete}
              reviewComplete={reviewComplete}
              onReviewFirst={() => setTab("review")}
              improveDeckId={improveDeckId}
              championName={championName}
              saveNote={copyPanel.saveNote}
              onSaveNoteChange={copyPanel.setSaveNote}
              saveTitle={copyPanel.saveTitle}
              onSaveTitleChange={copyPanel.setSaveTitle}
              saveCopyCount={copyPanel.saveCopyCount}
              saveState={copyPanel.saveState}
              onSave={() => void copyPanel.handleSaveToMyDecks()}
              savedDeckId={copyPanel.savedDeckId}
              saveKeptOnly={copyPanel.saveKeptOnly}
              onSaveKeptOnlyChange={copyPanel.setSaveKeptOnly}
              keptCopyCount={copyPanel.keptCopyCount}
              decklist={decklist}
              catalogByName={catalogByName}
              onCopy={(keptOnly) => void copyPanel.handleCopy(keptOnly)}
              copyState={copyPanel.copyState}
              fullCopyCount={copyPanel.fullCopyCount}
              onCopyAndOpen={(url) => void copyPanel.handleCopyAndOpen(url)}
              massEntryUrl={copyPanel.massEntryUrl}
              clarentUrl={copyPanel.clarentUrl}
              onExportTts={copyPanel.handleExportTts}
              onCopyShareLink={() => void copyPanel.handleCopyShareLink()}
              shareCopyState={copyPanel.shareCopyState}
            />
          )}

          <TabPanel baseId="deck-builder" tab="log" active={tab}>
            <BuilderChangeLog entries={changeLog} />
          </TabPanel>

          <details className="mt-8 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext0">
            <summary className="cursor-pointer font-medium hover:text-ctp-text">Data &amp; methodology</summary>
            <div className="mt-2 space-y-2">
              <DecklistCoverageNotice />
              <StaleDataNotice generatedAt={[popularityIndexData?.generatedAt, effectivePopulationSource === "simulator" ? simulatorSummary?.generatedAt : undefined]} />
              <p>{effectivePopulationSource === "simulator" ? "Simulator ordering is an experimental overlay on a community-built legal shell. Telemetry is anonymous, sample-gated, and not Champion-scoped." : "Suggestions are correlations from public tournament decklists, not causal or predictive claims."}</p>
              {build.hasQuantityOptimizations && <p>Starred quantities use global copy-count evidence only when at least 30 decks support a meaningful difference; each affected card shows its source and sample.</p>}
              <p>Validation does not cover {validation.unsupportedRules.join("; ")}.</p>
            </div>
          </details>
        </>
      )}
    </PageLayout>
  );
}
