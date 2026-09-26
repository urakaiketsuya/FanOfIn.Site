import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import { deckDestinationEligibility, type EditableDeckDestination } from "./deckSectionEligibility";

export type DeckEditSection = EditableDeckDestination;
export type EditableDeck = Record<DeckEditSection, OmnidexDecklistCardLine[]>;
export type DeckEdit =
  | { type: "quantity"; section: DeckEditSection; name: string; quantity: number }
  | { type: "remove"; section: DeckEditSection; name: string }
  | { type: "move"; section: DeckEditSection; name: string; destination: DeckEditSection; quantity: number };

/** Immutable, section-aware edits. Limits are validation feedback, never silent truncation. */
export function editDeck(deck: EditableDeck, edit: DeckEdit, catalog: ReadonlyMap<string, Card>): EditableDeck {
  const current = deck[edit.section].find((line) => line.card === edit.name);
  if (edit.type !== "remove" && (!Number.isSafeInteger(edit.quantity) || edit.quantity < 1)) return deck;
  if (edit.type === "move" && (!current || edit.destination === edit.section || edit.quantity > current.quantity || !deckDestinationEligibility(catalog.get(edit.name), edit.destination).allowed)) return deck;
  if (edit.type === "quantity" && !current && !deckDestinationEligibility(catalog.get(edit.name), edit.section).allowed) return deck;
  if (edit.type === "remove" && !current) return deck;
  if (edit.type === "quantity" && current?.quantity === edit.quantity) return deck;
  const next = Object.fromEntries(Object.entries(deck).map(([section, lines]) => [section, lines.map((line) => ({ ...line }))])) as EditableDeck;
  const source = next[edit.section];
  const index = source.findIndex((line) => line.card === edit.name);
  if (edit.type === "quantity") {
    if (index >= 0) source[index].quantity = edit.quantity;
    else source.push({ card: edit.name, quantity: edit.quantity });
  } else if (edit.type === "remove") source.splice(index, 1);
  else {
    source[index].quantity -= edit.quantity;
    if (source[index].quantity === 0) source.splice(index, 1);
    const target = next[edit.destination].find((line) => line.card === edit.name);
    if (target) target.quantity += edit.quantity;
    else next[edit.destination].push({ card: edit.name, quantity: edit.quantity });
  }
  return next;
}

export function automaticDeckSection(card: Card | undefined): "material" | "main" {
  return card?.types.some((type) => type === "CHAMPION" || type === "REGALIA") ? "material" : "main";
}

export const EDITOR_SECTIONS: { key: DeckEditSection; title: string }[] = [
  { key: "material", title: "Material" }, { key: "main", title: "Main" },
  { key: "sideboard", title: "Sideboard" }, { key: "maybeboard", title: "Maybeboard" },
];
