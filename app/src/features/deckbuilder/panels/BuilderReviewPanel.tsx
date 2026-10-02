import ReviewSwapCard from "../components/ReviewSwapCard";
import Button from "../../../components/ui/Button";
import type { Card, CardImpactEntry, CardInclusionEntry } from "@gatcg/shared";
import Tabs from "../../../components/ui/Tabs";
import { CardRow, SuggestionRow } from "../components/BuilderCardRows";
import { BuilderSuggestionGrid } from "../components/BuilderCardGrid";
import BuilderReviewOverview from "../components/BuilderReviewOverview";
import { BuilderMatchups, BuilderSimilarDecks } from "../components/BuilderReviewEvidenceTabs";
import type { ReviewGroups } from "../engine/builderSelectors";
import type { SuggestedBuild, SuggestedCard } from "../useSuggestedBuild";
import type { NearestDeck } from "../useNearestDecks";
import type { BuildCounters } from "../useBuildCounters";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PopulationSource } from "../model/builderTypes";
import type { BuilderViewMode } from "../useBuilderViewMode";
import { useBuilderReviewTabs } from "../useBuilderReviewTabs";

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
  /** Omitted when there's no Build tab to return to (e.g. the suggestions-only Deck Review page) – hides the "Back to build" link instead of wiring it to a no-op. */
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
  const standaloneReview = onBackToBuild === undefined;
  const showMatchupsTab = buildCounters.sourceDeck !== null && buildCounters.clusterMatchups.length > 0;
  const { tabs: subTabs, activeTab: activeSubTab, setActiveTab: setSubTab } = useBuilderReviewTabs({ reviewItemCount, showMatchups: showMatchupsTab, showSimilarDecks: showNearestDecks });
  return (
    <div data-component="BuilderReviewPanel" role="tabpanel" id="deck-builder-panel-review" aria-labelledby="deck-builder-tab-review" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ctp-surface0 p-3 shadow-sm sm:p-4">
        <div>
          <h2 className="font-semibold text-ctp-text">{reviewComplete ? "Review complete" : `${reviewItemCount} change${reviewItemCount === 1 ? "" : "s"} to review`}</h2>
          <p className="mt-0.5 text-xs text-ctp-subtext0">{reviewComplete ? "Your current list has no supported recommendations." : "Review the cards below. Only changes you accept enter your working list."}</p>
        </div>
        <Button onClick={onContinueToValidation}>{reviewComplete ? "Finish deck" : "Validate deck"}</Button>
        {dismissedReviewCards.size > 0 && (
          <Button size="sm" onClick={onRestoreDismissed}>
            Restore dismissed
          </Button>
        )}
      </div>

      <BuilderReviewOverview build={build} simulatorMode={simulatorMode} simulatorMatchedCards={simulatorMatchedCards} lockedCardCount={lockedCards.size} mainTotal={mainTotal} totalPrice={totalPrice} sideboardPrice={sideboardPrice} showProtectedCuts={showProtectedCuts} onToggleShowProtectedCuts={onToggleShowProtectedCuts} />

      {!standaloneReview && <div className="mt-4">
        <Tabs tabs={subTabs} active={activeSubTab} onChange={setSubTab} label="Review sections" baseId="deck-builder-review" />
      </div>}

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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ctp-red">Suggested swaps</h3>
              <ul className="mt-2 space-y-2">
                {reviewGroups.pairs.map(({ removal, addition }) => (
                  <ReviewSwapCard key={`${removal.cardName}:${addition.cardName}`}
                    removal={removal} addition={addition} cardsByName={cardsByName}
                    onApply={() => onApplySwap(removal, addition)}
                    onDismiss={() => onDismissReview(removal.cardName, addition.cardName)} />
                ))}
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

      {activeSubTab === "matchups" && <BuilderMatchups buildCounters={buildCounters} hurtYouCards={hurtYouCards} hurtYouCardImages={hurtYouCardImages} />}
      {activeSubTab === "similarDecks" && <BuilderSimilarDecks nearestDecks={nearestDecks} compareLink={nearestDeckCompareLink} onLoad={onLoadNearestDeck} />}

      {!standaloneReview && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface1 pt-3">
        {onBackToBuild ? <button type="button" onClick={onBackToBuild} className="text-xs text-ctp-blue hover:underline">← Back to build</button> : <span />}
        <button type="button" onClick={onContinueToValidation} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-medium text-ctp-base">{reviewComplete ? "Continue to validation" : "Validate current deck"} →</button>
      </div>}
    </div>
  );
}
