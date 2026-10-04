import DeckPrintingSheet from "./DeckPrintingSheet";
import PrintingChoices from "../PrintingChoices";
import PrintingSummary from "../PrintingSummary";
import { selectedMovePrintings } from "../../lib/deckEditing";
import type { CardPrintingAllocation } from "@gatcg/shared";
import Button from "../ui/Button";
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

export default function DeckEditorCard({ line, card, section, onChangeQuantity, onPrintings, onMove, onRemove, selected, onSelect, list = false, stats, format = "UNKNOWN" }: {
  format?: DeckFormat;
  stats?: ReactNode;
  line: OmnidexDecklistCardLine; card?: Card; section: DeckEditSection;
  onPrintings?: (printings: CardPrintingAllocation[]) => void;
  onChangeQuantity: (quantity: number, printings?: CardPrintingAllocation[]) => void; onMove: (destination: DeckEditSection, quantity: number, printings?: CardPrintingAllocation[]) => void;
  onRemove: () => void; selected?: boolean; onSelect?: () => void; list?: boolean;
}) {
  const [printingOpen, setPrintingOpen] = useState(false);
  const [reduceTo, setReduceTo] = useState<number | null>(null);
  const [movingPrintings, setMovingPrintings] = useState<CardPrintingAllocation[] | undefined>();
  const [open, setOpen] = useState(false);
  const destinations = EDITOR_SECTIONS.filter(item => item.key !== section && deckDestinationEligibility(card, item.key).allowed);
  const [destination, setDestination] = useState<DeckEditSection>(destinations[0]?.key ?? "maybeboard");
  const [moveQuantity, setMoveQuantity] = useState(line.quantity);
  const title = card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center break-words text-sm font-medium text-ctp-text underline decoration-ctp-surface1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-ctp-blue">{line.card}<span className="sr-only"> (card details in a new tab)</span></Link> : <p className="flex min-h-12 items-center break-words text-sm font-medium">{line.card}</p>;
  return <article className={`min-w-0 rounded-xl border bg-ctp-mantle p-2 ${selected ? "border-ctp-blue ring-2 ring-ctp-blue/30" : cardLegalityStatus(card, format) === "banned" ? "border-ctp-red/60" : "border-ctp-surface1"}`}>
    <div className={list ? "flex items-start gap-3" : ""}>
      <div className={list ? "w-20 shrink-0" : ""}><CardArtTile card={card} editionUuid={line.printings?.[0]?.editionUuid} name={line.card} /></div>
      <div className="min-w-0 flex-1">{title}<CardLegalityBadge card={card} format={format} /></div>
    </div>
    <div className={list ? "mt-2 max-w-sm" : "mt-2"}><QuantityControl stacked={!list} name={`${line.card} in ${section}`} quantity={line.quantity} min={0} onChange={quantity => quantity === 0 ? onRemove() : quantity < (line.printings ?? []).reduce((sum, p) => sum + p.quantity, 0) ? setReduceTo(quantity) : onChangeQuantity(quantity)} />
        <div className="mt-1 flex flex-wrap gap-1">
          <Button variant="secondary" disabled={!destinations.length} onClick={() => { setMoveQuantity(line.quantity); setMovingPrintings(line.printings); setDestination(destinations[0]?.key ?? "maybeboard"); setOpen(true); }} aria-label={`Move ${line.card} from ${section}`}>Move</Button>
          <Button variant="ghost" onClick={onRemove} aria-label={`Remove ${line.card} from ${section}`}>Remove</Button>
        </div>
    </div>
    <PrintingSummary line={line} card={card} />
    {onPrintings && <Button className="w-full" disabled={!card} onClick={() => setPrintingOpen(true)}>{line.printings?.length ? "Change printings" : "Choose printing"}</Button>}
    {!card && <p className="text-xs text-ctp-subtext1">Printing data unavailable.</p>}
    {card && (printingOpen || reduceTo !== null) && <DeckPrintingSheet card={card} line={reduceTo !== null ? { ...line, quantity: reduceTo } : line} onDismiss={() => { setPrintingOpen(false); setReduceTo(null); }} onApply={value => { if (reduceTo !== null) onChangeQuantity(reduceTo, value); else onPrintings?.(value); }} />}
    {stats && <div className="mt-2 border-t border-ctp-surface1 pt-2">{stats}</div>}
    {onSelect && <label className="flex min-h-12 items-center gap-2 px-2 text-xs"><input type="checkbox" checked={selected ?? false} onChange={onSelect} />Select {line.card}</label>}
    {open && <EditorDialog title={`Move ${line.card}`} doneLabel="Cancel" onDismiss={() => setOpen(false)} footer={<button type="button" disabled={selectedMovePrintings(line, Math.min(moveQuantity,line.quantity), movingPrintings) === null || !destinations.some(item=>item.key===destination)} onClick={()=>{onMove(destination,Math.min(moveQuantity,line.quantity), movingPrintings);setOpen(false);}} className="mt-3 min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base">Move {Math.min(moveQuantity,line.quantity)} {Math.min(moveQuantity,line.quantity)===1 ? "copy" : "copies"}</button>}>
      <p className="mb-3 text-sm">{line.quantity} {line.quantity === 1 ? "copy" : "copies"} in {EDITOR_SECTIONS.find(item=>item.key===section)?.title}.</p>
      <label className="block text-sm">Destination<select value={destination} onChange={event=>setDestination(event.target.value as DeckEditSection)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2">{destinations.map(item=><option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
      <p className="mb-2 mt-3 text-sm">Copies to move</p><QuantityControl name={`${line.card} to move`} quantity={Math.min(moveQuantity,line.quantity)} onChange={quantity => { setMoveQuantity(quantity); setMovingPrintings(selectedMovePrintings(line, quantity) ?? []); }} max={line.quantity} />
      {card && !!line.printings?.length && <><p className="mt-3 text-sm">Select the copies to move from this section.</p><PrintingChoices card={card} quantity={Math.min(moveQuantity,line.quantity)} value={movingPrintings ?? []} onChange={setMovingPrintings} /></>}
      {selectedMovePrintings(line, Math.min(moveQuantity,line.quantity), movingPrintings) === null && <p role="alert" className="text-sm text-ctp-red">Select copies that are present in this section, including enough identified copies.</p>}

    </EditorDialog>}
  </article>;
}
