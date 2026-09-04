import { Link } from "react-router-dom";
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
import { DiaoMetricBadges } from "./BuilderCardRows";

type BuilderSection = "main" | "material" | "sideboard";

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
}) {
  const maxQuantity = Math.max(1, Math.min(cardInfo?.legality?.STANDARD?.limit ?? 4, 4));
  const tags = [...(cardInfo?.elements.filter((e) => e !== "NORM") ?? []), ...(cardInfo?.classes ?? [])];

  return (
    <div className={`overflow-hidden rounded-lg border ${card.locked ? "border-ctp-blue/70 bg-ctp-blue/5" : "border-ctp-surface1"}`}>
      <div className="relative aspect-[5/7] bg-ctp-surface0">
        <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={card.cardName}>
          {cardInfo ? (
            <Link to={`/cards/${cardInfo.slug}`} title={card.cardName} className="block h-full w-full">
              {cardInfo.editions[0] ? (
                <CardImage image={cardInfo.editions[0].image} alt={card.cardName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{card.cardName}</span>
              )}
            </Link>
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{card.cardName}</span>
          )}
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

      <div className="space-y-1 p-2 text-xs">
        {visibleFields.cost && cardInfo && cardInfo.cost.type !== "none" && cardInfo.cost.value !== null && (
          <div className="flex items-center justify-between text-ctp-subtext1">
            <span>Cost</span>
            <span className="flex items-center gap-0.5 text-ctp-text">
              <CostIcon kind={cardInfo.cost.type} size={12} />
              {cardInfo.cost.value}
            </span>
          </div>
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
        {((card.readinessReasons?.length ?? 0) > 0 || card.diaoMetricChanges) && (
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
            <DiaoMetricBadges card={card} />
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

      <div className="flex border-t border-ctp-surface1">
        {onAdd ? (
          <>
            <button
              type="button"
              onClick={onAdd}
              className={`flex-1 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-blue ${onDismiss ? "border-r border-ctp-surface1" : ""}`}
            >
              Add
            </button>
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="flex-1 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">
                Dismiss
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleLock}
              className={`flex-1 border-r border-ctp-surface1 py-1.5 text-xs ${card.locked ? "text-ctp-blue" : "text-ctp-subtext1 hover:text-ctp-text"}`}
            >
              {card.locked ? "Kept" : "Keep"}
            </button>
            <button type="button" onClick={onRemove} className="flex-1 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-red">
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Full-image 2-column alternative to CardRow's text list, for the Build tab's Material/Main/Sideboard sections. One instance covers a single section — pass `section` so lock/remove calls land in the right place. */
export default function BuilderCardGrid({
  section,
  cards,
  cardsByName,
  priceByName,
  priceTrendByName,
  communityInclusion,
  hypeGapByName,
  decayByName,
  simulatorEvidenceByName,
  visibleFields,
  communityMode = false,
  reviewRemovalNames,
  onToggleLock,
  onChangeQuantity,
  onRemove,
}: {
  section: BuilderSection;
  cards: SuggestedCard[];
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  priceTrendByName?: Map<string, PriceTrendEntry>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  hypeGapByName?: Map<string, number>;
  decayByName?: Map<string, CardDecaySignal>;
  simulatorEvidenceByName?: Map<string, SimulatorCardEvidence>;
  visibleFields: CardFieldVisibility;
  communityMode?: boolean;
  reviewRemovalNames?: Set<string>;
  onToggleLock: (cardName: string, quantity: number, section: BuilderSection) => void;
  onChangeQuantity?: (cardName: string, quantity: number) => void;
  onRemove: (cardName: string, locked: boolean) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <CardTile
          key={card.cardName}
          card={card}
          cardInfo={cardsByName.get(card.cardName)}
          unitPrice={priceByName.get(card.cardName)}
          priceTrend={priceTrendByName?.get(card.cardName)}
          communityEntry={communityInclusion?.get(card.cardName)}
          hypeGap={hypeGapByName?.get(card.cardName)}
          decaySignal={decayByName?.get(card.cardName)}
          simulatorEvidence={simulatorEvidenceByName?.get(card.cardName)}
          visibleFields={visibleFields}
          communityMode={communityMode}
          needsReview={reviewRemovalNames?.has(card.cardName) ?? false}
          onToggleLock={() => onToggleLock(card.cardName, card.quantity, section)}
          onChangeQuantity={onChangeQuantity ? (quantity) => onChangeQuantity(card.cardName, quantity) : undefined}
          onRemove={() => onRemove(card.cardName, card.locked)}
        />
      ))}
    </div>
  );
}

/** Same full-image tile as `BuilderCardGrid`, for not-yet-placed cards — an Add/Dismiss footer instead of Keep/Remove, and no section/lock/quantity concerns since these cards aren't in the build. Used by the Review tab's "Suggested additions" grid view. */
export function BuilderSuggestionGrid({
  cards,
  cardsByName,
  priceByName,
  communityInclusion,
  simulatorEvidenceByName,
  visibleFields,
  onAdd,
  onDismiss,
}: {
  cards: SuggestedCard[];
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  simulatorEvidenceByName?: Map<string, SimulatorCardEvidence>;
  visibleFields: CardFieldVisibility;
  onAdd: (card: SuggestedCard) => void;
  onDismiss: (cardName: string) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <CardTile
          key={card.cardName}
          card={card}
          cardInfo={cardsByName.get(card.cardName)}
          unitPrice={priceByName.get(card.cardName)}
          priceTrend={undefined}
          communityEntry={communityInclusion?.get(card.cardName)}
          hypeGap={undefined}
          decaySignal={undefined}
          simulatorEvidence={simulatorEvidenceByName?.get(card.cardName)}
          visibleFields={visibleFields}
          communityMode={false}
          needsReview={false}
          onAdd={() => onAdd(card)}
          onDismiss={() => onDismiss(card.cardName)}
        />
      ))}
    </div>
  );
}
