import type { Card, CardInclusionEntry } from "@gatcg/shared";
import Panel from "../../../components/ui/Panel";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import BuilderCardGrid from "./BuilderCardGrid";
import { CardRow } from "./BuilderCardRows";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { SuggestedCard } from "../useSuggestedBuild";

export type BuilderDeckSectionName = "main" | "material" | "sideboard";

type BuilderDeckSectionProps = {
  section: BuilderDeckSectionName;
  title: string;
  total: number;
  cards: SuggestedCard[];
  viewMode: "list" | "grid";
  mainDeckSize: number;
  startingHandSize: number;
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  priceTrendByName: Map<string, PriceTrendEntry>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  hypeGapByName?: Map<string, number>;
  decayByName?: Map<string, CardDecaySignal>;
  simulatorEvidenceByName?: Map<string, SimulatorCardEvidence>;
  visibleFields: CardFieldVisibility;
  reviewRemovalNames: Set<string>;
  communityMode: boolean;
  onToggleLock: (name: string, quantity: number, section: BuilderDeckSectionName) => void;
  onChangeQuantity?: (name: string, quantity: number) => void;
  onRemove: (name: string, locked: boolean) => void;
  panel?: boolean;
  description?: string;
  hideTitle?: boolean;
  showLockToggle?: boolean;
};

export default function BuilderDeckSection({
  section, title, total, cards, viewMode, mainDeckSize, startingHandSize, cardsByName,
  priceByName, priceTrendByName, communityInclusion, hypeGapByName, decayByName,
  simulatorEvidenceByName, visibleFields, reviewRemovalNames, communityMode,
  onToggleLock, onChangeQuantity, onRemove, panel = false, description, hideTitle = false, showLockToggle = true,
}: BuilderDeckSectionProps) {
  const content = (
    <>
      {!hideTitle && <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title} ({total})</h2>}
      {cards.length === 0 && <p className="mt-3 text-sm text-ctp-subtext0">{section === "main" ? "Your main deck starts here. Search for a card above to add it." : "Add Champion, Spirit, and Regalia cards using search above."}</p>}
      {description && <p className="mt-1 text-xs text-ctp-subtext0">{description}</p>}
      {viewMode === "grid" ? (
        <BuilderCardGrid
          showLockToggle={showLockToggle}
          section={section}
          mainDeckSize={mainDeckSize}
          startingHandSize={startingHandSize}
          cards={cards}
          cardsByName={cardsByName}
          priceByName={priceByName}
          priceTrendByName={priceTrendByName}
          communityInclusion={communityInclusion}
          hypeGapByName={hypeGapByName}
          decayByName={decayByName}
          simulatorEvidenceByName={simulatorEvidenceByName}
          visibleFields={visibleFields}
          reviewRemovalNames={reviewRemovalNames}
          communityMode={communityMode}
          onToggleLock={onToggleLock}
          onChangeQuantity={onChangeQuantity}
          onRemove={onRemove}
        />
      ) : (
        <ul className="mt-2 space-y-1">
          {cards.map((card) => (
            <CardRow
              key={card.cardName}
              card={card}
              cardsByName={cardsByName}
              priceByName={priceByName}
              communityInclusion={communityInclusion}
              simulatorEvidence={simulatorEvidenceByName?.get(card.cardName)}
              visibleFields={visibleFields}
              needsReview={reviewRemovalNames.has(card.cardName)}
              section={section}
              mainDeckSize={mainDeckSize}
              startingHandSize={startingHandSize}
              communityMode={communityMode}
              showLockToggle={showLockToggle}
              onToggleLock={() => onToggleLock(card.cardName, card.quantity, section)}
              onChangeQuantity={onChangeQuantity ? (quantity) => onChangeQuantity(card.cardName, quantity) : undefined}
              onRemove={() => onRemove(card.cardName, card.locked)}
            />
          ))}
        </ul>
      )}
    </>
  );

  return panel ? <Panel elevation={1} padding="sm">{content}</Panel> : <div className="mt-4">{content}</div>;
}
