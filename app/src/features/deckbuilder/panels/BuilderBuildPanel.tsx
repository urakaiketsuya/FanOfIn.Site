import type { Card, CardInclusionEntry } from "@gatcg/shared";
import NotificationBanner from "../../../components/ui/NotificationBanner";
import BuilderDeckSection from "../components/BuilderDeckSection";
import BuilderMaybeboard from "../components/BuilderMaybeboard";
import { SIDEBOARD_POINT_BUDGET } from "../validateDeck";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { PopulationSource } from "../model/builderTypes";
import type { RatingPillar } from "../../../lib/deckIdentity";
import { inferStartingHandSize } from "../../../lib/turnToPlay";
import BuilderCardExplorer from "../components/BuilderCardExplorer";
import type { CardCategoryRecommendation } from "../cardCategoryRecommendations";

type BuilderIntent = "seed" | "scratch";
type AddDestination = "automatic" | "sideboard" | "maybeboard";

export default function BuilderBuildPanel({
  builderIntent, cardInput, onCardInputChange, addDestination, onAddDestinationChange, cardNameSet,
  cardNames, onAddCard, canAddToSideboard, selectedSideboardPoints, currentSideboardPoints,
  sideboardDestinationSelected, customizeOpen, onToggleCustomizeOpen, viewMode, onViewModeChange,
  visibleFields, onVisibleFieldChange, pillarBias, effectivePopulationSource, onJumpToTools, build,
  isPending, materialTotal, mainTotal, sideboardTotal, cardsByName, catalogByName, priceByName,
  priceTrendByName, communityInclusionByName, hypeGapByName, decaySignalByName, simulatorEvidenceByName,
  reviewRemovalNames, onToggleLock, onChangeQuantity, onRemoveCard, maybeboard, onMaybeQuantityChange,
  lockedCards, onPromoteMaybeCard, onRemoveMaybeCard, cardCategoryRecommendations,
}: {
  builderIntent: BuilderIntent | null;
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
  pillarBias: RatingPillar | null;
  effectivePopulationSource: PopulationSource;
  onJumpToTools: () => void;
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
  const communityMode = effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced";
  const startingHandSize = inferStartingHandSize(build.material.map((card) => ({ name: card.cardName })), catalogByName);
  return (
    <div data-component="BuilderBuildPanel" role="tabpanel" id="deck-builder-panel-build" aria-labelledby="deck-builder-tab-build" className="mt-4">
      <span className="text-sm text-ctp-subtext0">{builderIntent === "seed" ? "Cards to build around:" : "Add a card:"}</span>
      <input
        type="text"
        list="deck-builder-card-options"
        value={cardInput}
        onChange={(e) => {
          onCardInputChange(e.target.value);
          onAddDestinationChange("automatic");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && cardNameSet.has(cardInput)) onAddCard(cardInput);
        }}
        placeholder={builderIntent === "seed" ? "Type a card you want to keep in the deck…" : "Type a card name to add as your choice…"}
        className="mt-1 block w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />
      <datalist id="deck-builder-card-options">
        {cardNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-ctp-subtext1">Destination:</span>
        <div role="group" aria-label="Card destination" className="inline-flex rounded-md border border-ctp-surface1 bg-ctp-mantle p-0.5">
          <button
            type="button"
            aria-pressed={addDestination === "automatic"}
            onClick={() => onAddDestinationChange("automatic")}
            className={`rounded px-2.5 py-1 text-xs ${addDestination === "automatic" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}
          >
            Automatic
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
        <button
          type="button"
          disabled={!cardNameSet.has(cardInput) || (lockedCards.has(cardInput) && addDestination !== "maybeboard")}
          onClick={() => onAddCard(cardInput)}
          className="rounded-md border border-ctp-blue px-3 py-1 text-xs text-ctp-blue enabled:hover:bg-ctp-surface0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {addDestination === "maybeboard" ? "Add to maybeboard" : sideboardDestinationSelected ? "Add to sideboard" : "Add card"}
        </button>
        <span className="text-xs text-ctp-subtext0">
          {addDestination === "maybeboard"
            ? "Doesn't affect the deck until you promote it."
            : sideboardDestinationSelected
            ? `Uses ${selectedSideboardPoints} points; ${SIDEBOARD_POINT_BUDGET - currentSideboardPoints} available.`
            : "Automatic places the card in Main or Material."}
        </span>
      </div>
      <BuilderCardExplorer recommendations={cardCategoryRecommendations} lockedCards={lockedCards} onAddCard={onAddCard} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={customizeOpen}
          onClick={onToggleCustomizeOpen}
          className={`rounded-md border px-2 py-1 text-xs ${
            customizeOpen ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          Customize card info {customizeOpen ? "▴" : "▾"}
        </button>
        <div className="flex gap-1" role="group" aria-label="Material/Main/Sideboard display">
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
      {customizeOpen && (
        <div className="mt-1.5 space-y-1.5">
          {(
            [
              ["Basics", [
                ["cost", "Cost"],
                ["price", "Price"],
                ["priceTrend", "Price trend"],
                ["tags", "Element/class"],
              ]],
              ["Performance", [
                ["winRate", "Win rate"],
                ["sample", "Sample size"],
                ["quantityNote", "Quantity note"],
              ]],
              ["Community & meta", [
                ["community", "Community usage"],
                ["hypeGap", "Hype gap"],
                ["metaTrend", "Meta trend"],
              ]],
              ["Simulator", [
                ["simulatorDetail", "Simulator detail"],
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
                  className={`rounded-md border px-2 py-1 text-xs ${
                    visibleFields[field] ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-ctp-subtext0">Cost/Price/Win rate/Sample size/Community usage show in both List and Grid; every other field only renders in Grid.</p>
        </div>
      )}
      {pillarBias !== null && (effectivePopulationSource === "tournament" || effectivePopulationSource === "balanced") && (
        <div className="mt-3">
          <NotificationBanner
            tone="info"
            title={`Tuning active: ${pillarBias} bias`}
            description="Nudging suggestions toward one DIAO Score pillar."
            action={{ label: "Adjust in Tools", onClick: onJumpToTools }}
          />
        </div>
      )}
      <>
      {build.hasQuantityOptimizations && (
        <p className="mt-3 text-[11px] text-ctp-subtext0">
          A <span className="text-ctp-blue">*</span> next to a copy count marks a quantity tuned by
          copy-count evidence (hover the count for its source and population).
        </p>
      )}
      {visibleFields.cost && <p className="mt-2 text-[11px] text-ctp-subtext0">Reserve odds show the chance of seeing at least one copy by its first cost-ready turn. Mulligans, extra draws, level requirements, and earlier spending are not modeled.</p>}
      <div className={`mt-3 grid items-start gap-4 sm:grid-cols-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <BuilderDeckSection panel section="material" title="Material Deck" total={materialTotal} cards={build.material} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onRemove={onRemoveCard} />
        <BuilderDeckSection panel section="main" title="Main Deck" total={mainTotal} cards={build.main} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onChangeQuantity={onChangeQuantity} onRemove={onRemoveCard} />
      </div>

      {build.sideboard.length > 0 && (
        <BuilderDeckSection section="sideboard" title="Sideboard" total={sideboardTotal} cards={build.sideboard} viewMode={viewMode} mainDeckSize={mainTotal} startingHandSize={startingHandSize} cardsByName={cardsByName} priceByName={priceByName} priceTrendByName={priceTrendByName} communityInclusion={communityInclusionByName} hypeGapByName={hypeGapByName} decayByName={decaySignalByName} simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined} visibleFields={visibleFields} reviewRemovalNames={reviewRemovalNames} communityMode={communityMode} onToggleLock={onToggleLock} onChangeQuantity={onChangeQuantity} onRemove={onRemoveCard} description="Common successful sideboard options in this population, not matchup-specific advice. Empty or unresolved slots are preferred when the data cannot support a confident option." />
      )}

      <BuilderMaybeboard cards={maybeboard} catalogByName={catalogByName} lockedCards={lockedCards} onQuantityChange={onMaybeQuantityChange} onPromote={onPromoteMaybeCard} onRemove={onRemoveMaybeCard} />

        </>
    </div>
  );
}
