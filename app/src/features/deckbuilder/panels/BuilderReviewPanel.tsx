import { useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactEntry, CardInclusionEntry } from "@gatcg/shared";
import CardHoverPreview from "../../../components/CardHoverPreview";
import CardImpactTable from "../../../components/CardImpactTable";
import ElementIcon from "../../../components/ElementIcon";
import Tabs from "../../../components/ui/Tabs";
import { formatUsd } from "../../../lib/format";
import { CardRow, SuggestionRow } from "../components/BuilderCardRows";
import { BuilderSuggestionGrid } from "../components/BuilderCardGrid";
import type { ReviewGroups } from "../engine/builderSelectors";
import type { SuggestedBuild, SuggestedCard } from "../useSuggestedBuild";
import type { NearestDeck } from "../useNearestDecks";
import type { BuildCounters } from "../useBuildCounters";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PopulationSource } from "../model/builderTypes";
import type { BuilderViewMode } from "../useBuilderViewMode";

type ReviewSubTab = "suggestions" | "matchups" | "similarDecks";

export default function BuilderReviewPanel({
  build, effectivePopulationSource, simulatorMatchedCards, simulatorEvidenceByName, lockedCards,
  mainTotal, totalPrice, sideboardPrice, dismissedReviewCards, onRestoreDismissed, showProtectedCuts,
  onToggleShowProtectedCuts, reviewItemCount, reviewGroups, cardsByName, priceByName, visibleFields,
  communityInclusionByName, onApplySwap, onDismissReview, onAddSuggestion, onRemoveCard,
  showNearestDecks, nearestDecks, nearestDeckCompareLink, onLoadNearestDeck, onBackToBuild,
  onContinueToValidation, reviewComplete, buildCounters, hurtYouCards, hurtYouCardImages,
  viewMode, onViewModeChange,
}: {
  build: SuggestedBuild;
  effectivePopulationSource: PopulationSource;
  simulatorMatchedCards: number;
  simulatorEvidenceByName: Map<string, SimulatorCardEvidence>;
  lockedCards: Map<string, number>;
  mainTotal: number;
  totalPrice: { sum: number; missing: number };
  sideboardPrice: { sum: number; missing: number };
  dismissedReviewCards: Set<string>;
  onRestoreDismissed: () => void;
  showProtectedCuts: boolean;
  onToggleShowProtectedCuts: () => void;
  reviewItemCount: number;
  reviewGroups: ReviewGroups;
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  visibleFields: CardFieldVisibility;
  communityInclusionByName: Map<string, CardInclusionEntry> | undefined;
  onApplySwap: (removal: SuggestedCard, addition: SuggestedCard) => void;
  onDismissReview: (...cardNames: string[]) => void;
  onAddSuggestion: (card: SuggestedCard) => void;
  onRemoveCard: (name: string, locked: boolean) => void;
  showNearestDecks: boolean;
  nearestDecks: NearestDeck[];
  nearestDeckCompareLink: (deck: NearestDeck) => string;
  onLoadNearestDeck: (deck: NearestDeck) => void;
  /** Omitted when there's no Build tab to return to (e.g. the suggestions-only Deck Review page) — hides the "Back to build" link instead of wiring it to a no-op. */
  onBackToBuild?: () => void;
  onContinueToValidation: () => void;
  reviewComplete: boolean;
  buildCounters: BuildCounters;
  hurtYouCards: CardImpactEntry[];
  hurtYouCardImages: Map<string, Card>;
  viewMode: BuilderViewMode;
  onViewModeChange: (mode: BuilderViewMode) => void;
}) {
  const simulatorMode = effectivePopulationSource === "simulator";
  const showMatchupsTab = buildCounters.sourceDeck !== null && buildCounters.clusterMatchups.length > 0;
  const subTabs: { key: ReviewSubTab; label: string }[] = [
    { key: "suggestions", label: reviewItemCount > 0 ? `Suggestions (${reviewItemCount})` : "Suggestions" },
    ...(showMatchupsTab ? [{ key: "matchups" as ReviewSubTab, label: "Matchups" }] : []),
    ...(showNearestDecks ? [{ key: "similarDecks" as ReviewSubTab, label: "Similar decks" }] : []),
  ];
  const [subTab, setSubTab] = useState<ReviewSubTab>("suggestions");
  const activeSubTab: ReviewSubTab = subTabs.some((t) => t.key === subTab) ? subTab : subTabs[0].key;
  return (
    <div data-component="BuilderReviewPanel" role="tabpanel" id="deck-builder-panel-review" aria-labelledby="deck-builder-tab-review" className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ctp-text">Review recommendations</h2>
          <p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">
            Suggestions are correlations from the selected evidence source. Swaps pair a card to review with the highest-ranked addition for the same deck section; they are starting points, not proof that one card directly replaces the other.
          </p>
        </div>
        {dismissedReviewCards.size > 0 && (
          <button type="button" onClick={onRestoreDismissed} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">
            Restore dismissed
          </button>
        )}
      </div>

      <div className="mt-4 grid overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle sm:grid-cols-4">
        <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Evidence</p>
          <p className="mt-0.5 text-sm font-semibold text-ctp-text">
            {build.matchingDeckCount} {simulatorMode
              ? `game${build.matchingDeckCount === 1 ? "" : "s"}`
              : `deck${build.matchingDeckCount === 1 ? "" : "s"}`}
          </p>
          <p className="text-[10px] text-ctp-subtext0">{simulatorMode ? `${simulatorMatchedCards} qualifying cards` : build.matchingDeckCount >= 30 ? "Strong sample" : build.matchingDeckCount >= 10 ? "Limited sample" : "Exploratory"}</p>
        </div>
        <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0" title="Win rate observed among matching decks — not guaranteed for this specific build.">Performance</p>
          <p className="mt-0.5 text-sm font-semibold text-ctp-text">{simulatorMode ? "Experimental" : build.conditionalWinRate === null ? "—" : `${(build.conditionalWinRate * 100).toFixed(0)}% observed`}</p>
          {build.baselineWinRate !== null && lockedCards.size > 0 && <p className="text-[10px] text-ctp-subtext0">{build.conditionalWinRate !== null && build.conditionalWinRate - build.baselineWinRate >= 0 ? "+" : ""}{build.conditionalWinRate === null ? "" : `${((build.conditionalWinRate - build.baselineWinRate) * 100).toFixed(1)}%`} vs. baseline</p>}
        </div>
        <div className="border-b border-ctp-surface1 px-3 py-2 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Completion</p>
          <p className="mt-0.5 text-sm font-semibold text-ctp-text">{mainTotal}/{mainTotal + build.unresolved.main} main</p>
          <p className="text-[10px] text-ctp-subtext0">{build.unresolved.main} flex slot{build.unresolved.main === 1 ? "" : "s"} open</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Cost</p>
          <p className="mt-0.5 text-sm font-semibold text-ctp-text">{formatUsd(totalPrice.sum)}</p>
          <p className="text-[10px] text-ctp-subtext0">{sideboardPrice.sum > 0 ? `+ ${formatUsd(sideboardPrice.sum)} sideboard` : totalPrice.missing > 0 ? `${totalPrice.missing} price${totalPrice.missing === 1 ? "" : "s"} missing` : "Main + material"}</p>
        </div>
      </div>

      {build.protectedPackages.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-teal/40 bg-ctp-teal/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ctp-teal">Protected packages</p>
          <ul className="mt-1 space-y-1.5">
            {build.protectedPackages.map((deckPackage) => (
              <li key={deckPackage.id} className="text-xs text-ctp-subtext1">
                <span className="font-medium text-ctp-text">{deckPackage.label}</span>
                {" — "}{deckPackage.explanation} Individual cuts are hidden for {deckPackage.protectedCards.join(", ")}.
              </li>
            ))}
          </ul>
          {build.protectedRemovalSuggestions.length > 0 && (
            <button
              type="button"
              onClick={onToggleShowProtectedCuts}
              className="mt-2 rounded-md border border-ctp-teal/50 px-2 py-1 text-xs text-ctp-teal hover:bg-ctp-teal/10"
              aria-pressed={showProtectedCuts}
            >
              {showProtectedCuts ? "Hide protected cuts" : `Review anyway (${build.protectedRemovalSuggestions.length})`}
            </button>
          )}
        </div>
      )}

      <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext1 hover:text-ctp-text">
          Package catalog ({build.packageCatalog.filter((entry) => entry.active).length}/{build.packageCatalog.length} active)
        </summary>
        <p className="mt-2 text-xs text-ctp-subtext0">
          Construction packages are explicit review guardrails and do not define the deck&apos;s archetype.
          {" "}<Link to="/cards/packages" className="text-ctp-blue hover:underline">Browse package definitions.</Link>
        </p>
        <ul className="mt-3 space-y-2">
          {build.packageCatalog.map((entry) => (
            <li key={entry.id} className="rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ctp-text">{entry.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${entry.active ? "bg-ctp-teal/15 text-ctp-teal" : "bg-ctp-surface0 text-ctp-subtext0"}`}>
                  {entry.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-ctp-subtext1"><span className="font-medium text-ctp-text">Activates:</span> {entry.activation}</p>
              <p className="mt-1 text-ctp-subtext0">{entry.explanation}</p>
              {entry.active && entry.protectedCards.length > 0 && (
                <p className="mt-1 text-ctp-teal"><span className="font-medium">Protecting:</span> {entry.protectedCards.join(", ")}</p>
              )}
              {entry.observedSupport && (
                <p className="mt-1 text-[10px] text-ctp-overlay1">
                  Observed in {entry.observedSupport.matchingDecks.toLocaleString()} of {entry.observedSupport.populationDecks.toLocaleString()} decks ({entry.observedSupport.auditLabel}).
                </p>
              )}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4">
        <Tabs tabs={subTabs} active={activeSubTab} onChange={setSubTab} label="Review sections" baseId="deck-builder-review" />
      </div>

      {activeSubTab === "suggestions" && (
      reviewItemCount === 0 ? (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
          {effectivePopulationSource === "community" || simulatorMode
            ? `No additions to review right now. Cut recommendations are unavailable in ${simulatorMode ? "Simulator" : "Community"} mode because this source cannot support Champion-scoped with-versus-without comparisons.`
            : "No recommendations to review right now. The current build already contains the ranked core, or the available evidence is too thin to support a change."}
        </div>
      ) : (
        <>
          {reviewGroups.pairs.length > 0 && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Suggested swaps</h3>
              <ul className="mt-2 space-y-2">
                {reviewGroups.pairs.map(({ removal, addition }) => {
                  const removalInfo = cardsByName.get(removal.cardName);
                  const additionInfo = cardsByName.get(addition.cardName);
                  return (
                    <li key={`${removal.cardName}:${addition.cardName}`} className="grid gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-ctp-red">Review</span>
                        <div className="flex items-center gap-1 truncate">
                          {removalInfo && removalInfo.element !== "NORM" && <ElementIcon element={removalInfo.element} size={14} />}
                          <CardHoverPreview image={removalInfo?.editions[0]?.image} alt={removal.cardName}>
                            {removalInfo ? <Link to={`/cards/${removalInfo.slug}`} className="truncate text-sm text-ctp-text hover:text-ctp-blue">{removal.cardName}</Link> : <span className="truncate text-sm text-ctp-text">{removal.cardName}</span>}
                          </CardHoverPreview>
                        </div>
                        <span className="text-xs text-ctp-subtext0">{removal.adjustedLift === null ? "Limited performance evidence" : `${(removal.adjustedLift * 100).toFixed(1)}% observed lift`}</span>
                        {removal.contextualReplacement && <span className="mt-0.5 block text-[10px] text-ctp-teal">Contextual swap · {removal.contextualReplacement.peerDecks} similar decks</span>}
                      </div>
                      <span className="hidden text-ctp-subtext0 sm:inline" aria-hidden="true">→</span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-ctp-green">Suggested addition</span>
                        <div className="flex items-center gap-1 truncate">
                          {additionInfo && additionInfo.element !== "NORM" && <ElementIcon element={additionInfo.element} size={14} />}
                          <CardHoverPreview image={additionInfo?.editions[0]?.image} alt={addition.cardName}>
                            {additionInfo ? <Link to={`/cards/${additionInfo.slug}`} className="truncate text-sm text-ctp-text hover:text-ctp-blue">{addition.cardName}</Link> : <span className="truncate text-sm text-ctp-text">{addition.cardName}</span>}
                          </CardHoverPreview>
                        </div>
                        <span className="text-xs text-ctp-subtext0">{addition.adjustedLift === null ? "Ranked candidate" : `+${(addition.adjustedLift * 100).toFixed(1)}% observed lift`} · {addition.quantity}x {addition.section}</span>
                        {addition.readinessReasons?.map((reason) => <span key={reason} className="ml-1 inline-block rounded-full border border-ctp-teal/50 bg-ctp-teal/10 px-1.5 text-[10px] font-medium text-ctp-teal">{reason}</span>)}
                      </div>
                      <div className="flex gap-1.5 sm:justify-end">
                        <button type="button" onClick={() => onApplySwap(removal, addition)} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-blue/10">Swap</button>
                        <button type="button" onClick={() => onDismissReview(removal.cardName, addition.cardName)} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {reviewGroups.unpairedSuggestions.length > 0 && (
              <section className={viewMode === "grid" ? "sm:col-span-2" : undefined}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Suggested additions</h3>
                  <div className="flex gap-1" role="group" aria-label="Suggested additions display">
                    {(["list", "grid"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onViewModeChange(mode)}
                        aria-pressed={viewMode === mode}
                        className={`rounded-md border px-2 py-1 text-xs capitalize ${
                          viewMode === mode ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-ctp-subtext0">Adding one keeps it as your choice and may grow the deck beyond its usual size.</p>
                {viewMode === "grid" ? (
                  <BuilderSuggestionGrid
                    cards={reviewGroups.unpairedSuggestions}
                    cardsByName={cardsByName}
                    priceByName={priceByName}
                    communityInclusion={communityInclusionByName}
                    simulatorEvidenceByName={simulatorMode ? simulatorEvidenceByName : undefined}
                    visibleFields={visibleFields}
                    onAdd={onAddSuggestion}
                    onDismiss={(cardName) => onDismissReview(cardName)}
                  />
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {reviewGroups.unpairedSuggestions.map((card) => (
                      <SuggestionRow
                        key={card.cardName}
                        card={card}
                        cardsByName={cardsByName}
                        priceByName={priceByName}
                        communityInclusion={communityInclusionByName}
                        simulatorEvidence={simulatorMode ? simulatorEvidenceByName.get(card.cardName) : undefined}
                        visibleFields={visibleFields}
                        onAdd={() => onAddSuggestion(card)}
                        onDismiss={() => onDismissReview(card.cardName)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
            {reviewGroups.unpairedRemovals.length > 0 && (
              <section className={viewMode === "grid" ? "sm:col-span-2" : undefined}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Cards to review</h3>
                <p className="mt-1 text-xs text-ctp-subtext0">These user choices have meaningfully negative independent evidence; that does not prove they are wrong for this build.</p>
                <ul className="mt-2 space-y-1.5">
                  {reviewGroups.unpairedRemovals.map((card) => (
                    <CardRow
                      key={card.cardName}
                      card={card}
                      cardsByName={cardsByName}
                      priceByName={priceByName}
                      communityInclusion={communityInclusionByName}
                      simulatorEvidence={simulatorMode ? simulatorEvidenceByName.get(card.cardName) : undefined}
                      visibleFields={visibleFields}
                      showLockToggle={false}
                      onToggleLock={() => {}}
                      onRemove={() => onRemoveCard(card.cardName, card.locked)}
                      onDismiss={() => onDismissReview(card.cardName)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )
      )}

      {activeSubTab === "matchups" && buildCounters.sourceDeck && buildCounters.clusterMatchups.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Counters against this build</h3>
          <p className="mt-1 text-xs text-ctp-subtext0">
            This build isn't a real decklist yet, so this is proxied off {buildCounters.sourceDeck.championName ?? "the"} deck
            {buildCounters.sourceDeck.spiritName ? ` (${buildCounters.sourceDeck.spiritName})` : ""} closest to your current picks
            ({(buildCounters.sourceDeck.similarity * 100).toFixed(0)}% similar), and it may not hold once you finish
            the build.{" "}
            <Link to="/methodology#classification" className="text-ctp-blue hover:underline">Learn more</Link>
          </p>
          {buildCounters.clusterMatchups.length > 1 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Matchup spread</p>
              <ul className="mt-1.5 space-y-1">
                {[...buildCounters.clusterMatchups].sort((a, b) => b.baselineWinRate - a.baselineWinRate).map((m) => {
                  const winRatePct = m.baselineWinRate * 100;
                  const isSelected = (buildCounters.opponentClusterId ?? buildCounters.clusterMatchups[0]?.opponentClusterId) === m.opponentClusterId;
                  return (
                    <li key={m.opponentClusterId}>
                      <button
                        type="button"
                        onClick={() => buildCounters.setOpponentClusterId(m.opponentClusterId)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-xs ${isSelected ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 hover:border-ctp-surface2"}`}
                      >
                        <span className="w-28 shrink-0 truncate text-ctp-text">{m.opponentClusterName}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ctp-surface1">
                          <span
                            className={`block h-full rounded-full ${winRatePct >= 50 ? "bg-ctp-green" : "bg-ctp-red"}`}
                            style={{ width: `${Math.min(100, Math.max(0, winRatePct))}%` }}
                          />
                        </span>
                        <span className={`w-10 shrink-0 text-right font-semibold ${winRatePct >= 50 ? "text-ctp-green" : "text-ctp-red"}`}>{winRatePct.toFixed(0)}%</span>
                        <span className="w-16 shrink-0 text-right text-ctp-subtext0">{m.games}g</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ctp-subtext0">Vs:</span>
            <select
              value={buildCounters.opponentClusterId ?? buildCounters.clusterMatchups[0]?.opponentClusterId ?? ""}
              aria-label="Opponent build"
              onChange={(e) => buildCounters.setOpponentClusterId(e.target.value)}
              className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text"
            >
              {buildCounters.clusterMatchups.map((m) => (
                <option key={m.opponentClusterId} value={m.opponentClusterId}>
                  {m.opponentClusterName} ({m.games} games)
                </option>
              ))}
            </select>
            {buildCounters.selectedMatchup && (
              <span className="text-ctp-subtext0">{(buildCounters.selectedMatchup.baselineWinRate * 100).toFixed(0)}% win rate in this matchup</span>
            )}
          </div>
          {hurtYouCards.length === 0 ? (
            <p className="mt-3 text-sm text-ctp-subtext1">Not enough recorded games yet for a card-by-card breakdown.</p>
          ) : (
            <CardImpactTable
              cards={hurtYouCards}
              cardImages={hurtYouCardImages}
              withLabel="Your win rate (they have it)"
              withoutLabel="Your win rate (they don't)"
            />
          )}
        </div>
      )}

      {activeSubTab === "similarDecks" && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Nearest similar real decks</h3>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Real decklists most similar to your accepted cards, shown automatically after two choices. These
            are references, not a replacement recommendation population. Click "Load" to use one as a new
            starting point.
          </p>
          {nearestDecks.length === 0 ? (
            <p className="mt-3 text-sm text-ctp-subtext1">No similar decks found for your choices so far.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {nearestDecks.map((d) => (
                <li key={d.deckId} className="flex flex-wrap items-center gap-1.5 rounded-md border border-ctp-surface1 px-2 py-1 text-sm">
                  <span className="text-ctp-text">{d.championName ?? "Unknown Champion"}</span>
                  {d.spiritName && <span className="text-ctp-subtext1">({d.spiritName})</span>}
                  <span className="text-xs text-ctp-subtext0">{(d.similarity * 100).toFixed(0)}% similar</span>
                  <span className="text-xs text-ctp-subtext0">{(d.winRate * 100).toFixed(0)}% win rate</span>
                  <Link
                    to={nearestDeckCompareLink(d)}
                    className="ml-auto shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                  >
                    Compare
                  </Link>
                  <button
                    type="button"
                    onClick={() => onLoadNearestDeck(d)}
                    className="shrink-0 rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                  >
                    Load
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface1 pt-3">
        {onBackToBuild ? <button type="button" onClick={onBackToBuild} className="text-xs text-ctp-blue hover:underline">← Back to build</button> : <span />}
        <button type="button" onClick={onContinueToValidation} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-medium text-ctp-base">{reviewComplete ? "Continue to validation" : "Validate current deck"} →</button>
      </div>
    </div>
  );
}
