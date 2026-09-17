import { useEffect, useMemo, useState, useTransition } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { useTabParam } from "../../lib/useTabParam";
import { useCardFieldVisibility } from "./useCardFieldVisibility";
import { useBuilderViewMode } from "./useBuilderViewMode";
import { SIDEBOARD_POINT_BUDGET, sideboardPointCost, validateDeck } from "./validateDeck";
import { computeNewReleaseCards } from "./newReleaseCards";
import { buildToDecklist } from "./engine/builderSelectors";
import { useBuilderWorkflowState } from "./controller/useBuilderWorkflowState";
import { useBuilderSessionPersistence } from "./controller/useBuilderSessionPersistence";
import { useBuilderCopyState } from "./controller/useBuilderCopyState";
import { loadBuilderSessionSeed, parseBuilderUrlSeed } from "./persistence/builderSeed";
import { useBuilderWorkspacePersistence } from "./controller/useBuilderWorkspacePersistence";
import { useBuilderRecommendationModel } from "./controller/useBuilderRecommendationModel";
import { useBuilderChangeTracking } from "./controller/useBuilderChangeTracking";
import { useBuilderCardActions } from "./controller/useBuilderCardActions";
import { useBuilderLifecycle } from "./controller/useBuilderLifecycle";

export type BuilderTab = BuilderWorkbenchView;
export type BuilderIntent = "seed" | "scratch";
import type { BuilderWorkbenchView } from "./components/BuilderWorkbenchNav";

const TAB_KEYS: BuilderTab[] = ["build", "tools", "copy", "log"];

