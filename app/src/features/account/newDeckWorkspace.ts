import { extractDeckPrintings, printingCardLine, withDeckPrintings } from "@gatcg/shared";
import type { Card } from "@gatcg/shared";
import type { EditableDeck } from "../../lib/deckEditing";
import { buildEditableDeckText } from "../../lib/decklistText";
import { decklistToWorkspace } from "../deckbuilder/persistence/deckWorkspaceImport";
import type { DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import type { NewDeckDraft } from "./newDeckDraft";

export function newDeckWorkspace(draft: NewDeckDraft, deck: EditableDeck, catalog: Map<string, Card>) {
  return { ...decklistToWorkspace(deck, catalog, "review", draft.format, null, draft.title, "My Decks draft", `draft:${draft.sourceId}`),
    printings: extractDeckPrintings(deck), maybeboard: deck.maybeboard.map(({ card: name, quantity }) => ({ name, quantity })) };
}

export function restoreReviewedDraft(draft: NewDeckDraft, workspace: DeckWorkspace | null, requestedId: string | null): NewDeckDraft {
  if (requestedId !== draft.sourceId || workspace?.deckIdentity !== `draft:${draft.sourceId}`) return draft;
  const lines = (section: "main" | "material" | "sideboard" | "song" | "maybeboard") => (workspace[section] ?? []).map(({ name: card, quantity }) => ({ card, quantity }));
  const deck = withDeckPrintings({ main: lines("main"), material: lines("material"), sideboard: lines("sideboard"), song: lines("song"), maybeboard: lines("maybeboard") }, workspace.printings ?? {});
  return { ...draft, format: workspace.format, deckText: buildEditableDeckText(deck), maybeboardText: deck.maybeboard.map(printingCardLine).join("\n") };
}
