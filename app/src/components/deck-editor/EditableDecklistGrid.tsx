import DeckLegalityWarning from "./DeckLegalityWarning";
import type { DeckFormat } from "@gatcg/shared";
import DeckEditorCard from "./DeckEditorCard";
import DisclosureChevron from "../DisclosureChevron";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { useEffect, useState } from "react";
import { deckDestinationEligibility } from "../../lib/deckSectionEligibility";

export type DeckSectionKey = keyof OmnidexDecklist;
export type DeckCardDestination = DeckSectionKey | "maybeboard";

const EDIT_SECTIONS: { key: DeckSectionKey; title: string }[] = [
  { key: "main", title: "Main" },
  { key: "material", title: "Material" },
  { key: "sideboard", title: "Sideboard" },
];

const MOVE_DESTINATIONS: { key: DeckCardDestination; title: string }[] = [
  { key: "main", title: "Main Deck" },
  { key: "material", title: "Material Deck" },
  { key: "sideboard", title: "Sideboard" },
  { key: "maybeboard", title: "Maybeboard" },
];

function DestinationOptions({ cards }: { cards: (Card | undefined)[] }) {
  return MOVE_DESTINATIONS.map((destination) => {
    const blocked = cards.map((card) => deckDestinationEligibility(card, destination.key)).filter((result) => !result.allowed);
    const reason = blocked[0]?.reason;
    const suffix = reason ? cards.length > 1 ? ` – unavailable for ${blocked.length} selected` : ` – ${reason}` : "";
    return <option key={destination.key} value={destination.key} disabled={blocked.length > 0}>{destination.title}{suffix}</option>;
  });
}

export function MaybeboardCardTile({ format, line, card, onChangeQuantity, onMove, onRemove }: { format: DeckFormat; line: OmnidexDecklistCardLine; card: Card | undefined; onChangeQuantity: (quantity: number) => void; onMove: (destination: DeckCardDestination, quantity: number) => void; onRemove: () => void }) {
  return <DeckEditorCard format={format} line={line} card={card} section="maybeboard" onChangeQuantity={onChangeQuantity} onMove={onMove} onRemove={onRemove} />;
}

type SelectedCard = { section: DeckSectionKey; name: string };

