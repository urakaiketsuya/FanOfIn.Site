import type { Card, CardInclusionEntry } from "@gatcg/shared";
import CardResult from "../../../components/CardResult";
import DisclosureChevron from "../../../components/DisclosureChevron";
import Button from "../../../components/ui/Button";
import { formatUsd } from "../../../lib/format";
import type { SuggestedCard } from "../useSuggestedBuild";
import type { SimulatorCardEvidence } from "../useSimulatorSuggestedBuild";
import type { CardFieldVisibility } from "../useCardFieldVisibility";

export default function ReviewCardProposal({ card, cardInfo, intent, unitPrice, communityEntry, simulatorEvidence, visibleFields, onAccept, onDismiss }: {
  card: SuggestedCard; cardInfo?: Card; intent: "add" | "remove";
  unitPrice?: number; communityEntry?: CardInclusionEntry; simulatorEvidence?: SimulatorCardEvidence;
  visibleFields: CardFieldVisibility; onAccept: () => void; onDismiss: () => void;
}) {
  const adding = intent === "add";
  const copies = `${card.quantity} ${card.quantity === 1 ? "copy" : "copies"}`;
  const action = adding ? `Add ${copies}` : card.locked ? `Remove ${copies}` : "Exclude suggestion";
  const cascades = !adding && card.locked && cardInfo?.types.includes("CHAMPION") && !cardInfo.subtypes.includes("SPIRIT") && cardInfo.level != null;
  return <li className="identity-surface min-w-0 rounded-xl border border-ctp-surface1 p-3">
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3">
      <CardResult card={cardInfo} name={card.cardName} newTab />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{adding ? "Suggested addition" : "Suggested cut"}</p>
        <p className="mt-2 text-ctp-text"><strong className="text-3xl tabular-nums">{card.quantity}</strong> {card.quantity === 1 ? "copy" : "copies"}</p>
        <p className="text-sm capitalize text-ctp-subtext0">{card.section}</p>
        <p className="mt-3 text-sm text-ctp-subtext1">{adding ? "Accept this card into your working list." : card.locked ? "Review before removing this card from your working list." : "Exclude this recommendation from future suggestions."}</p>
        {visibleFields.price && unitPrice !== undefined && <p className="mt-2 text-xs text-ctp-subtext0">{formatUsd(unitPrice * card.quantity)} estimated for {copies}</p>}
      </div>
    </div>
    {card.readinessReasons?.map((reason) => <p key={reason} className="mt-2 text-xs text-ctp-teal">{reason}</p>)}
    {cascades && <p className="mt-3 text-sm text-ctp-yellow">Removing this Champion also removes higher selected levels of the same Champion.</p>}
    <details className="group mt-2 text-xs text-ctp-subtext0">
      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">Suggestion evidence<DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="space-y-2 pb-3">
        {visibleFields.winRate && <p>{card.adjustedLift === null ? "No verified performance lift for this card." : `${card.adjustedLift >= 0 ? "+" : ""}${(card.adjustedLift * 100).toFixed(1)}% observed lift`}</p>}
        {visibleFields.sample && card.sample && <p>Sample: {card.sample.with} with this card, {card.sample.without} without.</p>}
        {visibleFields.community && communityEntry && <p>{Math.round(communityEntry.percentOfDecks * 100)}% of community decks for this Champion include this card.</p>}
        {simulatorEvidence && <p>{simulatorEvidence.games} simulator games{simulatorEvidence.winRate === null ? "" : `, ${(simulatorEvidence.winRate * 100).toFixed(0)}% wins`}. Experimental anonymous telemetry, not scoped to this Champion.</p>}
        {card.optimizedFrom != null && <p>Suggested quantity changed from {card.optimizedFrom} using {card.quantityEvidence.source} evidence (sample {card.quantityEvidence.sampleSize}).</p>}
        <p>Source results do not predict the effect of this change on your deck.</p>
      </div>
    </details>
    <div className="flex flex-wrap gap-2 border-t border-ctp-surface1 pt-3">
      <Button variant={adding ? "primary" : "danger"} onClick={onAccept} aria-label={`${action}: ${card.cardName}`}>{action}</Button>
      <Button onClick={onDismiss}>{adding ? "Dismiss suggestion" : "Keep current cards"}</Button>
    </div>
    <p className="mt-2 text-xs text-ctp-subtext0">Save a version when your working list is ready.</p>
  </li>;
}
