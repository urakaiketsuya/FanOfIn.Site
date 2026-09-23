import { Link } from "react-router-dom";
import { useState } from "react";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CardImage from "../../../components/CardImage";
import CardHoverPreview from "../../../components/CardHoverPreview";
import CostIcon from "../../../components/CostIcon";
import { formatUsd } from "../../../lib/format";
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
        <CardHoverPreview image={cardInfo?.editions[0]?.image} backImage={reverseFace?.edition.image} backAlt={reverseFace?.name} alt={card.cardName}>
          <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`View ${card.cardName} details`} className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue">
          {cardInfo ? (
            <span className="block h-full w-full">
              {cardInfo.editions[0] ? (
                <CardImage image={cardInfo.editions[0].image} alt={card.cardName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{card.cardName}</span>
              )}
            </span>
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{card.cardName}</span>
          )}
          </button>
        </CardHoverPreview>
        {card.locked && onChangeQuantity ? (
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={card.quantity}
            aria-label={`Copies of ${card.cardName}`}
            title="Adjust copies while keeping this card as your choice"
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity));
            }}
            className="absolute right-1.5 top-1.5 w-11 rounded border border-ctp-surface1 bg-ctp-base/90 px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
          />
        ) : (
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

      {detailsOpen && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={`${card.cardName} details`}>
      <button type="button" className="absolute inset-0 bg-ctp-crust/70" onClick={() => setDetailsOpen(false)} aria-label="Close card details" />
      <div className="relative max-h-[82dvh] w-full overflow-y-auto rounded-t-2xl border border-ctp-surface1 bg-ctp-base p-4 shadow-2xl sm:h-full sm:max-h-none sm:max-w-sm sm:rounded-none sm:border-y-0 sm:border-r-0">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ctp-text">{card.cardName}</h3>
            {cardInfo && <Link to={`/cards/${cardInfo.slug}`} className="mt-1 inline-block text-xs text-ctp-blue hover:underline">Open card page</Link>}
          </div>
          <button type="button" onClick={() => setDetailsOpen(false)} className="min-h-11 min-w-11 rounded-full border border-ctp-surface1 text-lg text-ctp-subtext1 hover:text-ctp-text" aria-label="Close card details">×</button>
        </div>
      <div className="space-y-2 text-sm">
        {visibleFields.cost && cardInfo && cardInfo.cost.type !== "none" && cardInfo.cost.value !== null && (
          <>
            <div className="flex items-center justify-between text-ctp-subtext1">
              <span>Cost</span>
              <span className="flex items-center gap-0.5 text-ctp-text">
                <CostIcon kind={cardInfo.cost.type} size={12} />
                {cardInfo.cost.value}
              </span>
            </div>
            {playOdds && <div className="flex items-center justify-between text-ctp-subtext1" title={`Chance to see at least one of ${card.quantity} copies among ${playOdds.cardsSeen} cards by the first Reserve-ready turn. Does not include mulligans, draw effects, champion-level requirements, or cards already spent.`}><span>Playable draw</span><span className="font-medium tabular-nums text-ctp-teal">{Math.round(playOdds.probability * 100)}% by T{playOdds.turn}</span></div>}
          </>
        )}
        {visibleFields.price && unitPrice !== undefined && (
          <div className="flex items-center justify-between text-ctp-subtext1">
            <span>Price</span>
            <span className="text-ctp-text">{formatUsd(unitPrice * card.quantity)}</span>
          </div>
        )}
        {visibleFields.priceTrend && priceTrend && (
          <div className="flex items-center justify-between text-ctp-subtext1">
            <span>Price trend</span>
            <span className={priceTrend.pctChange >= 0 ? "text-ctp-green" : "text-ctp-red"}>
              {priceTrend.pctChange >= 0 ? "▲" : "▼"} {Math.abs(priceTrend.pctChange * 100).toFixed(0)}%
            </span>
          </div>
        )}
        {visibleFields.winRate &&
          (card.adjustedLift !== null ? (
            <div className="flex items-center justify-between text-ctp-subtext1">
              <span>Win rate</span>
              <span className={`font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
                {card.adjustedLift >= 0 ? "+" : ""}
                {(card.adjustedLift * 100).toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-ctp-subtext1">
              <span>Win rate</span>
              <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
                {card.reason === "identity-staple"
                  ? "core synergy"
                  : communityMode && !card.locked
                    ? "popular pick"
                    : card.reason === "spirit"
                      ? "your pick"
                      : card.reason === "staple"
                        ? "staple"
                        : "your choice"}
              </span>
            </div>
          ))}
        {visibleFields.sample && card.sample && (
          <div className="flex items-center justify-between text-ctp-subtext1">
            <span>Sample</span>
            <span className="text-ctp-text">{card.sample.with} vs {card.sample.without}</span>
          </div>
        )}
        {(card.readinessReasons?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {card.readinessReasons?.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-ctp-teal/50 bg-ctp-teal/10 px-1.5 text-[10px] font-medium text-ctp-teal"
                title="Deterministic synergy-readiness signal; separate from observed win rate"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
        {visibleFields.quantityNote && card.optimizedFrom !== null && (
          <div className="text-ctp-subtext0">
            Changed from {card.optimizedFrom}x — {card.quantityEvidence.source} evidence (n={card.quantityEvidence.sampleSize})
          </div>
        )}
        {visibleFields.community && communityEntry && (
          <div className="flex items-center justify-between text-ctp-subtext1">
            <span>Community</span>
            <span className="text-ctp-mauve">{Math.round(communityEntry.percentOfDecks * 100)}% brewed</span>
          </div>
        )}
        {visibleFields.hypeGap && hypeGap !== null && hypeGap !== undefined && (
          <div className="flex items-center justify-between text-ctp-subtext1" title="Community brew rate minus this Champion's real tournament inclusion rate">
            <span>Hype gap</span>
            <span className={Math.abs(hypeGap) < 0.05 ? "text-ctp-subtext0" : hypeGap > 0 ? "text-ctp-mauve" : "text-ctp-blue"}>
              {hypeGap >= 0 ? "+" : ""}
              {Math.round(hypeGap * 100)} pts
            </span>
          </div>
        )}
        {visibleFields.metaTrend && decaySignal && (
          <div className="text-ctp-yellow" title="Real tournament inclusion trend for this card among decks of this Champion, most-recent 90 days vs. the prior 90">
            {Math.round((decaySignal.recentRate - decaySignal.priorRate) * 100)}% adoption / 90d
            {decaySignal.replacement && <span className="text-ctp-subtext0"> — possibly replaced by {decaySignal.replacement.cardName}</span>}
          </div>
        )}
        {simulatorEvidence && (
          <div className="text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental and not Champion-scoped">
            {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}
            {simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}
          </div>
        )}
        {visibleFields.simulatorDetail && simulatorEvidence && (
          <div className="space-y-0.5 border-t border-dashed border-ctp-surface1 pt-1 text-[11px] text-ctp-subtext0">
            <div className="flex justify-between"><span>Drawn</span><span>{Math.round(simulatorEvidence.avgDrawn * 100)}%</span></div>
            <div className="flex justify-between"><span>Materialized</span><span>{Math.round(simulatorEvidence.avgMaterialized * 100)}%</span></div>
            <div className="flex justify-between"><span>Discarded</span><span>{Math.round(simulatorEvidence.avgDiscarded * 100)}%</span></div>
            {simulatorEvidence.attackEvents > 0 && (
              <div className="flex justify-between"><span>Avg damage</span><span>{simulatorEvidence.avgDamageDealt.toFixed(1)} / atk</span></div>
            )}
            {simulatorEvidence.lethalHits > 0 && (
              <div className="flex justify-between"><span>Lethal hits</span><span>{simulatorEvidence.lethalHits}</span></div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t border-ctp-surface1 pt-4">
        {onAdd ? (
          <>
            <button
              type="button"
              onClick={onAdd}
              className="min-h-11 flex-1 rounded-lg bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base"
            >
              Add
            </button>
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="min-h-11 flex-1 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text">
                Dismiss
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleLock}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm ${card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}
            >
              {card.locked ? "Kept" : "Keep"}
            </button>
            <button type="button" onClick={onRemove} className="min-h-11 flex-1 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red">
              Remove
            </button>
          </>
        )}
      </div>
      </div>
      </div>}
    </div>
  );
}
