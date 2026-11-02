import { validUserFacingName, type DeckFormat } from "@gatcg/shared";
import type { EditSnapshot } from "./deckEditSession";

export const NEW_DECK_DRAFT_KEY = "fanofin:new-deck-draft:v1";
export interface NewDeckDraft extends EditSnapshot {
  sourceId: string;
  title: string;
  format: DeckFormat;
}

export function readNewDeckDraft(storage: Pick<Storage, "getItem">): NewDeckDraft | null {
  try {
    const value = JSON.parse(storage.getItem(NEW_DECK_DRAFT_KEY) ?? "null") as Partial<NewDeckDraft> | null;
    if (!value || typeof value.sourceId !== "string" || !value.sourceId || typeof value.title !== "string" || typeof value.deckText !== "string" || typeof value.maybeboardText !== "string" || !["STANDARD", "PANTHEON", "UNKNOWN"].includes(value.format ?? "")) return null;
    return value as NewDeckDraft;
  } catch { return null; }
}

export function newDeckTitleError(title: string): string | null {
  if (!title.trim() || title.length > 160) return "Use a deck name between 1 and 160 characters.";
  return validUserFacingName(title) ? null : "Deck name contains blocked language.";
}
