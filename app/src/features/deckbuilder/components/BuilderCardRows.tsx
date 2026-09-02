import { Link } from "react-router-dom";
import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CardHoverPreview from "../../../components/CardHoverPreview";
import CostIcon from "../../../components/CostIcon";
import ElementIcon from "../../../components/ElementIcon";
import ElementRail from "../../../components/ElementRail";
import { formatUsd } from "../../../lib/format";
import type { RatingPillar } from "../../../lib/deckIdentity";
import type { SuggestedCard } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";

export function CardRow({
  card,
  onToggleLock,
  onRemove,
  onDismiss,
  onChangeQuantity,
  cardsByName,
  priceByName,
  showLockToggle = true,
  communityInclusion,
  communityMode = false,
  simulatorEvidence,
  visibleFields,
  needsReview = false,
}: {
  card: SuggestedCard;
  onToggleLock: () => void;
  onRemove: () => void;
  onDismiss?: () => void;
  /** User-choice quantities are editable; recommendation-owned quantities remain derived from the ranking. */
  onChangeQuantity?: (quantity: number) => void;
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  showLockToggle?: boolean;
  /** % of blended community decks (Shout At Your Decks + Sleeved, for this Champion) that include this card — a second, clearly-separate data point, never blended into adjustedLift. */
  communityInclusion?: Map<string, CardInclusionEntry>;
  /** True when `card` came from useCommunitySuggestedBuild — an unlocked card here was placed by
   * popularity, not chosen by the viewer, so the no-lift fallback badge shouldn't say "your choice". */
  communityMode?: boolean;
  /** Sample-gated Clarent telemetry for this card, only supplied in the experimental source. */
  simulatorEvidence?: SimulatorCardEvidence;
  /** Which optional data fields (Cost/Price/Win rate/Sample size/Community usage) to render — the viewer's own Customize panel preference. */
  visibleFields: CardFieldVisibility;
  /** Marks a placed card that has a data-backed cut recommendation in the Review tab. */
  needsReview?: boolean;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  const maxQuantity = Math.max(1, Math.min(cardInfo?.legality?.STANDARD?.limit ?? 4, 4));
  return (
    <li className={`relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border py-1 pl-3 pr-2 text-sm ${card.locked ? "border-ctp-blue/70 bg-ctp-blue/5" : "border-ctp-surface1"}`}>
      <ElementRail elements={cardInfo?.elements} />
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
          className="w-11 shrink-0 rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-right text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
        />
      ) : (
        <span
          className="w-6 shrink-0 text-right text-ctp-subtext0"
          title={card.optimizedFrom !== null ? `Quantity changed from ${card.optimizedFrom}x using ${card.quantityEvidence.source} evidence (n=${card.quantityEvidence.sampleSize})` : undefined}
        >
          {card.quantity}x{card.optimizedFrom !== null && <span className="text-ctp-blue">*</span>}
        </span>
      )}
      {cardInfo && cardInfo.element !== "NORM" && <ElementIcon element={cardInfo.element} size={14} />}
      <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={card.cardName}>
        {cardInfo ? (
          <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {card.cardName}
          </Link>
        ) : (
          <span className="text-ctp-text">{card.cardName}</span>
        )}
      </CardHoverPreview>
      {visibleFields.cost && cardInfo && cardInfo.cost.type !== "none" && cardInfo.cost.value !== null && (
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-ctp-subtext0">
          <CostIcon kind={cardInfo.cost.type} size={12} />
          {cardInfo.cost.value}
        </span>
      )}
      {visibleFields.price && unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
      {visibleFields.winRate && (card.adjustedLift !== null ? (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}%
        </span>
      ) : (
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
      ))}
      {visibleFields.sample && card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      {simulatorEvidence && <span className="text-xs text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental and not Champion-scoped">
        {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}{simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}
      </span>}
      {visibleFields.community && communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% brewed
        </span>
      )}
      {needsReview && <span className="rounded-full border border-ctp-yellow/60 bg-ctp-yellow/10 px-1.5 text-[10px] font-medium text-ctp-yellow">Review</span>}
      <div className="ml-auto flex shrink-0 gap-1.5">
        {showLockToggle && (
          <button
            type="button"
            onClick={onToggleLock}
            className={`rounded-md border px-2 py-1 text-xs ${
              card.locked ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {card.locked ? "Kept" : "Keep"}
          </button>
        )}
        <button type="button" onClick={onRemove} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-red">
          Remove
        </button>
        {onDismiss && <button type="button" onClick={onDismiss} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>}
      </div>
    </li>
  );
}

/** Not-yet-placed ranked cards ("cards that might help") — same info as CardRow but a single "Add" action instead of Lock/Remove, since these aren't in the build at all yet. */
export function DiaoMetricBadges({ card }: { card: SuggestedCard }) {
  const changes = Object.entries(card.diaoMetricChanges ?? {}) as [RatingPillar, number][];
  return changes
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([pillar, delta]) => (
      <span
        key={pillar}
        className={`rounded-full border px-1.5 text-[10px] font-medium ${delta > 0 ? "border-ctp-mauve/50 bg-ctp-mauve/10 text-ctp-mauve" : "border-ctp-yellow/50 bg-ctp-yellow/10 text-ctp-yellow"}`}
        title={`Projected ${pillar} pillar-point change from adding ${card.quantity}x ${card.cardName}; separate from observed win rate`}
      >
        {pillar[0].toUpperCase() + pillar.slice(1)} {delta > 0 ? "+" : ""}{delta.toFixed(2)}
      </span>
    ));
}

export function SuggestionRow({
  card,
  onAdd,
  onDismiss,
  cardsByName,
  priceByName,
  communityInclusion,
  simulatorEvidence,
  visibleFields,
}: {
  card: SuggestedCard;
  onAdd: () => void;
  onDismiss?: () => void;
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  communityInclusion?: Map<string, CardInclusionEntry>;
  simulatorEvidence?: SimulatorCardEvidence;
  /** Which optional data fields (Price/Win rate/Sample size/Community usage) to render — the viewer's own Customize panel preference. */
  visibleFields: CardFieldVisibility;
}) {
  const cardInfo = cardsByName.get(card.cardName);
  const unitPrice = priceByName.get(card.cardName);
  return (
    <li className="relative flex flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ctp-surface1 py-1 pl-3 pr-2 text-sm">
      <ElementRail elements={cardInfo?.elements} />
      <span
        className="w-6 shrink-0 text-right text-ctp-subtext0"
        title={card.optimizedFrom !== null ? `Quantity changed from ${card.optimizedFrom}x using ${card.quantityEvidence.source} evidence (n=${card.quantityEvidence.sampleSize})` : undefined}
      >
        {card.quantity}x{card.optimizedFrom !== null && <span className="text-ctp-blue">*</span>}
      </span>
      {cardInfo && cardInfo.element !== "NORM" && <ElementIcon element={cardInfo.element} size={14} />}
      <CardHoverPreview image={cardInfo?.editions[0]?.image} alt={card.cardName}>
        {cardInfo ? (
          <Link to={`/cards/${cardInfo.slug}`} className="text-ctp-text hover:text-ctp-blue">
            {card.cardName}
          </Link>
        ) : (
          <span className="text-ctp-text">{card.cardName}</span>
        )}
      </CardHoverPreview>
      {visibleFields.price && unitPrice !== undefined && <span className="shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)}</span>}
      {visibleFields.winRate && card.adjustedLift !== null && (
        <span className={`text-xs font-semibold ${card.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
          {card.adjustedLift >= 0 ? "+" : ""}
          {(card.adjustedLift * 100).toFixed(1)}%
        </span>
      )}
      {visibleFields.sample && card.sample && <span className="text-xs text-ctp-subtext0">({card.sample.with} vs {card.sample.without})</span>}
      {simulatorEvidence && <span className="text-xs text-ctp-mauve" title="Anonymous Clarent simulator telemetry; experimental and not Champion-scoped">
        {simulatorEvidence.games} sim game{simulatorEvidence.games === 1 ? "" : "s"}{simulatorEvidence.winRate === null ? "" : ` · ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}
      </span>}
      {visibleFields.community && communityInclusion?.get(card.cardName) && (
        <span className="text-xs text-ctp-mauve" title="Share of community decks for this Champion that include this card">
          {Math.round(communityInclusion.get(card.cardName)!.percentOfDecks * 100)}% brewed
        </span>
      )}
      {card.readinessReasons?.map((reason) => (
        <span key={reason} className="rounded-full border border-ctp-teal/50 bg-ctp-teal/10 px-1.5 text-[10px] font-medium text-ctp-teal" title="Deterministic synergy-readiness signal; separate from observed win rate">
          {reason}
        </span>
      ))}
      <DiaoMetricBadges card={card} />
      <div className="ml-auto flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
        >
          Add
        </button>
        {onDismiss && <button type="button" onClick={onDismiss} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">Dismiss</button>}
      </div>
    </li>
  );
}
