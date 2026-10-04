import { useCallback, useRef } from "react";
import { newlyAddedBannedCards, type Card, type DeckFormat } from "@gatcg/shared";
import type { DeckEdit, EditableDeck } from "../../lib/deckEditing";
import { useToast } from "../ui/toast/ToastContext";
export function useDeckEditFeedback() {
  const { notify, dismiss } = useToast();
  const last = useRef("");
  const clear = useCallback(() => { if (last.current) dismiss(last.current); last.current = ""; }, [dismiss]);
  function report(before: EditableDeck, after: EditableDeck, edit: DeckEdit, catalog: Map<string, Card>, format: DeckFormat, undo: () => void) {
    clear();
    const banned = newlyAddedBannedCards(before, after, catalog, format);
    // Quantity taps remain quiet unless they introduce/increase a banned card.
    if (!banned.length && (edit.type === "quantity" || edit.type === "printings")) return;
    const message = banned.length ? `${banned.length === 1 ? banned[0] : `${banned.length} banned cards`} added. Banned in ${format === "PANTHEON" ? "Pantheon" : "Standard"}.` : edit.type === "add-many" ? `Added ${edit.additions.reduce((sum, line) => sum + line.quantity, 0)} copies to your draft.` : edit.type === "move" ? `Moved ${edit.quantity} × ${edit.name} to ${edit.destination}.` : `Removed ${edit.name}.`;
    last.current = notify({ key: "deck-edit", message, tone: banned.length ? "warning" : "success", action: { label: "Undo", onClick: undo } });
  }
  return { report, clear };
}