export function useDeckBuilderController() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyTab = searchParams.get("tab");
  useEffect(() => {
    if (legacyTab === "review") navigate("/deck-review", { replace: true });
    if (legacyTab === "test") navigate("/deck-analysis?tab=matchups", { replace: true });
    if (legacyTab === "stats" || legacyTab === "buddies") navigate("/deck-analysis", { replace: true });
  }, [legacyTab, navigate]);
  const improveDeckId = searchParams.get("improveDeck");
  const isImproving = Boolean(improveDeckId);
  const intentParam = searchParams.get("intent");
  const builderIntent: BuilderIntent | null = intentParam === "seed" || intentParam === "scratch" ? intentParam : null;
  const [deckFormat, setDeckFormat] = useState<DeckFormat>(() => searchParams.get("format")?.toUpperCase() === "PANTHEON" ? "PANTHEON" : "STANDARD");
  // Computed fresh each render (cheap — parsing a couple of query params), but only its value on
  // the very first render actually matters: every useState below that reads from it only consults
  // its initializer once, on mount, same as React already guarantees for lazy useState.
  const urlSeed = parseBuilderUrlSeed(searchParams);
  // An explicit shared link always wins over a leftover session — someone opening a shared link
  // wants *that* state, not whatever this tab happened to have saved from before. Only consulted
  // once (mount), same as urlSeed itself — see loadSessionSeed's own doc comment for why a lazy
  // initializer, not an effect, is what avoids the reset-then-reseed race parseUrlSeed warns about.
  const sessionSeed = urlSeed ? null : loadBuilderSessionSeed(sessionStorage);

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
    setChampionName, setSpiritFilter, setRejectedCards, setPopulationSource,
    setCollectionMode, setChangeLog,
  } = workflow;
  useBuilderSessionPersistence(deckFormat, workflow.state);
  const [spiritElement, setSpiritElement] = useState<string | null>(null);
  const [cardInput, setCardInput] = useState("");
  const [addDestination, setAddDestination] = useState<"automatic" | "sideboard" | "maybeboard">("automatic");
  const [visibleFields, setVisibleField] = useCardFieldVisibility();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [viewMode, setViewMode] = useBuilderViewMode();
  const [tab, setTab] = useTabParam<BuilderTab>("tab", TAB_KEYS, "build");
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function chooseIntent(intent: BuilderIntent) {
    const next = new URLSearchParams(searchParams);
    next.set("intent", intent);
    next.set("tab", "build");
    setSearchParams(next, { replace: true });
  }

  const {
    popularityIndexData, liveCatalogByName, cardCatalog, catalogByName, spiritCanonicalNames,
    simulatorSummary, priceByName, priceTrendByName, seedLockedCards, communityInclusionByName,
    hypeGapByName, decaySignalByName, build, reviewItemCount, reviewRemovalNames, gateLoading,
    gateHasData, spiritElements, spiritsForElement, spiritOptionLabel, championsPresent, cardNames,
    cardNameSet, cardsByName, identityElements, effectivePopulationSource, simulatorResult,
    archetypeOptions, setDismissedReviewCards,
  } = useBuilderRecommendationModel({
    championName, spiritFilter, setSpiritFilter, deckFormat, tab, lockedCards, lockedSections,
    rejectedCards, pillarBias, archetypeId, championLevelCap, populationSource, collectionMode,
    maybeboard, spiritElement,
  });
  const { pendingActionRef, resetChangeTracking } = useBuilderChangeTracking(build, setChangeLog);
  const {
    toggleLock, chooseChampionLineagePrint, restoreSuggestedChampionLevel, setLockedQuantity,
    removeCard, addCard, removeMaybeCard, setMaybeQuantity, promoteMaybeCard,
    changePopulationSource, changePillarBias, changeArchetype, changeChampionLevelCap,
  } = useBuilderCardActions({
    workflow, build, catalogByName, cardCatalog, cardNameSet, archetypeOptions, addDestination,
    setAddDestination, setCardInput, startTransition, pendingActionRef,
  });
  const {
    pasteOpen, setPasteOpen, pasteText, setPasteText, pasteError, setPasteError,
    loadPastedDecklist, resetBuilder,
  } = useBuilderLifecycle({
    workflow, builderIntent, improveDeckId,
    initialChampionName: urlSeed?.championName ?? sessionSeed?.championName ?? null,
    catalogByName, spiritCanonicalNames, setDismissedReviewCards, setSpiritElement,
    setCardInput, setAddDestination, setTab, startTransition, resetChangeTracking,
  });
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
  useBuilderWorkspacePersistence({ championName, spiritName: spiritFilter, format: deckFormat, main: mainOnlyLines, material: materialOnlyLines, sideboard: sideboardLines, maybeboard });

  const newReleaseCards = useMemo(() => {
    const includedNames = new Set(buildLines.map((line) => line.name));
    const deckCards = buildLines.map((line) => catalogByName.get(line.name)).filter((c): c is Card => c !== undefined);
    return computeNewReleaseCards(catalogByName.values(), deckCards, identityElements, includedNames);
  }, [buildLines, catalogByName, identityElements]);
  const decklist: OmnidexDecklist = useMemo(() => buildToDecklist(build), [build]);
  const keptDecklist: OmnidexDecklist = useMemo(() => buildToDecklist(build, true), [build]);
  const validation = useMemo(
    () => validateDeck({ main: build.main, material: build.material, sideboard: build.sideboard }, catalogByName, identityElements, deckFormat),
    [build.main, build.material, build.sideboard, catalogByName, identityElements, deckFormat],
  );
  const importedCardCount = Array.from(lockedCards.values()).reduce((sum, quantity) => sum + quantity, 0);
  const identityComplete = Boolean(championName && spiritFilter);
  const buildComplete = identityComplete && mainTotal > 0;
  const reviewComplete = buildComplete && reviewItemCount === 0;
  const validationComplete = validation.status === "Legal";
  const copyPanel = useBuilderCopyState({
    build, buildLines, sideboardLines, decklist, keptDecklist, cardsByName, championName, spiritFilter,
    archetypeId, deckFormat, lockedCards, lockedSections, improveDeckId, maybeboard,
  });


  return {
    searchParams,
    setSearchParams,
    isImproving,
    builderIntent,
    deckFormat,
    setDeckFormat,
    chooseIntent,
    championName,
    setChampionName,
    spiritFilter,
    setSpiritFilter,
    lockedCards,
    maybeboard,
    rejectedCards,
    setRejectedCards,
    pillarBias,
    archetypeId,
    championLevelCap,
    setPopulationSource,
    collectionMode,
    setCollectionMode,
    changeLog,
    spiritElement,
    setSpiritElement,
    cardInput,
    setCardInput,
    addDestination,
    setAddDestination,
    visibleFields,
    setVisibleField,
    customizeOpen,
    setCustomizeOpen,
    viewMode,
    setViewMode,
    tab,
    setTab,
    identityEditorOpen,
    setIdentityEditorOpen,
    isPending,
    startTransition,
    pasteOpen,
    setPasteOpen,
    pasteText,
    setPasteText,
    pasteError,
    setPasteError,
    pendingActionRef,
    popularityIndexData,
    liveCatalogByName,
    catalogByName,
    simulatorSummary,
    priceByName,
    priceTrendByName,
    improveDeckId,
    seedLockedCards,
    communityInclusionByName,
    hypeGapByName,
    decaySignalByName,
    build,
    reviewItemCount,
    reviewRemovalNames,
    gateLoading,
    gateHasData,
    spiritElements,
    spiritsForElement,
    spiritOptionLabel,
    championsPresent,
    cardNames,
    cardNameSet,
    cardsByName,
    loadPastedDecklist,
    toggleLock,
    chooseChampionLineagePrint,
    restoreSuggestedChampionLevel,
    setLockedQuantity,
    removeCard,
    addCard,
    removeMaybeCard,
    setMaybeQuantity,
    promoteMaybeCard,
    changePopulationSource,
    changePillarBias,
    changeArchetype,
    changeChampionLevelCap,
    mainTotal,
    materialTotal,
    sideboardTotal,
    selectedSideboardPoints,
    currentSideboardPoints,
    canAddToSideboard,
    sideboardDestinationSelected,
    newReleaseCards,
    decklist,
    validation,
    resetBuilder,
    importedCardCount,
    identityComplete,
    reviewComplete,
    validationComplete,
    copyPanel,
    effectivePopulationSource,
    simulatorResult,
    archetypeOptions,
  };
}
