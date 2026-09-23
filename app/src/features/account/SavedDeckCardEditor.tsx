import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";

export type DeckSectionKey = keyof OmnidexDecklist;

const EDIT_SECTIONS: { key: DeckSectionKey; title: string }[] = [
  { key: "main", title: "Main" },
  { key: "material", title: "Material" },
  { key: "sideboard", title: "Sideboard" },
];

function EditableCardTile({ line, card, section, selected, onSelect, onChangeQuantity, onMove, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; section: DeckSectionKey; selected: boolean; onSelect: () => void; onChangeQuantity: (quantity: number) => void; onMove: (section: DeckSectionKey) => void; onRemove: () => void }) {
  const maxQuantity = Math.max(1, Math.min(card?.legality?.STANDARD?.limit ?? 4, 4));
  return <article aria-label={`${line.quantity} copies of ${line.card} in ${section}`} className={`overflow-hidden rounded-xl border bg-ctp-mantle shadow-sm transition-[border-color,box-shadow] ${selected ? "border-ctp-blue ring-2 ring-ctp-blue/40" : "border-ctp-surface1"}`}>
    <div className="relative aspect-[5/7] bg-ctp-surface0">
      <CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>
        <button type="button" aria-pressed={selected} aria-label={`${selected ? "Deselect" : "Select"} ${line.card} for quick actions`} onClick={onSelect} className="block h-full w-full text-left">
          {card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}
        </button>
      </CardHoverPreview>
      <span className={`pointer-events-none absolute left-1.5 top-1.5 rounded-full px-2 py-1 text-[10px] font-semibold shadow ${selected ? "bg-ctp-blue text-ctp-base" : "bg-ctp-base/90 text-ctp-subtext1"}`}>{selected ? "Selected ✓" : "Tap to select"}</span>
    </div>
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] border-t border-ctp-surface1">
      <button type="button" disabled={line.quantity <= 1} onClick={() => onChangeQuantity(line.quantity - 1)} aria-label={`Remove one copy of ${line.card}`} className="min-h-11 border-r border-ctp-surface1 text-lg text-ctp-subtext1 hover:bg-ctp-surface0 disabled:opacity-30">−</button>
      <input type="number" inputMode="numeric" min={1} max={maxQuantity} value={line.quantity} aria-label={`Copies of ${line.card}`} onFocus={(event) => event.currentTarget.select()} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1) onChangeQuantity(Math.min(next, maxQuantity)); }} className="min-w-0 bg-ctp-base px-1 text-center text-sm font-semibold tabular-nums text-ctp-text focus:outline-none" />
      <button type="button" disabled={line.quantity >= maxQuantity} onClick={() => onChangeQuantity(line.quantity + 1)} aria-label={`Add one copy of ${line.card}`} className="min-h-11 border-l border-ctp-surface1 text-lg text-ctp-subtext1 hover:bg-ctp-surface0 disabled:opacity-30">+</button>
    </div>
    <div className="space-y-2 border-t border-ctp-surface1 p-2.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Move card to<select value={section} onChange={(event) => onMove(event.target.value as DeckSectionKey)} aria-label={`Move ${line.card} to deck section`} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm font-medium normal-case tracking-normal text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40"><option value="main">Main Deck</option><option value="material">Material Deck</option><option value="sideboard">Sideboard</option></select></label>
      <div className="grid grid-cols-2 gap-2">
        {card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`Open details for ${line.card} in a new tab`} className="flex min-h-11 items-center justify-center rounded-lg border border-ctp-surface1 px-3 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40">Card details ↗</Link> : <span />}
        <button type="button" onClick={onRemove} className="min-h-11 rounded-lg border border-ctp-red/40 px-3 text-xs font-medium text-ctp-red hover:bg-ctp-red/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-red/40" aria-label={`Remove ${line.card}`}>Remove</button>
      </div>
    </div>
  </article>;
}