export function EditableDecklistGrid({ format, decklist, cardsByName, onChangeQuantity, onAdjustSelected, onSetSelected, onMoveSelected, onRemoveSelected, onMove, onRemove }: { format: DeckFormat; decklist: OmnidexDecklist; cardsByName: Map<string, Card>; onChangeQuantity: (section: DeckSectionKey, name: string, quantity: number) => void; onAdjustSelected: (cards: SelectedCard[], delta: number) => void; onSetSelected: (cards: SelectedCard[], quantity: number) => void; onMoveSelected: (cards: SelectedCard[], destination: DeckCardDestination) => void; onRemoveSelected: (cards: SelectedCard[]) => void; onMove: (from: DeckSectionKey, to: DeckCardDestination, name: string, quantity: number) => void; onRemove: (section: DeckSectionKey, name: string) => void }) {
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const sections = EDIT_SECTIONS.map((section) => ({ ...section, lines: decklist[section.key] })).filter((section) => section.lines.length > 0);
  const keyFor = (section: DeckSectionKey, name: string) => `${section}\u0000${name}`;
  const selectedCards = sections.flatMap((section) => section.lines.filter((line) => selected.has(keyFor(section.key, line.card))).map((line) => ({ section: section.key, name: line.card })));
  useEffect(() => {
    const availableKeys = new Set(EDIT_SECTIONS.flatMap((section) => decklist[section.key].map((line) => keyFor(section.key, line.card))));
    setSelected((current) => new Set([...current].filter((key) => availableKeys.has(key))));
  }, [decklist]);
  if (sections.length === 0) return <p className="text-sm text-ctp-subtext1">No cards yet. Search above to begin building.</p>;
  return <div className="space-y-5"><DeckLegalityWarning deck={decklist} catalog={cardsByName} format={format} />
    <details onToggle={(event) => setBulkMode(event.currentTarget.open)}><summary className="min-h-12 cursor-pointer content-center text-sm text-ctp-subtext1">Bulk edits</summary><div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-ctp-blue/40 bg-ctp-base/95 p-2.5 shadow-lg backdrop-blur">
      <span className="mr-auto text-xs text-ctp-subtext1">{selectedCards.length ? `${selectedCards.length} card${selectedCards.length === 1 ? "" : "s"} selected` : "Select cards for bulk actions"}</span>
      {selectedCards.length > 0 && <button type="button" onClick={() => setSelected(new Set())} className="min-h-12 rounded-lg px-2.5 text-xs text-ctp-subtext1">Clear</button>}
      <button type="button" disabled={selectedCards.length === 0} onClick={() => onAdjustSelected(selectedCards, -1)} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm font-medium text-ctp-text disabled:opacity-40">−1 each</button>
      <button type="button" disabled={selectedCards.length === 0} onClick={() => onAdjustSelected(selectedCards, 1)} className="min-h-12 rounded-lg bg-ctp-blue px-3 text-sm font-medium text-ctp-base disabled:opacity-40">+1 each</button>
      <details className="relative">
        <summary className="flex min-h-12 cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-subtext1 [&::-webkit-details-marker]:hidden">More <DisclosureChevron className="ml-1" /></summary>
        <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 shadow-xl">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Selection</p>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelected(new Set(sections.flatMap((section) => section.lines.map((line) => keyFor(section.key, line.card)))))} className="min-h-12 rounded-lg border border-ctp-surface1 px-2 text-xs">Select all</button><button type="button" onClick={() => setSelected(new Set(sections.flatMap((section) => section.lines.filter((line) => line.quantity < Math.max(1, Math.min(cardsByName.get(line.card)?.legality?.[format]?.limit ?? 4, 4))).map((line) => keyFor(section.key, line.card)))))} className="min-h-12 rounded-lg border border-ctp-surface1 px-2 text-xs">Below limit</button></div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Set copies</p>
          <div className="mt-2 grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((quantity) => <button key={quantity} type="button" disabled={selectedCards.length === 0} onClick={() => onSetSelected(selectedCards, quantity)} className="min-h-12 rounded-lg border border-ctp-surface1 text-sm disabled:opacity-40">{quantity}</button>)}</div>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Move selected<select disabled={selectedCards.length === 0} defaultValue="" onChange={(event) => { if (event.target.value) { onMoveSelected(selectedCards, event.target.value as DeckCardDestination); event.target.value = ""; } }} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs font-normal normal-case text-ctp-text disabled:opacity-40"><option value="">Choose section…</option><DestinationOptions cards={selectedCards.map((selectedCard) => cardsByName.get(selectedCard.name))} /></select></label>
          <button type="button" disabled={selectedCards.length === 0} onClick={() => { if (window.confirm(`Remove ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}?`)) { onRemoveSelected(selectedCards); setSelected(new Set()); } }} className="mt-3 min-h-12 w-full rounded-lg border border-ctp-red/50 text-xs text-ctp-red disabled:opacity-40">Remove selected</button>
        </div>
      </details>
    </div></details>
    {sections.map((section) => <details key={section.key} open className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:p-4">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ctp-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40 [&::-webkit-details-marker]:hidden"><span>{section.title} Deck</span><span className="flex items-center gap-2"><span className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-xs font-normal text-ctp-subtext1">{section.lines.reduce((total, line) => total + line.quantity, 0)} cards</span><DisclosureChevron className="text-ctp-subtext0 group-open:rotate-180" /></span></summary>
    <div className="mt-3 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 min-[560px]:grid-cols-3 lg:grid-cols-4">{section.lines.map((line) => { const selectionKey = keyFor(section.key, line.card); return <DeckEditorCard format={format} key={line.card} line={line} card={cardsByName.get(line.card)} section={section.key} selected={selected.has(selectionKey)} onSelect={bulkMode ? () => setSelected((current) => { const next = new Set(current); if (next.has(selectionKey)) next.delete(selectionKey); else next.add(selectionKey); return next; }) : undefined} onChangeQuantity={(quantity) => onChangeQuantity(section.key, line.card, quantity)} onMove={(destination, quantity) => onMove(section.key, destination, line.card, quantity)} onRemove={() => onRemove(section.key, line.card)} />; })}</div>
  </details>)}</div>;
}

export { EDIT_SECTIONS };
