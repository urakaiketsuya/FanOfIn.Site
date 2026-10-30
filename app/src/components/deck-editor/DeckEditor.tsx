import Button from "../ui/Button";
import DeckLegalityWarning from "./DeckLegalityWarning";
import type { DeckFormat } from "@gatcg/shared";
import type { ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { EDITOR_SECTIONS, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import DeckEditorCard from "./DeckEditorCard";

export default function DeckEditor({ deck, catalog, onEdit, viewMode = "grid", renderStats, format, onAdd }: { onAdd?: (section: keyof EditableDeck) => void; format: DeckFormat; deck: EditableDeck; catalog: Map<string, Card>; onEdit: (action: DeckEdit) => void; renderStats?: (name: string) => ReactNode; viewMode?: "grid" | "list" }) {
  return <div className="mt-3 space-y-4"><DeckLegalityWarning deck={deck} catalog={catalog} format={format} />{EDITOR_SECTIONS.filter(({ key }) => (onAdd || deck[key].length)).map(({ key, title }) => {
    const total = deck[key].reduce((sum, line) => sum + line.quantity, 0);
    if (!total && onAdd) return <Button key={key} className="mr-2" onClick={() => onAdd(key)}>Add {title}</Button>;
    return <section key={key} aria-label={`${title} cards`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
    <h2 className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xl font-semibold text-ctp-text">{title} <span className="rounded-full border border-ctp-surface1 bg-ctp-base px-3 py-1 text-sm font-medium tabular-nums text-ctp-subtext1">{total} {total === 1 ? "copy" : "copies"}</span>{onAdd && <Button size="sm" onClick={() => onAdd(key)}>Add to {title}</Button>}</h2>
    <div className={viewMode === "list" ? "grid gap-3 lg:grid-cols-2" : "grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]"}>{deck[key].map((line) => <DeckEditorCard format={format} key={line.card} line={line} stats={renderStats?.(line.card)} card={catalog.get(line.card)} section={key} list={viewMode === "list"}
      onPrintings={printings => onEdit({ type: "printings", section: key, name: line.card, printings })}
      onChangeQuantity={(quantity, printings) => onEdit({ type: "quantity", section: key, name: line.card, quantity, printings })}
      onMove={(destination, quantity, printings) => onEdit({ type: "move", section: key, name: line.card, destination, quantity, printings })}
      onRemove={() => onEdit({ type: "remove", section: key, name: line.card })} />)}</div>
  </section>;
  })}</div>;
}
