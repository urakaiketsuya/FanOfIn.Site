import BuilderCardEvidence from "./BuilderCardEvidence";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CardArtTile from "../../../components/CardArtTile";
import DialogSheet from "../../../components/ui/DialogSheet";
import QuantityControl from "../../../components/deck-editor/QuantityControl";
import CardHoverPreview from "../../../components/CardHoverPreview";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedCard } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import { computeCardPlayOdds } from "../cardPlayOdds";
import { primaryAlternateFace } from "../../../lib/cardFaces";

export type BuilderSection = "main" | "material" | "sideboard";

export function CardTile({
  card,
  cardInfo,
  unitPrice,
  priceTrend,
  communityEntry,
  hypeGap,
  decaySignal,
  simulatorEvidence,
  visibleFields,
  communityMode,
  needsReview,
  onToggleLock,
  onChangeQuantity,
  onRemove,
  onAdd,
  onDismiss,
  section = "sideboard",
  mainDeckSize = 0,
  startingHandSize,
  className,
}: {
  card: SuggestedCard;
  cardInfo: Card | undefined;
  unitPrice: number | undefined;
  priceTrend: PriceTrendEntry | undefined;
  communityEntry: CardInclusionEntry | undefined;
  /** Community inclusion share minus this Champion's own tournament inclusion share — how much more (or less) this card is brewed than actually played. */
  hypeGap: number | null | undefined;
  decaySignal: CardDecaySignal | undefined;
  simulatorEvidence: SimulatorCardEvidence | undefined;
  visibleFields: CardFieldVisibility;
  communityMode: boolean;
  needsReview: boolean;
  /** Placed-card footer (Keep/Remove) — mutually exclusive with `onAdd`/`onDismiss` below. */
  onToggleLock?: () => void;
  onChangeQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  /** Not-yet-placed suggestion footer (Add/Dismiss) — set instead of `onToggleLock`/`onRemove` for a card that isn't in the build yet. */
  onAdd?: () => void;
  onDismiss?: () => void;
  section?: BuilderSection;
  mainDeckSize?: number;
  startingHandSize?: number;
  className?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reverseFace = primaryAlternateFace(cardInfo);
  const maxQuantity = Math.max(1, Math.min(cardInfo?.legality?.STANDARD?.limit ?? 4, 4));
  const tags = [...(cardInfo?.elements.filter((e) => e !== "NORM") ?? []), ...(cardInfo?.classes ?? [])];
  const playOdds = section === "main" && cardInfo?.cost.type === "reserve"
    ? computeCardPlayOdds(mainDeckSize, card.quantity, cardInfo.cost_reserve, startingHandSize)
    : null;

  return (
    <div className={`${className ?? ""} overflow-hidden rounded-lg border bg-ctp-mantle shadow-sm transition-shadow hover:shadow-md ${card.locked ? "border-ctp-blue/70" : "border-ctp-surface1"}`}>
      <div className="relative aspect-[5/7] bg-ctp-surface0">
        <CardHoverPreview artOnly image={cardInfo?.editions[0]?.image} backImage={reverseFace?.edition.image} backAlt={reverseFace?.name} alt={card.cardName}>
          <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`View ${card.cardName} details`} className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue">
          <CardArtTile card={cardInfo} name={card.cardName} />
          </button>
        </CardHoverPreview>
        {(
          <span
            className="absolute right-1.5 top-1.5 rounded-full border border-ctp-surface1 bg-ctp-base/90 px-1.5 py-0.5 text-[11px] font-medium text-ctp-text"
            title={card.optimizedFrom !== null ? `Quantity changed from ${card.optimizedFrom}x using ${card.quantityEvidence.source} evidence (n=${card.quantityEvidence.sampleSize})` : undefined}
          >
            {card.quantity}x{card.optimizedFrom !== null && <span className="text-ctp-blue">*</span>}
          </span>
        )}
        {needsReview && (
          <span className="absolute left-1.5 top-1.5 rounded-full border border-ctp-yellow/60 bg-ctp-base/90 px-1.5 py-0.5 text-[10px] font-medium text-ctp-yellow">
            Review
          </span>
        )}
        {visibleFields.tags && tags.length > 0 && (
          <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded border border-ctp-surface1 bg-ctp-base/90 px-1 text-[10px] text-ctp-subtext1">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-2">
        {cardInfo ? <Link to={`/cards/${cardInfo.slug}`} className="flex min-h-12 items-center break-words text-sm font-medium text-ctp-blue">{card.cardName}</Link> : <p className="flex min-h-12 items-center break-words text-sm font-medium">{card.cardName}</p>}
        {card.locked && onChangeQuantity && <QuantityControl name={card.cardName} quantity={card.quantity} max={maxQuantity} onChange={onChangeQuantity} stacked />}
      </div>
      {detailsOpen && <DialogSheet title={card.cardName} onDismiss={() => setDetailsOpen(false)}>
      <BuilderCardEvidence card={card} cardInfo={cardInfo} unitPrice={unitPrice} priceTrend={priceTrend} communityEntry={communityEntry} hypeGap={hypeGap} decaySignal={decaySignal} simulatorEvidence={simulatorEvidence} visibleFields={visibleFields} communityMode={communityMode} playOdds={playOdds} />

      <div className="mt-5 flex gap-2 border-t border-ctp-surface1 pt-4">
        {onAdd ? (
          <>
            <button
              type="button"
              onClick={onAdd}
              className="min-h-12 flex-1 rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base"
            >
              Add
            </button>
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="min-h-12 flex-1 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text">
                Dismiss
              </button>
            )}
          </>
        ) : (
          <>
            {onToggleLock && <button
              type="button"
              onClick={onToggleLock}
              className={`min-h-12 flex-1 rounded-lg border px-3 py-2 text-sm ${card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}
            >
              {card.locked ? "Kept" : "Keep"}
            </button>}
            <button type="button" onClick={onRemove} className="min-h-12 flex-1 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red">
              Remove
            </button>
          </>
        )}
      </div>
      </DialogSheet>}
    </div>
  );
}
