import { useEffect, useMemo, useState, useTransition } from "react";
import type { Card } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Tabs from "../../components/ui/Tabs";
import { InlineState } from "../../components/ui/ContentState";
import { computeIdentityElements, findChampionCard, useSuggestedBuild, type SuggestedCard } from "../deckbuilder/useSuggestedBuild";
import { useDeckBuilderData } from "../deckbuilder/data/useDeckBuilderData";
import { useBuilderWorkflowState } from "../deckbuilder/controller/useBuilderWorkflowState";
import { useBuilderSessionPersistence } from "../deckbuilder/controller/useBuilderSessionPersistence";
import { useBuilderCopyState } from "../deckbuilder/controller/useBuilderCopyState";
import { useCardFieldVisibility } from "../deckbuilder/useCardFieldVisibility";
import { useBuilderViewMode } from "../deckbuilder/useBuilderViewMode";
import { validateDeck } from "../deckbuilder/validateDeck";
import { computeCardDecay } from "../../lib/cardDecay";
import { championSlugsFor, mergeCardInclusionBuckets } from "../community/data";
import { buildToDecklist, calculateLinePrice, derivePendingSuggestions, deriveReviewGroups } from "../deckbuilder/engine/builderSelectors";
import { DECK_REVIEW_SESSION_KEY, loadBuilderSession } from "../deckbuilder/persistence/builderPersistence";
import { loadActiveDeckWorkspace, saveActiveDeckWorkspace, type DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import DeckWorkspacePicker from "../deckbuilder/components/DeckWorkspacePicker";
import DeckToolWorkspaceHeader from "../deckbuilder/components/DeckToolWorkspaceHeader";
import { selectionsToMaps, type LockedSection } from "../deckbuilder/model/builderTypes";
import { formatUsd } from "../../lib/format";
import type { BuildCounters } from "../deckbuilder/useBuildCounters";
import type { NearestDeck } from "../deckbuilder/useNearestDecks";
import BuilderReviewPanel from "../deckbuilder/panels/BuilderReviewPanel";
import BuilderCopyPanel from "../deckbuilder/panels/BuilderCopyPanel";
import BuilderCardGrid from "../deckbuilder/components/BuilderCardGrid";
import SideboardImpact from "../deckbuilder/SideboardImpact";
import { useDeckTestResult } from "../decks/useDeckTestResult";
import { useRequestedDeckWorkspace } from "../deckbuilder/persistence/useRequestedDeckWorkspace";

type DeckReviewTab = "review" | "matchups" | "save";
type ReviewPopulationSource = "tournament" | "balanced";

const EMPTY_BUILD_COUNTERS: BuildCounters = {
  sourceDeck: null,
  clusterMatchups: [],
  opponentClusterId: null,
  setOpponentClusterId: () => undefined,
  selectedMatchup: undefined,
};

/** Same shape/functions as the full Guided Deck Builder's own session restore — just its own storage key, so the two tools' in-progress work never collide. */
function loadSessionSeed() {
  const workspace = loadActiveDeckWorkspace(sessionStorage);
  if (workspace?.championName && (workspace.main.length > 0 || workspace.material.length > 0)) {
    const selections = [
      ...workspace.main.map((line) => ({ ...line, section: "main" as const })),
      ...workspace.material.map((line) => ({ ...line, section: "material" as const })),
      ...workspace.sideboard.map((line) => ({ ...line, section: "sideboard" as const })),
    ];
    return {
      championName: workspace.championName,
      spiritFilter: workspace.spiritName,
      lockedCards: new Map(selections.map((line) => [line.name, line.quantity])),
      lockedSections: new Map(selections.map((line) => [line.name, line.section])),
      rejectedCards: new Set<string>(),
      populationSource: "balanced" as ReviewPopulationSource,
      format: workspace.format,
    };
  }
  const session = loadBuilderSession(sessionStorage, "STANDARD", DECK_REVIEW_SESSION_KEY);
  if (!session?.selection.championName) return null;
  const locked = selectionsToMaps(session.selection.lockedCards);
  return {
    championName: session.selection.championName,
    spiritFilter: session.selection.spiritName,
    lockedCards: locked.cards,
    lockedSections: locked.sections,
    rejectedCards: new Set(session.selection.rejectedCards),
    populationSource: (session.selection.populationSource === "tournament" ? "tournament" : "balanced") as ReviewPopulationSource,
    format: "STANDARD" as const,
  };
}

/**
 * A deliberately smaller sibling to the Guided Deck Builder: nothing is ever auto-committed here.
 * Picking a Champion+Spirit (or pasting a decklist) never fills a single slot on its own — every
 * card, including the Champion print and Spirit themselves, shows up as an ordinary ranked
 * suggestion the viewer explicitly accepts. This works by *not* treating the engine's auto-filled
 * Main/Material/Sideboard as "the deck": only `lockedCards` (the viewer's own accepted picks) is —
 * see `derivePendingSuggestions`'s doc comment for how the same `SuggestedBuild` output that drives
 * the full builder's auto-fill gets reinterpreted here as one big suggestion feed instead.
 */
export default function DeckReviewIndex() {
  useDocumentTitle(
    "Deck Review",
    "Start from a Champion and Spirit, or your own decklist, then accept or reject one ranked suggestion at a time — nothing is ever added automatically.",
  );

  const sessionSeed = useMemo(() => loadSessionSeed(), []);
  const workflow = useBuilderWorkflowState({
    championName: sessionSeed?.championName ?? null,
    spiritFilter: sessionSeed?.spiritFilter ?? null,
    lockedCards: sessionSeed?.lockedCards ?? new Map(),
    maybeboard: new Map(),
    lockedSections: sessionSeed?.lockedSections ?? new Map(),
    rejectedCards: sessionSeed?.rejectedCards ?? new Set(),
    pillarBias: null,
    archetypeId: null,
    championLevelCap: null,
    populationSource: sessionSeed?.populationSource ?? "balanced",
    collectionMode: "all",
    changeLog: [],
  });
  const { championName, spiritFilter, lockedCards, lockedSections, rejectedCards, populationSource } = workflow.state;
  const { setChampionName, setSpiritFilter, setLockedCards, setLockedSections, setRejectedCards, setPopulationSource } = workflow;
  const [deckFormat, setDeckFormat] = useState(sessionSeed?.format ?? "STANDARD");
  useBuilderSessionPersistence(deckFormat, workflow.state, DECK_REVIEW_SESSION_KEY);
  useEffect(() => {
    if (!championName || lockedCards.size === 0) return;
    const lines = Array.from(lockedCards, ([name, quantity]) => ({ name, quantity, section: lockedSections.get(name) ?? "main" }));
    saveActiveDeckWorkspace(sessionStorage, {
      source: "review",
      title: loadActiveDeckWorkspace(sessionStorage)?.title ?? null,
      sourceLabel: loadActiveDeckWorkspace(sessionStorage)?.sourceLabel ?? "Deck Review",
      format: deckFormat,
      championName,
      spiritName: spiritFilter,
      main: lines.filter((line) => line.section === "main").map(({ name, quantity }) => ({ name, quantity })),
      material: lines.filter((line) => line.section === "material").map(({ name, quantity }) => ({ name, quantity })),
      sideboard: lines.filter((line) => line.section === "sideboard").map(({ name, quantity }) => ({ name, quantity })),
      maybeboard: [],
    });
  }, [championName, spiritFilter, lockedCards, lockedSections, deckFormat]);

  const [tab, setTab] = useState<DeckReviewTab>("review");
  const [deckSummaryOpen, setDeckSummaryOpen] = useState(true);
  const [spiritElement, setSpiritElement] = useState<string | null>(null);
  const [dismissedReviewCards, setDismissedReviewCards] = useState<Set<string>>(new Set());
  const [showProtectedCuts, setShowProtectedCuts] = useState(false);
  // Card art is the point of this page — default to the visual grid instead of the Guided Deck
  // Builder's own list default, via a separate storage key so this doesn't touch that preference.
  const [viewMode, setViewMode] = useBuilderViewMode("deck-review-view-mode-v1", "grid");
  const [visibleFields] = useCardFieldVisibility();
  const [isPending, startTransition] = useTransition();

  const builderData = useDeckBuilderData({ championName, format: deckFormat, includeDecodedDecks: false });
  const {
    catalogByName, liveCatalogByName, priceByName, popularityIndex: popularityIndexData,
    population: { rows, spiritsPresent, loading: populationLoading },
    cardQuantityStats: cardQuantityStatsData, communityInclusion: communityCardInclusion,
  } = builderData;

  const championsPresent = useMemo(() => {
    if (!popularityIndexData) return [];
    return Array.from(new Set(popularityIndexData.entries.map((s) => s.championName).filter((n): n is string => n !== null))).sort();
  }, [popularityIndexData]);

  const spiritStats = useMemo(() => {
    const stats = new Map<string, { decks: number }>();
    for (const spirit of spiritsPresent) stats.set(spirit, { decks: rows.filter((row) => row.spiritName === spirit).length });
    return stats;
  }, [rows, spiritsPresent]);
  const sortedSpirits = useMemo(
    () => [...spiritsPresent].sort((a, b) => (spiritStats.get(b)?.decks ?? 0) - (spiritStats.get(a)?.decks ?? 0) || a.localeCompare(b)),
    [spiritsPresent, spiritStats],
  );
  const spiritElements = useMemo(
    () => Array.from(new Set(sortedSpirits.flatMap((name) => liveCatalogByName.get(name)?.elements ?? []))).filter((element) => element !== "NORM").sort(),
    [sortedSpirits, liveCatalogByName],
  );
  const spiritsForElement = useMemo(
    () => (spiritElement ? sortedSpirits.filter((name) => liveCatalogByName.get(name)?.elements.includes(spiritElement)) : sortedSpirits),
    [spiritElement, sortedSpirits, liveCatalogByName],
  );
  function spiritOptionLabel(name: string): string {
    const stats = spiritStats.get(name);
    return stats ? `${name} — ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"}` : name;
  }

  const championCard = useMemo(() => findChampionCard(rows, lockedCards, catalogByName), [rows, lockedCards, catalogByName]);
  const spiritCardForIdentity = spiritFilter ? catalogByName.get(spiritFilter) : undefined;
  const identityElements = useMemo(() => computeIdentityElements(championCard, spiritCardForIdentity), [championCard, spiritCardForIdentity]);

  // "Balanced" mirrors the full builder's own community-popularity + meta-decay nudge (see
  // COMMUNITY_BOOST_WEIGHT/DECAY_PENALTY_WEIGHT in useSuggestedBuild.ts) so the toggle is a genuine
  // second ranking, not a relabeled duplicate of Tournament.
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
  const decayReport = useMemo(() => computeCardDecay(rows, spiritFilter, catalogByName), [rows, spiritFilter, catalogByName]);
  const decayingCardBoost = useMemo(
    () => (decayReport ? new Map(decayReport.signals.map((s) => [s.cardName, s.decay])) : undefined),
    [decayReport],
  );

  const tournamentBuild = useSuggestedBuild(rows, spiritFilter, lockedCards, rejectedCards, populationLoading, lockedSections, cardQuantityStatsData, championCard);
  const balancedBuild = useSuggestedBuild(
    rows, spiritFilter, lockedCards, rejectedCards, populationLoading, lockedSections, cardQuantityStatsData, championCard,
    null, communityInclusionByName, decayingCardBoost,
  );
  const build = populationSource === "tournament" ? tournamentBuild : balancedBuild;

  const reviewSuggestions = useMemo(
    () => derivePendingSuggestions(build).filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build, dismissedReviewCards],
  );
  const reviewRemovals = useMemo(
    () => [...build.removalSuggestions, ...(showProtectedCuts ? build.protectedRemovalSuggestions : [])].filter((card) => !dismissedReviewCards.has(card.cardName)),
    [build, dismissedReviewCards, showProtectedCuts],
  );
  const reviewGroups = useMemo(() => deriveReviewGroups(reviewRemovals, reviewSuggestions), [reviewRemovals, reviewSuggestions]);
  const reviewItemCount = reviewGroups.pairs.length + reviewGroups.unpairedRemovals.length + reviewGroups.unpairedSuggestions.length;
  const reviewComplete = reviewItemCount === 0;

  // "Your deck so far" — deliberately the ONLY thing ever called "the deck" on this page. The
  // engine's own `build.main`/`.material`/`.sideboard` also contain every unlocked auto-fill pick
  // (that's what feeds the suggestion grid above), so filtering to `.locked` here is what keeps
  // this page honest: nothing the viewer hasn't explicitly accepted ever shows up as "in the deck."
  const keptMain = useMemo(() => build.main.filter((c) => c.locked), [build.main]);
  const keptMaterial = useMemo(() => build.material.filter((c) => c.locked), [build.material]);
  const keptSideboard = useMemo(() => build.sideboard.filter((c) => c.locked), [build.sideboard]);
  const keptCount = keptMain.length + keptMaterial.length + keptSideboard.length;

  const keptDecklist = useMemo(() => buildToDecklist(build, true), [build]);
  const keptLines = useMemo(() => [...keptDecklist.material, ...keptDecklist.main].map((l) => ({ name: l.card, quantity: l.quantity })), [keptDecklist]);
  const keptSideboardLines = useMemo(() => keptDecklist.sideboard.map((l) => ({ name: l.card, quantity: l.quantity })), [keptDecklist]);
  const keptMainLines = useMemo(() => keptDecklist.main.map((line) => ({ name: line.card, quantity: line.quantity })), [keptDecklist]);
  const deckTestCounts = useMemo(() => new Map(keptLines.map((line) => [line.name, line.quantity])), [keptLines]);
  const { result: deckTestResult } = useDeckTestResult({ deckCardCounts: deckTestCounts, cardsByName: catalogByName, nearestDecks: [] });
  const mainTotal = useMemo(() => keptMain.reduce((sum, c) => sum + c.quantity, 0), [keptMain]);
  const materialTotal = useMemo(() => keptMaterial.reduce((sum, c) => sum + c.quantity, 0), [keptMaterial]);
  const sideboardTotal = useMemo(() => keptSideboard.reduce((sum, c) => sum + c.quantity, 0), [keptSideboard]);
  const totalPrice = useMemo(() => calculateLinePrice(keptLines, priceByName), [keptLines, priceByName]);
  const sideboardPrice = useMemo(() => calculateLinePrice(keptSideboardLines, priceByName), [keptSideboardLines, priceByName]);
  const validation = useMemo(
    () => validateDeck({ main: keptMain, material: keptMaterial, sideboard: keptSideboard }, catalogByName, identityElements, deckFormat),
    [keptMain, keptMaterial, keptSideboard, catalogByName, identityElements, deckFormat],
  );

  const copyState = useBuilderCopyState({
    build, buildLines: keptLines, sideboardLines: keptSideboardLines, decklist: keptDecklist, keptDecklist,
    cardsByName: catalogByName, championName, spiritFilter, archetypeId: null, deckFormat,
    lockedCards, lockedSections, improveDeckId: null, maybeboard: new Map(),
  });

  function toggleLock(name: string, quantity: number, section?: LockedSection) {
    const willLock = !lockedCards.has(name);
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

  /** Locked (accepted) cards are dropped from the deck entirely; an unlocked (still-just-a-suggestion) card is instead excluded so a different one takes its place. Removing a Champion print also drops any higher locked level of the same identity, same cascade the full builder uses. */
  function removeCard(name: string, locked: boolean) {
    if (!locked) {
      setRejectedCards((prev) => new Set(prev).add(name));
      return;
    }
    startTransition(() => {
      const removed = catalogByName.get(name);
      const cascadeIdentity = removed?.types.includes("CHAMPION") && !removed.subtypes.includes("SPIRIT") && removed.level != null
        ? { identity: removed.name.split(",")[0].trim(), level: removed.level }
        : null;
      const shouldCascade = (candidateName: string) => {
        if (!cascadeIdentity) return false;
        const candidate = catalogByName.get(candidateName);
        return Boolean(candidate?.types.includes("CHAMPION") && !candidate.subtypes.includes("SPIRIT") && candidate.level != null
          && candidate.level > cascadeIdentity.level && candidate.name.split(",")[0].trim() === cascadeIdentity.identity);
      };
      setLockedCards((prev) => {
        const next = new Map(prev);
        for (const lockedName of prev.keys()) if (shouldCascade(lockedName)) next.delete(lockedName);
        next.delete(name);
        return next;
      });
      setLockedSections((prev) => {
        const next = new Map(prev);
        for (const lockedName of prev.keys()) if (shouldCascade(lockedName)) next.delete(lockedName);
        next.delete(name);
        return next;
      });
    });
  }

  function applyRecommendationSwap(removal: SuggestedCard, addition: SuggestedCard) {
    startTransition(() => {
      setLockedCards((prev) => {
        const next = new Map(prev);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.quantity);
        return next;
      });
      setLockedSections((prev) => {
        const next = new Map(prev);
        next.delete(removal.cardName);
        next.set(addition.cardName, addition.section);
        return next;
      });
      setRejectedCards((prev) => new Set(prev).add(removal.cardName));
      setDismissedReviewCards((prev) => new Set(prev).add(removal.cardName).add(addition.cardName));
    });
  }

  function dismissReview(...cardNames: string[]) {
    setDismissedReviewCards((prev) => {
      const next = new Set(prev);
      for (const name of cardNames) next.add(name);
      return next;
    });
  }

  function loadWorkspace(workspace: Omit<DeckWorkspace, "version" | "updatedAt">) {
    const selections = [
      ...workspace.main.map((line) => ({ ...line, section: "main" as const })),
      ...workspace.material.map((line) => ({ ...line, section: "material" as const })),
      ...workspace.sideboard.map((line) => ({ ...line, section: "sideboard" as const })),
    ];
    saveActiveDeckWorkspace(sessionStorage, workspace);
    startTransition(() => {
      setDeckFormat(workspace.format);
      setChampionName(workspace.championName);
      setSpiritFilter(workspace.spiritName);
      setLockedCards(new Map(selections.map((line) => [line.name, line.quantity])));
      setLockedSections(new Map(selections.map((line) => [line.name, line.section])));
      setRejectedCards(new Set());
      setDismissedReviewCards(new Set());
      setTab("review");
    });
  }

  function startOver() {
    startTransition(() => {
      setChampionName(null);
      setSpiritFilter(null);
      setSpiritElement(null);
      setLockedCards(new Map());
      setLockedSections(new Map());
      setRejectedCards(new Set());
      setDismissedReviewCards(new Set());
    });
  }

  const requestedDeck = useRequestedDeckWorkspace(catalogByName, "review", loadWorkspace);

  if (requestedDeck.pending) return <PageLayout data-component="DeckReviewIndex"><PageHeader title="Deck Review" description="Loading the selected deck without changing its saved copy." /><Panel className="mt-6"><InlineState>Loading deck…</InlineState></Panel></PageLayout>;
  if (requestedDeck.error) return <PageLayout data-component="DeckReviewIndex"><PageHeader title="Deck Review" description="The selected deck could not be opened." /><Panel className="mt-6"><InlineState tone="danger">{requestedDeck.error}</InlineState><button type="button" onClick={requestedDeck.retry} className="mt-4 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">Try again</button></Panel></PageLayout>;

  const nearestDeckCompareLink = (_deck: NearestDeck) => "/compare";
  const activeWorkspace = loadActiveDeckWorkspace(sessionStorage);

  return (
    <PageLayout data-component="DeckReviewIndex">
      <PageHeader
        title="Deck Review"
        description="Nothing is added for you here. Start from a Champion and Spirit — or paste a decklist you already have — then accept, swap, or dismiss one ranked suggestion at a time."
      />

      {championName && <DeckToolWorkspaceHeader activeTool="review" title={activeWorkspace?.title} championName={championName} spiritName={spiritFilter} format={deckFormat} mainTotal={mainTotal} materialTotal={materialTotal} sideboardTotal={sideboardTotal} sourceLabel={activeWorkspace?.sourceLabel} actions={<DeckWorkspacePicker compact catalogByName={catalogByName} source="review" onLoad={loadWorkspace} />} />}

      <Panel className="mt-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="deck-review-champion" className="text-ctp-subtext0">Champion:</label>
          <select
            id="deck-review-champion"
            value={championName ?? ""}
            onChange={(e) => { setChampionName(e.target.value || null); setSpiritFilter(null); setSpiritElement(null); }}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            <option value="">Choose a Champion…</option>
            {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          {championName && (
            <>
              <label htmlFor="deck-review-element" className="ml-2 text-ctp-subtext0">Element:</label>
              <select
                id="deck-review-element"
                value={spiritElement ?? liveCatalogByName.get(spiritFilter ?? "")?.elements.find((e) => e !== "NORM") ?? ""}
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
              {(spiritElement || spiritFilter) && (
                <>
                  <label htmlFor="deck-review-spirit" className="ml-2 text-ctp-subtext0">Spirit:</label>
                  <select
                    id="deck-review-spirit"
                    value={spiritFilter ?? ""}
                    onChange={(e) => startTransition(() => setSpiritFilter(e.target.value || null))}
                    className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                  >
                    <option value="">Choose a Spirit…</option>
                    {spiritsForElement.map((name) => <option key={name} value={name}>{spiritOptionLabel(name)}</option>)}
                  </select>
                </>
              )}
            </>
          )}
          {championName && (
            <button type="button" onClick={startOver} className="ml-1 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red">
              Start over
            </button>
          )}
        </div>

        {!championName && <div className="mt-3"><DeckWorkspacePicker catalogByName={catalogByName} source="review" onLoad={loadWorkspace} /></div>}

        {championName && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ctp-surface1 pt-3 text-xs">
            <span className="text-ctp-subtext0">Evidence source:</span>
            {(["balanced", "tournament"] as const).map((source) => (
              <button
                key={source}
                type="button"
                aria-pressed={populationSource === source}
                onClick={() => setPopulationSource(source)}
                className={`rounded px-2 py-1 font-medium transition-colors duration-200 ${populationSource === source ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}
              >
                {source === "balanced" ? "Balanced" : "Tournament"}
              </button>
            ))}
            {isPending && <span className="text-ctp-subtext0">Recalculating suggestions…</span>}
          </div>
        )}
      </Panel>

      {!championName ? (
        <InlineState className="mt-6">Choose a Champion above (or paste a decklist) to see ranked suggestions.</InlineState>
      ) : (
        <div className="mt-4">
          <details open={deckSummaryOpen} onToggle={(event) => setDeckSummaryOpen(event.currentTarget.open)} className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue">
              <span className="flex items-center gap-2 text-sm font-semibold text-ctp-text"><span aria-hidden="true" className="inline-block text-ctp-subtext0 transition-transform group-open:rotate-90">›</span>Your deck so far</span>
              <span className="text-xs text-ctp-subtext0">
                {keptCount === 0
                  ? "Nothing accepted yet"
                  : `${mainTotal} main · ${materialTotal} material${sideboardTotal > 0 ? ` · ${sideboardTotal} sideboard` : ""} · ${formatUsd(totalPrice.sum + sideboardPrice.sum)}`}
              </span>
            </summary>
            <div className="border-t border-ctp-surface1 p-4">{keptCount === 0 ? (
              <InlineState className="mt-2 text-sm">Nothing here yet — accept a suggestion below to start building.</InlineState>
            ) : (
              <div className="mt-2 space-y-4">
                {keptMaterial.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Material ({materialTotal})</h3>
                    <BuilderCardGrid section="material" cards={keptMaterial} cardsByName={catalogByName} priceByName={priceByName} visibleFields={visibleFields} onToggleLock={toggleLock} onChangeQuantity={setLockedQuantity} onRemove={removeCard} />
                  </div>
                )}
                {keptMain.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Main ({mainTotal})</h3>
                    <BuilderCardGrid section="main" cards={keptMain} cardsByName={catalogByName} priceByName={priceByName} visibleFields={visibleFields} onToggleLock={toggleLock} onChangeQuantity={setLockedQuantity} onRemove={removeCard} />
                  </div>
                )}
                {keptSideboard.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Sideboard ({sideboardTotal})</h3>
                    <BuilderCardGrid section="sideboard" cards={keptSideboard} cardsByName={catalogByName} priceByName={priceByName} visibleFields={visibleFields} onToggleLock={toggleLock} onChangeQuantity={setLockedQuantity} onRemove={removeCard} />
                  </div>
                )}
              </div>
            )}</div>
          </details>

          <div className="mt-4">
            <Tabs
              tabs={[
                { key: "review", label: reviewItemCount > 0 ? `Suggestions (${reviewItemCount})` : "Suggestions" },
                { key: "matchups", label: "Matchup plans" },
                { key: "save", label: "Save & export" },
              ]}
              active={tab}
              onChange={setTab}
              label="Deck Review sections"
              baseId="deck-review"
            />
          </div>

          {tab === "review" && (
            <BuilderReviewPanel
              build={build}
              effectivePopulationSource={populationSource}
              simulatorMatchedCards={0}
              simulatorEvidenceByName={new Map()}
              lockedCards={lockedCards}
              mainTotal={mainTotal}
              totalPrice={totalPrice}
              sideboardPrice={sideboardPrice}
              dismissedReviewCards={dismissedReviewCards}
              onRestoreDismissed={() => setDismissedReviewCards(new Set())}
              showProtectedCuts={showProtectedCuts}
              onToggleShowProtectedCuts={() => setShowProtectedCuts((v) => !v)}
              reviewItemCount={reviewItemCount}
              reviewGroups={reviewGroups}
              cardsByName={catalogByName}
              priceByName={priceByName}
              visibleFields={visibleFields}
              communityInclusionByName={communityInclusionByName}
              onApplySwap={applyRecommendationSwap}
              onDismissReview={dismissReview}
              onAddSuggestion={(card) => toggleLock(card.cardName, card.quantity, card.section)}
              onRemoveCard={removeCard}
              showNearestDecks={false}
              nearestDecks={[]}
              nearestDeckCompareLink={nearestDeckCompareLink}
              onLoadNearestDeck={() => undefined}
              onContinueToValidation={() => setTab("save")}
              reviewComplete={reviewComplete}
              buildCounters={EMPTY_BUILD_COUNTERS}
              hurtYouCards={[]}
              hurtYouCardImages={new Map<string, Card>()}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}

          {tab === "matchups" && (
            keptSideboardLines.length > 0
              ? <SideboardImpact mainLines={keptMainLines} sideboardLines={keptSideboardLines} catalogByName={catalogByName} matchups={deckTestResult?.matchups} />
              : <Panel className="mt-4"><InlineState>Add or accept Sideboard cards before building a matchup plan.</InlineState></Panel>
          )}

          {tab === "save" && (
            <BuilderCopyPanel
              validation={validation}
              validationComplete={validation.status === "Legal"}
              reviewComplete={reviewComplete}
              improveDeckId={null}
              championName={championName}
              saveNote={copyState.saveNote}
              onSaveNoteChange={copyState.setSaveNote}
              saveTitle={copyState.saveTitle}
              onSaveTitleChange={copyState.setSaveTitle}
              saveCopyCount={copyState.saveCopyCount}
              saveState={copyState.saveState}
              onSave={copyState.handleSaveToMyDecks}
              savedDeckId={copyState.savedDeckId}
              saveKeptOnly={false}
              onSaveKeptOnlyChange={() => undefined}
              keptCopyCount={copyState.keptCopyCount}
              decklist={keptDecklist}
              catalogByName={catalogByName}
              onCopy={copyState.handleCopy}
              copyState={copyState.copyState}
              fullCopyCount={copyState.keptCopyCount}
              onCopyAndOpen={copyState.handleCopyAndOpen}
              massEntryUrl={copyState.massEntryUrl}
              clarentUrl={copyState.clarentUrl}
              onExportTts={copyState.handleExportTts}
              onCopyShareLink={copyState.handleCopyShareLink}
              shareCopyState={copyState.shareCopyState}
              hideFullDeckOption
            />
          )}
        </div>
      )}
    </PageLayout>
  );
}
