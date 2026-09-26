import { useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardImage from "../CardImage";
import EditorDialog from "./EditorDialog";
import QuantityControl from "./QuantityControl";
import { deckDestinationEligibility } from "../../lib/deckSectionEligibility";
import { EDITOR_SECTIONS, type DeckEditSection } from "../../lib/deckEditing";



export default function DeckEditorCard({ line, card, section, onChangeQuantity, onMove, onRemove, selected, onSelect, list = false }: {
  line: OmnidexDecklistCardLine; card?: Card; section: DeckEditSection;
  onChangeQuantity: (quantity: number) => void;
  onMove: (destination: DeckEditSection, quantity: number) => void;
  onRemove: () => void; selected?: boolean; onSelect?: () => void; list?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quantityOpen, setQuantityOpen] = useState(false);
  const [destination, setDestination] = useState<DeckEditSection>(section === "maybeboard" ? "sideboard" : "maybeboard");
  const [moveQuantity, setMoveQuantity] = useState(line.quantity);
  function showDetails() { setMoveQuantity(line.quantity); setOpen(true); }
  return <article className={`relative overflow-hidden rounded-xl border bg-ctp-mantle ${selected ? "border-ctp-blue ring-2 ring-ctp-blue/30" : "border-ctp-surface1"}`}>
    <button type="button" aria-label={`View ${line.card} details`} onClick={showDetails} className={list ? "min-h-12 w-full px-3 pr-16 text-left text-sm" : "block aspect-[5/7] w-full text-left"}>
      {!list && card?.editions[0]?.image ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /> : <span className="block p-2">{line.card}</span>}
    </button>
    <button type="button" aria-label={`Set quantity of ${line.card} in ${section}`} aria-expanded={quantityOpen} onClick={() => setQuantityOpen((value) => !value)} className="absolute right-1 top-1 min-h-12 min-w-12 rounded-lg border border-ctp-surface1 bg-ctp-base/95 px-2 text-sm font-semibold">{line.quantity}×</button>
    {quantityOpen && <QuantityControl name={`${line.card} in ${section}`} quantity={line.quantity} onChange={onChangeQuantity} />}
    {onSelect && <label className="flex min-h-12 items-center gap-2 px-2 text-xs"><input type="checkbox" checked={selected ?? false} onChange={onSelect} className="size-5" />Select {line.card}</label>}
    {open && <EditorDialog title={line.card} doneLabel="Done" onDismiss={() => setOpen(false)}>
      {card?.editions[0]?.image && <CardImage image={card.editions[0].image} alt={line.card} className="mx-auto mb-4 w-44 rounded-lg" />}
      {card && <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="mb-3 flex min-h-12 items-center text-sm text-ctp-blue">Open full card details ↗</Link>}
      <p className="mb-2 text-sm">Copies in {section}</p>
      <QuantityControl name={`${line.card} in ${section}`} quantity={line.quantity} onChange={onChangeQuantity} />
      <details className="mt-4 rounded-lg border border-ctp-surface1 p-3"><summary className="min-h-12 cursor-pointer content-center text-sm">Move copies</summary>
        <label className="block text-sm">Destination<select value={destination} onChange={(event) => setDestination(event.target.value as DeckEditSection)} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2">{EDITOR_SECTIONS.filter((item) => item.key !== section).map((item) => { const eligibility = deckDestinationEligibility(card, item.key); return <option key={item.key} value={item.key} disabled={!eligibility.allowed}>{item.title}{eligibility.allowed ? "" : ` — ${eligibility.reason}`}</option>; })}</select></label>
        <p className="mb-2 mt-3 text-sm">Copies to move</p><QuantityControl name={`${line.card} to move`} quantity={Math.min(moveQuantity, line.quantity)} onChange={setMoveQuantity} max={line.quantity} />
        <button type="button" onClick={() => { onMove(destination, Math.min(moveQuantity, line.quantity)); setOpen(false); }} className="mt-3 min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base">Move {Math.min(moveQuantity, line.quantity)} {Math.min(moveQuantity, line.quantity) === 1 ? "copy" : "copies"}</button>
      </details>
      <button type="button" onClick={() => { onRemove(); setOpen(false); }} className="mt-4 min-h-12 rounded-lg border border-ctp-red/40 px-4 text-sm text-ctp-red">Remove {line.card}</button>
    </EditorDialog>}
  </article>;
}
