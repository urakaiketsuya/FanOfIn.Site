import type { Card, CardInclusionEntry } from "@gatcg/shared";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { SuggestedCard } from "../useSuggestedBuild";
import { CardTile, type BuilderSection } from "./BuilderCardTile";

type CardGridData = {
  cards: SuggestedCard[];
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  simulatorEvidenceByName?: Map<string, SimulatorCardEvidence>;
  visibleFields: CardFieldVisibility;
};

/** Full-image alternative to CardRow for one placed deck section. */
export default function BuilderCardGrid({
  section, cards, cardsByName, priceByName, priceTrendByName, communityInclusion,
  hypeGapByName, decayByName, simulatorEvidenceByName, visibleFields,
  communityMode = false, reviewRemovalNames, mainDeckSize, startingHandSize,
  onToggleLock, onChangeQuantity, onRemove,
}: CardGridData & {
  section: BuilderSection;
  priceTrendByName?: Map<string, PriceTrendEntry>;
  hypeGapByName?: Map<string, number>;
  decayByName?: Map<string, CardDecaySignal>;
  communityMode?: boolean;
  reviewRemovalNames?: Set<string>;
  mainDeckSize?: number;
  startingHandSize?: number;
  onToggleLock: (cardName: string, quantity: number, section: BuilderSection) => void;
  onChangeQuantity?: (cardName: string, quantity: number) => void;
  onRemove: (cardName: string, locked: boolean) => void;
}) {
  if (cards.length === 0) return null;
  const resolvedMainDeckSize = mainDeckSize ?? (section === "main" ? cards.reduce((sum, card) => sum + card.quantity, 0) : 0);
  return (
    <div
      data-component="BuilderCardGrid"
      className={section === "material"
        ? "-mx-3 mt-2 flex snap-x gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6 xl:grid-cols-8"
        : "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}
    >
      {cards.map((card) => (
        <CardTile key={card.cardName} className={section === "material" ? "w-32 shrink-0 snap-start sm:w-auto" : undefined} card={card} cardInfo={cardsByName.get(card.cardName)} unitPrice={priceByName.get(card.cardName)} priceTrend={priceTrendByName?.get(card.cardName)} communityEntry={communityInclusion?.get(card.cardName)} hypeGap={hypeGapByName?.get(card.cardName)} decaySignal={decayByName?.get(card.cardName)} simulatorEvidence={simulatorEvidenceByName?.get(card.cardName)} visibleFields={visibleFields} communityMode={communityMode} needsReview={reviewRemovalNames?.has(card.cardName) ?? false} section={section} mainDeckSize={resolvedMainDeckSize} startingHandSize={startingHandSize} onToggleLock={() => onToggleLock(card.cardName, card.quantity, section)} onChangeQuantity={onChangeQuantity ? (quantity) => onChangeQuantity(card.cardName, quantity) : undefined} onRemove={() => onRemove(card.cardName, card.locked)} />
      ))}
    </div>
  );
}

/** Grid for unplaced recommendations, with Add/Dismiss actions. */
export function BuilderSuggestionGrid({ cards, cardsByName, priceByName, communityInclusion, simulatorEvidenceByName, visibleFields, onAdd, onDismiss }: CardGridData & { onAdd: (card: SuggestedCard) => void; onDismiss: (cardName: string) => void }) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <CardTile key={card.cardName} card={card} cardInfo={cardsByName.get(card.cardName)} unitPrice={priceByName.get(card.cardName)} priceTrend={undefined} communityEntry={communityInclusion?.get(card.cardName)} hypeGap={undefined} decaySignal={undefined} simulatorEvidence={simulatorEvidenceByName?.get(card.cardName)} visibleFields={visibleFields} communityMode={false} needsReview={false} onAdd={() => onAdd(card)} onDismiss={() => onDismiss(card.cardName)} />
      ))}
    </div>
  );
}

export { CardTile } from "./BuilderCardTile";
