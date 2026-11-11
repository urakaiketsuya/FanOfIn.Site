import { NEW_DECK_DRAFT_KEY, readNewDeckDraft, type NewDeckDraft } from "./newDeckDraft";
import { buildEditableDeckText } from "../../lib/decklistText";
import { parseDecklist } from "../compare/parseDecklist";

export interface PackageLine { name: string; section: "main" | "material" | "sideboard"; quantity: number }

/** Adds package cards to a new-deck draft. A card already in the draft keeps its larger
 * quantity: adding a package twice, or onto a deck that has the card, never stacks copies. */
export function mergePackageIntoDraft(existing: NewDeckDraft | null, lines: PackageLine[], title: string, sourceId: string): NewDeckDraft {
  const base: NewDeckDraft = existing ?? { sourceId, title, format: "STANDARD", deckText: "", maybeboardText: "" };
  const deck = parseDecklist(base.deckText).decklist;
  for (const { name, section, quantity } of lines) {
    const line = deck[section].find(item => item.card === name);
    if (line) line.quantity = Math.max(line.quantity, quantity);
    else deck[section].push({ card: name, quantity });
  }
  return { ...base, deckText: buildEditableDeckText(deck) };
}

/** Stores the merged draft where `/decks/new` reads it. Returns false when storage is blocked. */
export function addPackageToNewDeckDraft(lines: PackageLine[], title: string): boolean {
  try {
    const draft = mergePackageIntoDraft(readNewDeckDraft(localStorage), lines, title, crypto.randomUUID());
    localStorage.setItem(NEW_DECK_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch { return false; }
}
