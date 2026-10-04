import { useState } from "react";
import EditorModeSwitch from "../../components/deck-editor/EditorModeSwitch";
import type { CardPrintingAllocation, Card, DeckFormat, OmnidexDecklistCardLine } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { InlineState } from "../../components/ui/ContentState";
import { MaybeboardCardTile, type DeckCardDestination } from "../../components/deck-editor/EditableDecklistGrid";

export default function MaybeboardPanel({ open, onOpenChange, format, editing, busy, maybeboardText, maybeboardLines, cardsByName, onMoveAll, onSave, onPrintings, onChangeQuantity, onMove, onRemove, onTextChange }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  format: DeckFormat; editing: boolean; busy: boolean; maybeboardText: string;
  maybeboardLines: OmnidexDecklistCardLine[]; cardsByName: Map<string, Card>;
  onMoveAll: () => void; onSave: () => void; onTextChange: (text: string) => void;
  onPrintings: (name: string, value: CardPrintingAllocation[]) => void;
  onChangeQuantity: (name: string, quantity: number, printings?: CardPrintingAllocation[]) => void;
  onMove: (line: OmnidexDecklistCardLine, destination: DeckCardDestination, quantity: number, printings?: CardPrintingAllocation[]) => void;
  onRemove: (name: string) => void;
}) {
  const [mode, setMode] = useState<"cards" | "text">("cards");
  return (
      <details open={open} onToggle={event => onOpenChange(event.currentTarget.open)} className="group mt-5 rounded-xl border border-dashed border-ctp-yellow/50 bg-ctp-yellow/5 p-3">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ctp-yellow [&::-webkit-details-marker]:hidden"><span>Maybeboard <span className="font-normal text-ctp-subtext0">({maybeboardLines.reduce((sum, line) => sum + line.quantity, 0)})</span></span><DisclosureChevron className="text-ctp-subtext0 transition-transform group-open:rotate-180" /></summary>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{editing && <span className="mr-auto text-xs text-ctp-subtext0">Maybeboard changes save with the deck.</span>}<button type="button" disabled={!maybeboardText.trim()} onClick={onMoveAll} className="min-h-12 rounded-lg border border-ctp-blue px-3 text-xs text-ctp-blue disabled:opacity-50">Move all to editor</button>{!editing && <button type="button" disabled={busy} onClick={() => onSave()} className="min-h-12 rounded-lg bg-ctp-yellow px-3 text-xs font-medium text-ctp-base disabled:opacity-50">Save</button>}</div>
        <EditorModeSwitch value={mode} onChange={setMode} label="Maybeboard editing mode" />
        {mode === "cards" && (maybeboardLines.length > 0 ? <div className="mt-3 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 min-[560px]:grid-cols-3 lg:grid-cols-4">{maybeboardLines.map((line) => <MaybeboardCardTile format={format} key={line.card} line={line} card={cardsByName.get(line.card)} onPrintings={value => onPrintings(line.card, value)} onChangeQuantity={(quantity, printings) => onChangeQuantity(line.card, quantity, printings)} onMove={(destination, quantity, printings) => onMove(line, destination, quantity, printings)} onRemove={() => onRemove(line.card)} />)}</div> : <InlineState className="mt-3">No cards in the maybeboard.</InlineState>)}
        {mode === "text" && <label className="mt-3 block text-sm">Maybeboard text<textarea rows={5} value={maybeboardText} onChange={(event) => onTextChange(event.target.value)} placeholder={"2x Card to test\n4x Another option"} aria-label="Maybeboard" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /></label>}
        <p className="mt-2 text-xs text-ctp-subtext0">Maybeboard cards do not affect the deck or its analysis.</p>
      </details>
  );
}