export function MaybeboardCardTile({ line, card, onChangeQuantity, onMove, onRemove }: { line: OmnidexDecklistCardLine; card: Card | undefined; onChangeQuantity: (quantity: number) => void; onMove: () => void; onRemove: () => void }) {
  const maxQuantity = Math.max(1, Math.min(card?.legality?.STANDARD?.limit ?? 4, 4));
  return <div className="overflow-hidden rounded-lg border border-ctp-yellow/40 bg-ctp-mantle">
    <div className="relative aspect-[5/7] bg-ctp-surface0"><CardHoverPreview image={card?.editions[0]?.image} alt={line.card}>{card?.editions[0] ? <Link to={`/cards/${card.slug}`} className="block h-full w-full"><CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /></Link> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-ctp-subtext0">{line.card}</span>}</CardHoverPreview><input type="number" min={1} max={maxQuantity} value={line.quantity} aria-label={`Maybeboard copies of ${line.card}`} onChange={(event) => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1) onChangeQuantity(Math.min(quantity, maxQuantity)); }} className="absolute right-1.5 top-1.5 w-11 rounded border border-ctp-surface1 bg-ctp-base/90 px-1 py-0.5 text-right text-xs text-ctp-text" /></div>
    <div className="grid grid-cols-[1fr_auto] border-t border-ctp-surface1"><button type="button" onClick={onMove} className="min-h-10 px-2 text-left text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Move to editor</button><button type="button" onClick={onRemove} aria-label={`Remove ${line.card} from maybeboard`} className="min-h-10 min-w-10 border-l border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-red/10 hover:text-ctp-red">×</button></div>
  </div>;
}

type SelectedCard = { section: DeckSectionKey; name: string };

export function EditableDecklistGrid({ decklist, cardsByName, onChangeQuantity, onAdjustSelected, onSetSelected, onMoveSelected, onRemoveSelected, onMove, onRemove }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; onChangeQuantity: (section: DeckSectionKey, name: string, quantity: number) => void; onAdjustSelected: (cards: SelectedCard[], delta: number) => void; onSetSelected: (cards: SelectedCard[], quantity: number) => void; onMoveSelected: (cards: SelectedCard[], destination: DeckSectionKey) => void; onRemoveSelected: (cards: SelectedCard[]) => void; onMove: (from: DeckSectionKey, to: DeckSectionKey, name: string) => void; onRemove: (section: DeckSectionKey, name: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const sections = EDIT_SECTIONS.map((section) => ({ ...section, lines: decklist[section.key] })).filter((section) => section.lines.length > 0);
  const keyFor = (section: DeckSectionKey, name: string) => `${section}\u0000${name}`;
  const selectedCards = sections.flatMap((section) => section.lines.filter((line) => selected.has(keyFor(section.key, line.card))).map((line) => ({ section: section.key, name: line.card })));
  useEffect(() => {
    const availableKeys = new Set(EDIT_SECTIONS.flatMap((section) => decklist[section.key].map((line) => keyFor(section.key, line.card))));
    setSelected((current) => new Set([...current].filter((key) => availableKeys.has(key))));
  }, [decklist]);
  if (sections.length === 0) return <p className="text-sm text-ctp-subtext1">No cards yet. Search above to begin building.</p>;
  return <div className="space-y-5">
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-ctp-blue/40 bg-ctp-base/95 p-2.5 shadow-lg backdrop-blur">
      <span className="mr-auto text-xs text-ctp-subtext1">{selectedCards.length ? `${selectedCards.length} card${selectedCards.length === 1 ? "" : "s"} selected` : "Tap card images to select several"}</span>
      {selectedCards.length > 0 && <button type="button" onClick={() => setSelected(new Set())} className="min-h-10 rounded-lg px-2.5 text-xs text-ctp-subtext1">Clear</button>}
      <button type="button" disabled={selectedCards.length === 0} onClick={() => onAdjustSelected(selectedCards, -1)} className="min-h-10 rounded-lg border border-ctp-surface1 px-3 text-sm font-medium text-ctp-text disabled:opacity-40">−1 each</button>
      <button type="button" disabled={selectedCards.length === 0} onClick={() => onAdjustSelected(selectedCards, 1)} className="min-h-10 rounded-lg bg-ctp-blue px-3 text-sm font-medium text-ctp-base disabled:opacity-40">+1 each</button>
      <details className="relative">
        <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-3 text-sm text-ctp-subtext1 [&::-webkit-details-marker]:hidden">More ▾</summary>
        <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 shadow-xl">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Selection</p>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelected(new Set(sections.flatMap((section) => section.lines.map((line) => keyFor(section.key, line.card)))))} className="min-h-10 rounded-lg border border-ctp-surface1 px-2 text-xs">Select all</button><button type="button" onClick={() => setSelected(new Set(sections.flatMap((section) => section.lines.filter((line) => line.quantity < Math.max(1, Math.min(cardsByName.get(line.card)?.legality?.STANDARD?.limit ?? 4, 4))).map((line) => keyFor(section.key, line.card)))))} className="min-h-10 rounded-lg border border-ctp-surface1 px-2 text-xs">Below limit</button></div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Set copies</p>
          <div className="mt-2 grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((quantity) => <button key={quantity} type="button" disabled={selectedCards.length === 0} onClick={() => onSetSelected(selectedCards, quantity)} className="min-h-10 rounded-lg border border-ctp-surface1 text-sm disabled:opacity-40">{quantity}</button>)}</div>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Move selected<select disabled={selectedCards.length === 0} defaultValue="" onChange={(event) => { if (event.target.value) { onMoveSelected(selectedCards, event.target.value as DeckSectionKey); event.target.value = ""; } }} className="mt-1 min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs font-normal normal-case text-ctp-text disabled:opacity-40"><option value="">Choose section…</option><option value="main">Main</option><option value="material">Material</option><option value="sideboard">Sideboard</option></select></label>
          <button type="button" disabled={selectedCards.length === 0} onClick={() => { if (window.confirm(`Remove ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}?`)) { onRemoveSelected(selectedCards); setSelected(new Set()); } }} className="mt-3 min-h-10 w-full rounded-lg border border-ctp-red/50 text-xs text-ctp-red disabled:opacity-40">Remove selected</button>
        </div>
      </details>
    </div>
    {sections.map((section) => <details key={section.key} open className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:p-4">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ctp-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40 [&::-webkit-details-marker]:hidden"><span>{section.title} Deck</span><span className="flex items-center gap-2"><span className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-xs font-normal text-ctp-subtext1">{section.lines.reduce((total, line) => total + line.quantity, 0)} cards</span><span aria-hidden="true" className="text-ctp-subtext0 transition-transform group-open:rotate-180">⌄</span></span></summary>
    <div className="mt-3 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 min-[560px]:grid-cols-3 lg:grid-cols-4">{section.lines.map((line) => { const selectionKey = keyFor(section.key, line.card); return <EditableCardTile key={line.card} line={line} card={cardsByName.get(line.card)} section={section.key} selected={selected.has(selectionKey)} onSelect={() => setSelected((current) => { const next = new Set(current); if (next.has(selectionKey)) next.delete(selectionKey); else next.add(selectionKey); return next; })} onChangeQuantity={(quantity) => onChangeQuantity(section.key, line.card, quantity)} onMove={(destination) => onMove(section.key, destination, line.card)} onRemove={() => onRemove(section.key, line.card)} />; })}</div>
  </details>)}</div>;
}

export { EDIT_SECTIONS };
