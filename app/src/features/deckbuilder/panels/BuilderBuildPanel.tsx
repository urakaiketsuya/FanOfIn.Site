import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CardHoverPreview from "../../../components/CardHoverPreview";
import ElementIcon from "../../../components/ElementIcon";
import ElementRail from "../../../components/ElementRail";
import NotificationBanner from "../../../components/ui/NotificationBanner";
import Panel from "../../../components/ui/Panel";
import BuilderCardGrid from "../components/BuilderCardGrid";
import { CardRow } from "../components/BuilderCardRows";
import { SIDEBOARD_POINT_BUDGET } from "../validateDeck";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { PopulationSource } from "../model/builderTypes";
import type { RatingPillar } from "../../../lib/deckIdentity";

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
  lockedCards, onPromoteMaybeCard, onRemoveMaybeCard,
}: {
  builderIntent: BuilderIntent | null;
  cardInput: string;
  onCardInputChange: (value: string) => void;
  addDestination: AddDestination;
  onAddDestinationChange: (destination: AddDestination) => void;
  cardNameSet: Set<string>;
  cardNames: string[];
  onAddCard: (name: string) => void;
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
}) {
  const communityMode = effectivePopulationSource !== "tournament" && effectivePopulationSource !== "balanced";
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
          A <span className="text-ctp-blue">*</span> next to a copy count marks a quantity tuned by global
          copy-count evidence (hover the count for its source).
        </p>
      )}
      <div className={`mt-3 grid items-start gap-4 sm:grid-cols-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <Panel elevation={1} padding="sm">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Material Deck ({materialTotal})</h2>
          {viewMode === "grid" ? (
            <BuilderCardGrid
              section="material"
              cards={build.material}
              cardsByName={cardsByName}
              priceByName={priceByName}
              priceTrendByName={priceTrendByName}
              communityInclusion={communityInclusionByName}
              hypeGapByName={hypeGapByName}
              decayByName={decaySignalByName}
              simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined}
              visibleFields={visibleFields}
              reviewRemovalNames={reviewRemovalNames}
              communityMode={communityMode}
              onToggleLock={onToggleLock}
              onRemove={onRemoveCard}
            />
          ) : (
            <ul className="mt-2 space-y-1">
              {build.material.map((c) => (
                <CardRow
                  key={c.cardName}
                  card={c}
                  cardsByName={cardsByName}
                  priceByName={priceByName}
                  communityInclusion={communityInclusionByName}
                  simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorEvidenceByName?.get(c.cardName) : undefined}
                  visibleFields={visibleFields}
                  needsReview={reviewRemovalNames.has(c.cardName)}
                  communityMode={communityMode}
                  onToggleLock={() => onToggleLock(c.cardName, c.quantity, "material")}
                  onRemove={() => onRemoveCard(c.cardName, c.locked)}
                />
              ))}
            </ul>
          )}
        </Panel>
        <Panel elevation={1} padding="sm">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Main Deck ({mainTotal})</h2>
          {viewMode === "grid" ? (
            <BuilderCardGrid
              section="main"
              cards={build.main}
              cardsByName={cardsByName}
              priceByName={priceByName}
              priceTrendByName={priceTrendByName}
              communityInclusion={communityInclusionByName}
              hypeGapByName={hypeGapByName}
              decayByName={decaySignalByName}
              simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined}
              visibleFields={visibleFields}
              reviewRemovalNames={reviewRemovalNames}
              communityMode={communityMode}
              onToggleLock={onToggleLock}
              onChangeQuantity={onChangeQuantity}
              onRemove={onRemoveCard}
            />
          ) : (
            <ul className="mt-2 space-y-1">
              {build.main.map((c) => (
                <CardRow
                  key={c.cardName}
                  card={c}
                  cardsByName={cardsByName}
                  priceByName={priceByName}
                  communityInclusion={communityInclusionByName}
                  simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorEvidenceByName?.get(c.cardName) : undefined}
                  visibleFields={visibleFields}
                  needsReview={reviewRemovalNames.has(c.cardName)}
                  communityMode={communityMode}
                  onToggleLock={() => onToggleLock(c.cardName, c.quantity, "main")}
                  onChangeQuantity={(qty) => onChangeQuantity(c.cardName, qty)}
                  onRemove={() => onRemoveCard(c.cardName, c.locked)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {build.sideboard.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Sideboard ({sideboardTotal})</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Common successful sideboard options in this population, not matchup-specific advice. Empty or
            unresolved slots are preferred when the data cannot support a confident option.
          </p>
          {viewMode === "grid" ? (
            <BuilderCardGrid
              section="sideboard"
              cards={build.sideboard}
              cardsByName={cardsByName}
              priceByName={priceByName}
              priceTrendByName={priceTrendByName}
              communityInclusion={communityInclusionByName}
              hypeGapByName={hypeGapByName}
              decayByName={decaySignalByName}
              simulatorEvidenceByName={effectivePopulationSource === "simulator" ? simulatorEvidenceByName : undefined}
              visibleFields={visibleFields}
              reviewRemovalNames={reviewRemovalNames}
              communityMode={communityMode}
              onToggleLock={onToggleLock}
              onChangeQuantity={onChangeQuantity}
              onRemove={onRemoveCard}
            />
          ) : (
            <ul className="mt-2 space-y-1">
              {build.sideboard.map((c) => (
                <CardRow
                  key={c.cardName}
                  card={c}
                  cardsByName={cardsByName}
                  priceByName={priceByName}
                  communityInclusion={communityInclusionByName}
                  simulatorEvidence={effectivePopulationSource === "simulator" ? simulatorEvidenceByName?.get(c.cardName) : undefined}
                  visibleFields={visibleFields}
                  needsReview={reviewRemovalNames.has(c.cardName)}
                  communityMode={communityMode}
                  onToggleLock={() => onToggleLock(c.cardName, c.quantity, "sideboard")}
                  onChangeQuantity={(qty) => onChangeQuantity(c.cardName, qty)}
                  onRemove={() => onRemoveCard(c.cardName, c.locked)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {maybeboard.size > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-ctp-yellow/60 bg-ctp-yellow/5 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Maybeboard ({maybeboard.size})</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">Cards you are considering. They are not part of the deck, so they do not affect legality, stats, exports, or saved versions.</p>
            </div>
          </div>
          <ul className="mt-2 space-y-1">
            {Array.from(maybeboard.entries()).map(([name, quantity]) => {
              const card = catalogByName.get(name);
              return <li key={name} className="relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ctp-yellow/30 bg-ctp-base py-1 pl-3 pr-2 text-sm">
                <ElementRail elements={card?.elements} />
                <input type="number" min={1} max={4} value={quantity} aria-label={`Copies of ${name} in maybeboard`} onChange={(event) => onMaybeQuantityChange(name, Number(event.target.value))} className="w-11 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text" />
                {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
                <CardHoverPreview image={card?.editions[0]?.image} alt={name}>{card ? <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{name}</Link> : <span className="text-ctp-text">{name}</span>}</CardHoverPreview>
                <div className="ml-auto flex gap-1.5"><button type="button" disabled={lockedCards.has(name)} onClick={() => onPromoteMaybeCard(name)} className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-40">Add to deck</button><button type="button" onClick={() => onRemoveMaybeCard(name)} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-red">Remove</button></div>
              </li>;
            })}
          </ul>
        </div>
      )}

        </>
    </div>
  );
}
