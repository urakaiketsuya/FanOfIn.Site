import type { ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { EDITOR_SECTIONS, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import DeckEditorCard from "./DeckEditorCard";

export default function DeckEditor({ deck, catalog, onEdit, viewMode = "grid", renderStats }: { deck: EditableDeck; catalog: Map<string, Card>; onEdit: (action: DeckEdit) => void; renderStats?: (name: string) => ReactNode; viewMode?: "grid" | "list" }) {
  return <div className="mt-3 space-y-4">{EDITOR_SECTIONS.filter(({ key }) => deck[key].length).map(({ key, title }) => <section key={key} aria-label={`${title} cards`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <h2 className="mb-2 text-xs font-semibold uppercase text-ctp-subtext0">{title} ({deck[key].reduce((sum, line) => sum + line.quantity, 0)})</h2>
    <div className={viewMode === "list" ? "space-y-2" : "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"}>{deck[key].map((line) => <DeckEditorCard key={line.card} line={line} stats={renderStats?.(line.card)} card={catalog.get(line.card)} section={key} list={viewMode === "list"}
      onChangeQuantity={(quantity) => onEdit({ type: "quantity", section: key, name: line.card, quantity })}
      onMove={(destination, quantity) => onEdit({ type: "move", section: key, name: line.card, destination, quantity })}
      onRemove={() => onEdit({ type: "remove", section: key, name: line.card })} />)}</div>
  </section>)}</div>;
}
