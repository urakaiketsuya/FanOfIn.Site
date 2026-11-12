import { useState } from "react";
import type { Card, DeckFormat } from "@gatcg/shared";
import { songDeckAvailable, editDeckSelection, type SelectedDeckEdit, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import { EditableDecklistGrid, type DeckSectionKey, MaybeboardCardTile } from "./EditableDecklistGrid";
import AddDeckCard from "./AddDeckCard";
import DisclosureChevron from "../DisclosureChevron";

/** The My Decks card editor, shared by saved decks and anonymous drafts. Persistence stays with its caller. */
export default function DeckEditor({ deck, catalog, onEdit, onReplace, format, onAdd }: {
  onAdd: (section: keyof EditableDeck) => void;
  format: DeckFormat; deck: EditableDeck; catalog: Map<string, Card>;
  onEdit: (action: DeckEdit) => void; onReplace: (deck: EditableDeck) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  function bulk(selected: { section: DeckSectionKey; name: string }[], action: SelectedDeckEdit) {
    const next = editDeckSelection(deck, selected, action, catalog);
    if (!next) { setError("Selection unchanged. Check destinations and assigned printings before trying again."); return; }
    setError(null);
    if (next !== deck) onReplace(next);
  }
  return <div className="mt-3 space-y-4">
    {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
    <EditableDecklistGrid format={format} decklist={deck} cardsByName={catalog} onAdd={onAdd}
      onPrintings={(section, name, printings) => onEdit({ type: "printings", section, name, printings })}
      onChangeQuantity={(section, name, quantity, printings) => onEdit({ type: "quantity", section, name, quantity, printings })}
      onMove={(section, destination, name, quantity, printings) => onEdit({ type: "move", section, destination, name, quantity, printings })}
      onRemove={(section, name) => onEdit({ type: "remove", section, name })}
      onAdjustSelected={(cards, delta) => bulk(cards, { type: "adjust", delta })}
      onSetSelected={(cards, quantity) => bulk(cards, { type: "set", quantity })}
      onMoveSelected={(cards, destination) => bulk(cards, { type: "move", destination })}
      onRemoveSelected={cards => bulk(cards, { type: "remove" })} />
    <details className="group rounded-xl border border-dashed border-ctp-yellow/50 bg-ctp-yellow/5 p-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ctp-yellow"><span>Maybeboard ({deck.maybeboard.reduce((sum, line) => sum + line.quantity, 0)})</span><DisclosureChevron className="group-open:rotate-180" /></summary>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        <AddDeckCard section="Maybeboard" onAdd={() => onAdd("maybeboard")} />
        {deck.maybeboard.map(line => <MaybeboardCardTile songAvailable={songDeckAvailable(deck, catalog)} key={line.card} format={format} line={line} card={catalog.get(line.card)}
          onPrintings={printings => onEdit({ type: "printings", section: "maybeboard", name: line.card, printings })}
          onChangeQuantity={(quantity, printings) => onEdit({ type: "quantity", section: "maybeboard", name: line.card, quantity, printings })}
          onMove={(destination, quantity, printings) => onEdit({ type: "move", section: "maybeboard", name: line.card, destination, quantity, printings })}
          onRemove={() => onEdit({ type: "remove", section: "maybeboard", name: line.card })} />)}
      </div>
    </details>
  </div>;
}
