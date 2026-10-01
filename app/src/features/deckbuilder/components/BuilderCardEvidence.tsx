import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CostIcon from "../../../components/CostIcon";
import { formatUsd } from "../../../lib/format";
import type { CardDecaySignal } from "../../../lib/cardDecay";
import type { SuggestedCard } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";
import type { PriceTrendEntry } from "../../pricing/usePriceTrendByName";
import type { computeCardPlayOdds } from "../cardPlayOdds";

/** Read-only evidence; card selection and quantity mutations stay in the feature controller. */
export default function BuilderCardEvidence({ card, cardInfo, unitPrice, priceTrend, communityEntry, hypeGap, decaySignal, simulatorEvidence, visibleFields, communityMode, playOdds }: {
  card: SuggestedCard; cardInfo?: Card; unitPrice?: number; priceTrend?: PriceTrendEntry;
  communityEntry?: CardInclusionEntry; hypeGap?: number | null; decaySignal?: CardDecaySignal;
  simulatorEvidence?: SimulatorCardEvidence; visibleFields: CardFieldVisibility; communityMode: boolean;
  playOdds: ReturnType<typeof computeCardPlayOdds> | null;
}) {
  return (
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
            Changed from {card.optimizedFrom}x – {card.quantityEvidence.source} evidence (n={card.quantityEvidence.sampleSize})
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
            {decaySignal.replacement && <span className="text-ctp-subtext0"> – possibly replaced by {decaySignal.replacement.cardName}</span>}
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

  );
}
