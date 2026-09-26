import CardBrowser from "../../../components/deck-editor/CardBrowser";
import DeckEditor from "../../../components/deck-editor/DeckEditor";
import { useState } from "react";
import BuilderCardBrowserDialog from "../components/BuilderCardBrowserDialog";
import { BuilderStartActions, DecklistPaste } from "../components/DeckBuilderSetup";
import { useDeckBuilder } from "../useDeckBuilder";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedBuild } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { PopulationSource } from "../model/builderTypes";
import BuilderCardExplorer from "../components/BuilderCardExplorer";
import type { CardCategoryRecommendation } from "../cardCategoryRecommendations";

type AddDestination = "automatic" | "sideboard" | "maybeboard";

export default function BuilderBuildPanel({
  recommendationsEnabled, onToggleRecommendations, cardInput, onCardInputChange, addDestination, onAddDestinationChange, cardNames, onAddCard, customizeOpen, onToggleCustomizeOpen, viewMode, onViewModeChange,
  materialTotal, mainTotal, sideboardTotal, catalogByName, maybeboard, lockedCards, cardCategoryRecommendations,
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
  const { championName, spiritFilter, gateLoading, editor, validation } = useDeckBuilder();
  const hasCards = lockedCards.size > 0 || maybeboard.size > 0 || materialTotal + mainTotal + sideboardTotal > 0;
  const [browserOpen, setBrowserOpen] = useState(false);
  const deckCount = materialTotal + mainTotal + sideboardTotal;
  const cardBrowser = <CardBrowser query={cardInput} onQuery={onCardInputChange} destination={addDestination} onDestination={onAddDestinationChange} names={cardNames} catalog={catalogByName} deck={editor.deck} onEdit={editor.edit} onAdded={() => { if (!browserOpen) onCardInputChange(""); }} />;
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

        </div>
      )}
      <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!editor.canUndo} onClick={editor.undo} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm disabled:opacity-40">Undo</button>
        <button type="button" disabled={!editor.canRedo} onClick={editor.redo} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm disabled:opacity-40">Redo</button>
        {editor.notice && <p role="status" className="text-xs text-ctp-subtext1">{editor.notice}</p>}
      </div>
      {validation.status === "Illegal" && <div role="status" className="mt-3 rounded-lg border border-ctp-yellow/40 p-3 text-sm text-ctp-yellow">{validation.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div>}
      <DeckEditor deck={editor.deck} catalog={catalogByName} onEdit={editor.edit} viewMode={viewMode} />

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
