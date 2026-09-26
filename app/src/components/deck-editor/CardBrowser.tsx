import { useId } from "react";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import CardSearchResults from "./CardSearchResults";

export default function CardBrowser({ query, onQuery, destination, onDestination, names, catalog, deck, onEdit, onAdded }: {
  query: string; onQuery: (query: string) => void;
  destination: "automatic" | "sideboard" | "maybeboard"; onDestination: (value: "automatic" | "sideboard" | "maybeboard") => void;
  names: string[]; catalog: Map<string, Card>; deck: EditableDeck; onEdit: (edit: DeckEdit) => void; onAdded?: () => void;
}) {
  const id = useId();
  const sectionFor = (name: string) => destination === "automatic" ? automaticDeckSection(catalog.get(name)) : destination;
  const quantityFor = (name: string) => deck[sectionFor(name)].find((line) => line.card === name)?.quantity ?? 0;
  function add(name: string) {
    onEdit({ type: "quantity", section: sectionFor(name), name, quantity: quantityFor(name) + 1 });
    onAdded?.();
  }
  return <>
    <label htmlFor={id} className="mb-2 block text-sm font-medium">Search cards</label>
    <input id={id} value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && names.includes(query)) add(query); }} placeholder="Search by card name…" className="min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" />
    <label className="mt-2 flex items-center justify-between gap-3 text-sm text-ctp-subtext1">Add to<select value={destination} onChange={(event) => onDestination(event.target.value as typeof destination)} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm"><option value="automatic">Deck</option><option value="sideboard">Sideboard</option><option value="maybeboard">Maybeboard</option></select></label>
    {names.length === 0 ? <p role="status" className="py-4 text-sm">Loading card catalog…</p> : <CardSearchResults key={query.trim().toLocaleLowerCase()} query={query} names={names} catalog={catalog} chosen={new Map()} quantityFor={quantityFor} onAdd={add} onSetQuantity={(name, quantity) => onEdit({ type: "quantity", section: sectionFor(name), name, quantity })} />}
  </>;
}
