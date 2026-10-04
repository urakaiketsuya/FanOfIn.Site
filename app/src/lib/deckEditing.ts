import { validPrintingAllocations, mergePrintingAllocations, type CardPrintingAllocation, type Card, type OmnidexDecklistCardLine } from "@gatcg/shared";
import { deckDestinationEligibility, type EditableDeckDestination } from "./deckSectionEligibility";

export type DeckEditSection = EditableDeckDestination;
export type EditableDeck = Record<DeckEditSection, OmnidexDecklistCardLine[]>;
export type DeckEdit =
  | { type: "add-many"; additions: { name: string; section: DeckEditSection; quantity: number }[] }
  | { type: "printings"; section: DeckEditSection; name: string; printings: CardPrintingAllocation[] }
  | { type: "quantity"; printings?: CardPrintingAllocation[]; section: DeckEditSection; name: string; quantity: number }
  | { type: "remove"; section: DeckEditSection; name: string }
  | { type: "move"; printings?: CardPrintingAllocation[]; section: DeckEditSection; name: string; destination: DeckEditSection; quantity: number };

/** Immutable, section-aware edits. Limits are validation feedback, never silent truncation. */
export function editDeck(deck: EditableDeck, edit: DeckEdit, catalog: ReadonlyMap<string, Card>): EditableDeck {
  if (edit.type === "add-many") {
    let next = deck;
    for (const item of edit.additions) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || !deckDestinationEligibility(catalog.get(item.name), item.section).allowed) return deck;
      const quantity = (next[item.section].find(line => line.card === item.name)?.quantity ?? 0) + item.quantity;
      if (!Number.isSafeInteger(quantity)) return deck;
      next = editDeck(next, { type: "quantity", ...item, quantity }, catalog);
    }
    return next;
  }
  const current = deck[edit.section].find((line) => line.card === edit.name);
  if (edit.type !== "remove" && edit.type !== "printings" && (!Number.isSafeInteger(edit.quantity) || edit.quantity < 1)) return deck;
  if (edit.type === "move" && (!current || edit.destination === edit.section || edit.quantity > current.quantity || !deckDestinationEligibility(catalog.get(edit.name), edit.destination).allowed)) return deck;
  if (edit.type === "quantity" && !current && !deckDestinationEligibility(catalog.get(edit.name), edit.section).allowed) return deck;
  if (edit.type === "printings") {
    if (!current || !validPrintingAllocations(edit.printings, current.quantity)) return deck;
    return { ...deck, [edit.section]: deck[edit.section].map(line => line === current ? { ...line, printings: mergePrintingAllocations(edit.printings) } : line) };
  }
  if (edit.type === "remove" && !current) return deck;
  if (edit.type === "quantity" && current?.quantity === edit.quantity && edit.printings === undefined) return deck;
  const next = Object.fromEntries(Object.entries(deck).map(([section, lines]) => [section, lines.map((line) => ({ ...line }))])) as EditableDeck;
  const source = next[edit.section];
  const index = source.findIndex((line) => line.card === edit.name);
  if (edit.type === "quantity") {
    if (index >= 0) {
      const allocations = edit.printings ?? current!.printings ?? [];
      if (!validPrintingAllocations(allocations, edit.quantity)) return deck;
      source[index] = { ...source[index], quantity: edit.quantity, ...(allocations.length || current!.printings ? { printings: allocations } : {}) };
    }
    else source.push({ card: edit.name, quantity: edit.quantity });
  } else if (edit.type === "remove") source.splice(index, 1);
  else {
    const moved = selectedMovePrintings(current!, edit.quantity, edit.printings);
    if (moved === null) return deck;
    const remaining = (current!.printings ?? []).map(p => ({ ...p, quantity: p.quantity - (moved.find(m => m.editionUuid === p.editionUuid)?.quantity ?? 0) })).filter(p => p.quantity > 0);
    if (current!.printings) source[index].printings = remaining;
    source[index].quantity -= edit.quantity;
    if (source[index].quantity === 0) source.splice(index, 1);
    const target = next[edit.destination].find((line) => line.card === edit.name);
    if (target) { target.quantity += edit.quantity; if (moved.length) target.printings = mergePrintingAllocations([...(target.printings ?? []), ...moved]); }
    else next[edit.destination].push({ card: edit.name, quantity: edit.quantity, ...(moved.length ? { printings: moved } : {}) });
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

/** Explicit partial moves must select only copies present in the source. */
export function selectedMovePrintings(line: OmnidexDecklistCardLine, quantity: number, selected?: CardPrintingAllocation[]): CardPrintingAllocation[] | null {
  const available = line.printings ?? [];
  const unspecified = line.quantity - available.reduce((sum, p) => sum + p.quantity, 0);
  const chosen = selected ?? (quantity === line.quantity ? available : unspecified >= quantity ? [] : available.length === 1 ? [{ ...available[0], quantity: quantity - unspecified }] : null);
  if (!chosen || !validPrintingAllocations(chosen, quantity)) return null;
  if (chosen.some(p => p.quantity > (available.find(a => a.editionUuid === p.editionUuid)?.quantity ?? 0))) return null;
  if (quantity - chosen.reduce((sum, p) => sum + p.quantity, 0) > unspecified) return null;
  return chosen;
}
