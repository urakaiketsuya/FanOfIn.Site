import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../../../components/CardArtTile";
import DisclosureChevron from "../../../components/DisclosureChevron";
import Button from "../../../components/ui/Button";
import type { SuggestedCard } from "../useSuggestedBuild";

/** A proposal only: the feature controller owns acceptance and deck mutations. */
export default function ReviewSwapCard({ removal, addition, cardsByName, onApply, onDismiss }: {
  removal: SuggestedCard;
  addition: SuggestedCard;
  cardsByName: Map<string, Card>;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return <li className="identity-surface min-w-0 rounded-xl border border-ctp-surface1 p-4 shadow-sm">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Proposed change</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {[{ item: removal, label: "Remove from working list" }, { item: addition, label: "Set in working list" }].map(({ item, label }) => {
        const card = cardsByName.get(item.cardName);
        return <div key={label} className="flex min-w-0 items-start gap-3">
          <div className="w-24 shrink-0 sm:w-32"><CardArtTile card={card} name={item.cardName} /></div>
          <div className="min-w-0">
            <p className="text-xs text-ctp-subtext0">{label}</p>
            {card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`${item.cardName} (opens in a new tab)`} className="inline-flex min-h-control items-center break-words font-semibold text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{item.cardName}</Link> : <p className="break-words font-semibold text-ctp-text">{item.cardName}</p>}
            <p className="mt-1 text-ctp-text"><strong className="text-2xl tabular-nums">{item.quantity}</strong> <span className="text-sm">{item.quantity === 1 ? "copy" : "copies"}</span></p>
            <p className="text-xs capitalize text-ctp-subtext0">{item.section}</p>
          </div>
        </div>;
      })}
    </div>
    <p className="mt-4 text-sm text-ctp-subtext1">{removal.contextualReplacement ? `Suggested from ${removal.contextualReplacement.peerDecks} similar decks.` : "Pairs a card flagged for review with a ranked addition."} This is a suggestion, not a predicted improvement.</p>
    {addition.readinessReasons?.map((reason) => <p key={reason} className="mt-1 text-xs text-ctp-teal">{reason}</p>)}
    {removal.quantity !== addition.quantity && <p className="mt-2 text-sm text-ctp-subtext1">This swap uses different copy counts. Review your deck size after applying it.</p>}
    <details className="group mt-2 text-xs text-ctp-subtext0">
      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">Evidence for this suggestion<DisclosureChevron className="group-open:rotate-180" /></summary>
      <dl className="grid gap-2 py-2 sm:grid-cols-2">
        {[removal, addition].map((item) => <div key={item.cardName}><dt className="font-medium text-ctp-text">{item.cardName}</dt><dd>{item.adjustedLift === null ? "Limited performance evidence" : `${item.adjustedLift >= 0 ? "+" : ""}${(item.adjustedLift * 100).toFixed(1)}% observed lift`}</dd></div>)}
      </dl>
      <p className="pb-3">Observed results describe the source decks. They do not measure what this swap will do to your deck.</p>
    </details>
    <div className="mt-2 flex flex-wrap gap-2 border-t border-ctp-surface1 pt-3">
      <Button variant="primary" onClick={onApply} aria-label={`Apply swap: remove ${removal.cardName}, set ${addition.cardName} to ${addition.quantity} copies`}>Apply this swap</Button>
      <Button onClick={onDismiss}>Keep current cards</Button>
    </div>
    <p className="mt-2 text-xs text-ctp-subtext0">Updates your working list. Save a version when you are ready.</p>
  </li>;
}
