import { useMemo, useState, useTransition } from "react";
import DialogSheet from "../../../components/ui/DialogSheet";
import SwapImpactReport from "../../analytics/SwapImpactReport";
import { reviewSwapPreview } from "../model/reviewSwapPreview";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardArtTile from "../../../components/CardArtTile";
import Button from "../../../components/ui/Button";
import type { SuggestedCard } from "../useSuggestedBuild";

/** A proposal only: the feature controller owns acceptance and deck mutations. */
export default function ReviewSwapCard({ decklist, removal, addition, cardsByName, onApply, onDismiss }: {
  decklist: OmnidexDecklist;
  removal: SuggestedCard;
  addition: SuggestedCard;
  cardsByName: Map<string, Card>;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const preview = useMemo(() => reviewSwapPreview(decklist, removal, addition), [decklist, removal, addition]);
  const named = (list: OmnidexDecklist) => ({ main: list.main.map(line => ({ name: line.card, quantity: line.quantity })), material: list.material.map(line => ({ name: line.card, quantity: line.quantity })) });
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
    <div className="mt-2 flex flex-wrap gap-2 border-t border-ctp-surface1 pt-3">
      <Button onClick={() => startTransition(() => setOpen(true))} aria-busy={pending}>Compare results</Button>
      <Button variant="primary" onClick={onApply} aria-label={`Apply swap: remove ${removal.cardName}, set ${addition.cardName} to ${addition.quantity} copies`}>Apply this swap</Button>
      <Button onClick={onDismiss}>Keep current cards</Button>
    </div>
    {open && <DialogSheet title="Swap impact" onDismiss={() => setOpen(false)} footer={<Button variant="primary" onClick={() => { onApply(); setOpen(false); }}>Apply this swap</Button>}>
      <SwapImpactReport baseline={named(decklist)} target={named(preview)} cardsByName={cardsByName} />
    </DialogSheet>}
  </li>;
}
