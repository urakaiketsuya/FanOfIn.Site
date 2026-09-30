import { useEffect } from "react";
import type { EditSnapshot } from "./deckEditSession";
import { deckDraftKey, readDeckDraft } from "./deckDraft";

export function useSavedDeckDraft(deck: { id: string; updatedAt: string } | null | undefined, editing: boolean, dirty: boolean, snapshot: EditSnapshot) {
  const { deckText, maybeboardText } = snapshot;
  useEffect(() => {
    if (!editing || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, dirty]);
  useEffect(() => {
    if (!deck || !editing) return;
    try {
      if (dirty) localStorage.setItem(deckDraftKey(deck.id), JSON.stringify({ deckText, maybeboardText, baseUpdatedAt: deck.updatedAt }));
      else localStorage.removeItem(deckDraftKey(deck.id));
    } catch { /* Storage is best-effort; in-memory editing remains available. */ }
  }, [deck, editing, dirty, deckText, maybeboardText]);
  return {
    restore(fallback: EditSnapshot): EditSnapshot {
      if (!deck) return fallback;
      try {
        const draft = readDeckDraft(localStorage, deck.id, deck.updatedAt);
        return draft && window.confirm("Resume your unsaved deck draft?") ? draft : fallback;
      } catch { return fallback; }
    },
    clear() { try { if (deck) localStorage.removeItem(deckDraftKey(deck.id)); } catch { /* Best effort. */ } },
  };
}
