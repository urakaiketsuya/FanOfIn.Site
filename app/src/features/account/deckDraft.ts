import type { EditSnapshot } from "./deckEditSession";
export const deckDraftKey = (deckId: string) => `fanofin:saved-deck-draft:${deckId}`;

export function readDeckDraft(storage: Pick<Storage, "getItem" | "removeItem">, deckId: string, updatedAt: string): EditSnapshot | null {
  try {
    const raw = storage.getItem(deckDraftKey(deckId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<EditSnapshot> & { baseUpdatedAt?: string };
    if (draft.baseUpdatedAt !== updatedAt) { storage.removeItem(deckDraftKey(deckId)); return null; }
    return typeof draft.deckText === "string" && typeof draft.maybeboardText === "string" ? { deckText: draft.deckText, maybeboardText: draft.maybeboardText } : null;
  } catch { return null; }
}
