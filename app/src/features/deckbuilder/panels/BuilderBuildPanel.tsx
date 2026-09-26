import { useState } from "react";
import BuilderCardBrowserDialog from "../components/BuilderCardBrowserDialog";
import BuilderCardSearch from "../components/BuilderCardSearch";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import BuilderDeckSection from "../components/BuilderDeckSection";
import BuilderMaybeboard from "../components/BuilderMaybeboard";
import { SIDEBOARD_POINT_BUDGET } from "../validateDeck";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { PopulationSource } from "../model/builderTypes";
import { inferStartingHandSize } from "../../../lib/turnToPlay";
import BuilderCardExplorer from "../components/BuilderCardExplorer";
import type { CardCategoryRecommendation } from "../cardCategoryRecommendations";

type AddDestination = "automatic" | "sideboard" | "maybeboard";

export default function BuilderBuildPanel({
  recommendationsEnabled, onToggleRecommendations, cardInput, onCardInputChange, addDestination, onAddDestinationChange, cardNameSet,
  cardNames, onAddCard, canAddToSideboard, selectedSideboardPoints, currentSideboardPoints,
  sideboardDestinationSelected, customizeOpen, onToggleCustomizeOpen, viewMode, onViewModeChange,
  visibleFields, onVisibleFieldChange, effectivePopulationSource, build,
  isPending, materialTotal, mainTotal, sideboardTotal, cardsByName, catalogByName, priceByName,
  priceTrendByName, communityInclusionByName, hypeGapByName, decaySignalByName, simulatorEvidenceByName,
  reviewRemovalNames, onToggleLock, onChangeQuantity, onRemoveCard, maybeboard, onMaybeQuantityChange,
  lockedCards, onPromoteMaybeCard, onRemoveMaybeCard, cardCategoryRecommendations,
}: {
  recommendationsEnabled: boolean;
  onToggleRecommendations: () => void;
  cardInput: string;
  onCardInputChange: (value: string) => void;
  addDestination: AddDestination;
  onAddDestinationChange: (destination: AddDestination) => void;
  cardNameSet: Set<string>;
  cardNames: string[];
  onAddCard: (name: string, quantity?: number, destination?: "automatic" | "maybeboard") => void;
  canAddToSideboard: boolean;
  selectedSideboardPoints: number;
  currentSideboardPoints: number;
  sideboardDestinationSelected: boolean;
  customizeOpen: boolean;
  onToggleCustomizeOpen: () => void;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  visibleFields: CardFieldVisibility;
  onVisibleFieldChange: (field: keyof CardFieldVisibility, value: boolean) => void;
  effectivePopulationSource: PopulationSource;
  build: SuggestedBuild;
  isPending: boolean;
  materialTotal: number;
  mainTotal: number;
  sideboardTotal: number;
  cardsByName: Map<string, Card>;
  catalogByName: Map<string, Card>;
  priceByName: Map<string, number>;
  priceTrendByName: Map<string, PriceTrendEntry>;
  communityInclusionByName: Map<string, CardInclusionEntry> | undefined;
  hypeGapByName: Map<string, number> | undefined;
  decaySignalByName: Map<string, CardDecaySignal> | undefined;
  simulatorEvidenceByName: Map<string, SimulatorCardEvidence> | undefined;
  reviewRemovalNames: Set<string>;
  onToggleLock: (name: string, quantity: number, section?: "main" | "material" | "sideboard") => void;
  onChangeQuantity: (name: string, quantity: number) => void;
  onRemoveCard: (name: string, locked: boolean) => void;
  maybeboard: Map<string, number>;
  onMaybeQuantityChange: (name: string, quantity: number) => void;
  lockedCards: Map<string, number>;
  onPromoteMaybeCard: (name: string) => void;
  onRemoveMaybeCard: (name: string) => void;
  cardCategoryRecommendations: CardCategoryRecommendation[];
}) {
  const { championName, spiritFilter, gateLoading } = useDeckBuilder();
  const hasCards = lockedCards.size > 0 || maybeboard.size > 0 || materialTotal + mainTotal + sideboardTotal > 0;
  const communityMode = effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced";
  const startingHandSize = inferStartingHandSize(build.material.map((card) => ({ name: card.cardName })), catalogByName);
  const [browserOpen, setBrowserOpen] = useState(false);
  const deckCount = materialTotal + mainTotal + sideboardTotal;
  function addFromBrowser(name: string, quantity = 1) {
    onAddCard(name, quantity);
    if (browserOpen) {
      // Keep the current search and destination while adding several cards.
      onCardInputChange(cardInput);
      onAddDestinationChange(addDestination);
    }
  }
  const cardBrowser = <>
      <div className="rounded-xl border border-ctp-surface1 bg-ctp-base/95 p-2 shadow-sm backdrop-blur">
      <label htmlFor="deck-builder-card-input" className="mb-2 block text-sm font-semibold text-ctp-text">Add cards</label>
      <input
        id="deck-builder-card-input"
        type="text"
        value={cardInput}
        onChange={(e) => {
          onCardInputChange(e.target.value);
          onAddDestinationChange("automatic");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && cardNameSet.has(cardInput)) addFromBrowser(cardInput, 1);
        }}
        placeholder="Search by card name…"
        className="block w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-base text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-md sm:text-sm"
      />
      {cardNames.length === 0 && <p role="status" className="mt-2 text-sm text-ctp-subtext1">Loading the card catalog…</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!cardNameSet.has(cardInput) || (lockedCards.has(cardInput) && addDestination !== "maybeboard")}
          onClick={() => addFromBrowser(cardInput, 1)}
          className="min-h-12 rounded-lg bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-1.5 sm:text-xs"
        >
          {addDestination === "maybeboard" ? "Add to maybeboard" : sideboardDestinationSelected ? "Add to sideboard" : "Add card"}
        </button>
        <details className="group relative">
          <summary className="flex min-h-12 cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text sm:min-h-0 sm:py-1.5 sm:text-xs">
            {addDestination === "automatic" ? "Deck" : addDestination === "sideboard" ? "Sideboard" : "Maybeboard"} <DisclosureChevron className="ml-1 group-open:rotate-180" />
          </summary>
          <div role="group" aria-label="Card destination" className="absolute left-0 z-20 mt-1 flex min-w-max rounded-md border border-ctp-surface1 bg-ctp-mantle p-1 shadow-lg">
          <button
            type="button"
            aria-pressed={addDestination === "automatic"}
            onClick={() => onAddDestinationChange("automatic")}
            className={`rounded px-2.5 py-1 text-xs ${addDestination === "automatic" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
          >
            Deck
          </button>
          <button
            type="button"
            aria-pressed={addDestination === "sideboard"}
            disabled={!canAddToSideboard}
            onClick={() => onAddDestinationChange("sideboard")}
            title={!cardNameSet.has(cardInput) ? "Choose a card first" : !canAddToSideboard ? `This card would exceed the ${SIDEBOARD_POINT_BUDGET}-point sideboard budget` : undefined}
            className={`rounded px-2.5 py-1 text-xs ${addDestination === "sideboard" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 enabled:hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"}`}
          >
            Sideboard
          </button>
          <button
            type="button"
            aria-pressed={addDestination === "maybeboard"}
            onClick={() => onAddDestinationChange("maybeboard")}
            className={`rounded px-2.5 py-1 text-xs ${addDestination === "maybeboard" ? "bg-ctp-yellow text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
          >
            Maybeboard
          </button>
          </div>
        </details>
        {sideboardDestinationSelected && <span className="text-xs text-ctp-subtext0">{selectedSideboardPoints} points · {SIDEBOARD_POINT_BUDGET - currentSideboardPoints} available</span>}
      </div>
      </div>
      {cardNames.length > 0 && <BuilderCardSearch key={cardInput.trim().toLocaleLowerCase()} query={cardInput} names={cardNames} catalog={catalogByName} chosen={addDestination === "maybeboard" ? maybeboard : lockedCards} onAdd={addFromBrowser} />}
  </>;
  return (
    <div data-component="BuilderBuildPanel" role="tabpanel" id="deck-builder-panel-build" aria-labelledby="deck-builder-tab-build" className="mt-4">
      {hasCards ? <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ctp-subtext1">Your deck · {deckCount} {deckCount === 1 ? "card" : "cards"}</p>
        <button type="button" onClick={() => { onCardInputChange(""); setBrowserOpen(true); }} className="rounded-lg bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base">Add cards</button>
      </div> : !browserOpen && cardBrowser}
      {browserOpen && <BuilderCardBrowserDialog count={deckCount} onDismiss={() => setBrowserOpen(false)}>{cardBrowser}</BuilderCardBrowserDialog>}

      {customizeOpen && (
        <div className="mt-3 space-y-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-ctp-text">Card display</h2><button type="button" onClick={onToggleCustomizeOpen} className="rounded-lg px-3 text-sm text-ctp-blue">Done</button></div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 shrink-0 text-[11px] text-ctp-subtext0">Layout</span>
            {(["list", "grid"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => onViewModeChange(mode)} aria-pressed={viewMode === mode} className={`rounded-md border px-2 py-1 text-xs capitalize ${viewMode === mode ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{mode}</button>
            ))}
          </div>
          {(
            [
              ["Basics", [
                ["cost", "Cost"],
                ["price", "Price"],
                ["priceTrend", "Price trend"],
                ["tags", "Element/class"],
              ]],
            ] as [string, [keyof CardFieldVisibility, string][]][]
          ).map(([group, fields]) => (
            <div key={group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-[11px] text-ctp-subtext0">{group}</span>
              {fields.map(([field, label]) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => onVisibleFieldChange(field, !visibleFields[field])}
                  aria-pressed={visibleFields[field]}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    visibleFields[field] ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <>
      <div className={`mt-3 space-y-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {build.material.length > 0 && <BuilderDeckSection showLockToggle={false} panel section="material" title="Material Deck" total={materialTotal} cards={build.material} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onRemove={onRemoveCard} />}
        {build.main.length > 0 && <BuilderDeckSection showLockToggle={false} panel section="main" title="Main Deck" total={mainTotal} cards={build.main} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onChangeQuantity={onChangeQuantity} onRemove={onRemoveCard} />}
      </div>

      {build.sideboard.length > 0 && (
        <details className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Sideboard ({sideboardTotal})</summary>
          <BuilderDeckSection showLockToggle={false} hideTitle section="sideboard" title="Sideboard" total={sideboardTotal} cards={build.sideboard} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onChangeQuantity={onChangeQuantity} onRemove={onRemoveCard} />
        </details>
      )}

      <BuilderMaybeboard cards={maybeboard} catalogByName={catalogByName} lockedCards={lockedCards} onQuantityChange={onMaybeQuantityChange} onPromote={onPromoteMaybeCard} onRemove={onRemoveMaybeCard} />
      {!hasCards && <><DecklistPaste /><BuilderStartActions /></>}
      <section className="mt-4" aria-label="Optional card recommendations">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onToggleRecommendations} aria-expanded={recommendationsEnabled} aria-controls="builder-recommendations" className="rounded-lg border border-ctp-blue px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-blue/10">
            {recommendationsEnabled ? "Hide recommendations" : "Recommend cards"}
          </button>
        </div>
        {recommendationsEnabled && <div id="builder-recommendations">
          <p className="mt-3 text-sm text-ctp-subtext1">Cards enter your deck only when you add them.</p>
          {(!championName || !spiritFilter) ? <div className="mt-3 text-sm text-ctp-subtext1"><p>Add {!championName && !spiritFilter ? "Champion and Spirit cards" : !championName ? "a Champion card" : "a Spirit card"} to your Material deck to focus recommendations. You can keep building without them.</p><button type="button" onClick={() => setBrowserOpen(true)} className="mt-2 min-h-12 rounded-lg px-3 text-ctp-blue">Search for cards</button></div> : gateLoading ? <p role="status" className="mt-3 text-sm text-ctp-subtext1">Loading recommendations…</p> : <BuilderCardExplorer recommendations={cardCategoryRecommendations} lockedCards={lockedCards} onAddCard={onAddCard} />}
          {championName && spiritFilter && !gateLoading && cardCategoryRecommendations.length === 0 && <p className="mt-3 text-xs text-ctp-subtext0">No recommendations available for this identity yet. You can keep adding cards by name.</p>}
        </div>}
      </section>


        </>
    </div>
  );
}
