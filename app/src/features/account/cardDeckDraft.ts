import type { Card } from "@gatcg/shared";
import { editDeck, type DeckEditSection, type EditableDeck } from "../../lib/deckEditing";
import { buildEditableDeckText } from "../../lib/decklistText";
import { printingCardLine } from "@gatcg/shared";
import { parseDecklist } from "../compare/parseDecklist";
import type { EditSnapshot } from "./deckEditSession";

export interface CardDeckAddition { card: Card; section: DeckEditSection; quantity: number }
export function addCardToSnapshot(snapshot: EditSnapshot, addition: CardDeckAddition, catalog: ReadonlyMap<string, Card> = new Map()): EditSnapshot {
  const deck: EditableDeck = { ...parseDecklist(snapshot.deckText).decklist, maybeboard: parseDecklist(`Main\n${snapshot.maybeboardText}`).decklist.main };
  const next = editDeck(deck, { type: "add-many", additions: [{ name: addition.card.name, section: addition.section, quantity: addition.quantity }] }, new Map([...catalog, [addition.card.name, addition.card]]));
  if (next === deck) throw new Error("This card cannot be added to that section. Choose another section in the editor.");
  return { deckText: buildEditableDeckText(next), maybeboardText: next.maybeboard.map(printingCardLine).join("\n") };
}
