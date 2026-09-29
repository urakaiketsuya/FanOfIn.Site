import CardLegalityBadge from "./CardLegalityBadge";
import { cardLegalityStatus, type DeckFormat } from "@gatcg/shared";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardArtTile from "../CardArtTile";
import EditorDialog from "./EditorDialog";
import QuantityControl from "./QuantityControl";
import { deckDestinationEligibility } from "../../lib/deckSectionEligibility";
import { EDITOR_SECTIONS, type DeckEditSection } from "../../lib/deckEditing";

export default function DeckEditorCard({ line, card, section, onChangeQuantity, onMove, onRemove, selected, onSelect, list = false, stats, format = "UNKNOWN" }: {
  format?: DeckFormat;
  stats?: ReactNode;
  line: OmnidexDecklistCardLine; card?: Card; section: DeckEditSection;
  onChangeQuantity: (quantity: number) => void; onMove: (destination: DeckEditSection, quantity: number) => void;
  onRemove: () => void; selected?: boolean; onSelect?: () => void; list?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const destinations = EDITOR_SECTIONS.filter(item => item.key !== section && deckDestinationEligibility(card, item.key).allowed);
  const [destination, setDestination] = useState<DeckEditSection>(destinations[0]?.key ?? "maybeboard");
  const [moveQuantity, setMoveQuantity] = useState(line.quantity);
  const title = card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center break-words text-sm font-medium text-ctp-text underline decoration-ctp-surface1 underline-offset-4">{line.card}<span className="sr-only"> — card details in a new tab</span></Link> : <p className="flex min-h-12 items-center break-words text-sm font-medium">{line.card}</p>;
  return <article className={`min-w-0 rounded-xl border bg-ctp-mantle p-2 ${selected ? "border-ctp-blue ring-2 ring-ctp-blue/30" : cardLegalityStatus(card, format) === "banned" ? "border-ctp-red/60" : "border-ctp-surface1"}`}>
    <div className={list ? "flex items-start gap-3" : ""}>
      <div className={list ? "w-14 shrink-0" : ""}><CardArtTile card={card} name={line.card} /></div>
      <div className="min-w-0 flex-1">{title}<CardLegalityBadge card={card} format={format} />{stats}<QuantityControl stacked={!list} name={`${line.card} in ${section}`} quantity={line.quantity} min={0} onChange={quantity => quantity === 0 ? onRemove() : onChangeQuantity(quantity)} />
        <div className="mt-1 flex flex-wrap gap-1">
          <button type="button" disabled={!destinations.length} onClick={() => { setMoveQuantity(line.quantity); setDestination(destinations[0]?.key ?? "maybeboard"); setOpen(true); }} aria-label={`Move ${line.card} from ${section}`} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Move</button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${line.card} from ${section}`} className="min-h-12 rounded-lg px-3 text-sm text-ctp-subtext1">Remove</button>
        </div>
      </div>
    </div>
    {onSelect && <label className="flex min-h-12 items-center gap-2 px-2 text-xs"><input type="checkbox" checked={selected ?? false} onChange={onSelect} />Select {line.card}</label>}
    {open && <EditorDialog title={`Move ${line.card}`} doneLabel="Cancel" onDismiss={() => setOpen(false)}>
      <p className="mb-3 text-sm">{line.quantity} {line.quantity === 1 ? "copy" : "copies"} in {EDITOR_SECTIONS.find(item=>item.key===section)?.title}.</p>
      <label className="block text-sm">Destination<select value={destination} onChange={event=>setDestination(event.target.value as DeckEditSection)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2">{destinations.map(item=><option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
      <p className="mb-2 mt-3 text-sm">Copies to move</p><QuantityControl name={`${line.card} to move`} quantity={Math.min(moveQuantity,line.quantity)} onChange={setMoveQuantity} max={line.quantity} />
      <button type="button" disabled={!destinations.some(item=>item.key===destination)} onClick={()=>{onMove(destination,Math.min(moveQuantity,line.quantity));setOpen(false);}} className="mt-3 min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base">Move {Math.min(moveQuantity,line.quantity)} {Math.min(moveQuantity,line.quantity)===1 ? "copy" : "copies"}</button>
    </EditorDialog>}
  </article>;
}
