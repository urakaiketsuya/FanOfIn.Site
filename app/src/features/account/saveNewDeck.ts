import { canonicalizeSavedDecklist, extractDeckPrintings, type OmnidexDecklist, type SavedDeckDetail } from "@gatcg/shared";
import { parseDecklist } from "../compare/parseDecklist";
import { newDeckTitleError, type NewDeckDraft } from "./newDeckDraft";

type CreateInput = { title: string; format: NewDeckDraft["format"]; championName: string | null; decklist: OmnidexDecklist; maybeboard: OmnidexDecklist["main"]; source: { provider: "manual"; externalDeckId: string; label: string } };
interface SaveApi {
  saveDeck: (input: CreateInput) => Promise<{ id: string; created: boolean }>;
  deck: (id: string) => Promise<{ deck: SavedDeckDetail }>;
}
export class ExistingDeckError extends Error {
  readonly deckId: string;
  constructor(deckId: string) { super("This build is already in My Decks. Your new draft is still on this device."); this.deckId = deckId; }
}

/** Stable draft source IDs make unchanged retries converge on the same saved build. */
export async function saveNewDeck(api: SaveApi, draft: NewDeckDraft, championName: string | null): Promise<string> {
  const titleError = newDeckTitleError(draft.title);
  if (titleError) throw new Error(titleError);
  const decklist = parseDecklist(draft.deckText).decklist;
  if (!decklist.main.length && !decklist.material.length) throw new Error("Add a Main or Material card before saving.");
  const maybeboard = parseDecklist(`Main\n${draft.maybeboardText}`).decklist.main;
  const result = await api.saveDeck({ title: draft.title.trim(), format: draft.format, championName, decklist, maybeboard, source: { provider: "manual", externalDeckId: draft.sourceId, label: "Deck editor" } });
  if (!result.created) {
    const { deck } = await api.deck(result.id);
    // Creation deduplicates Main + Material. Never discard a differing local
    // sideboard, printing, title, or maybeboard when an existing build wins.
    const fingerprint = (list: OmnidexDecklist, maybe: OmnidexDecklist["main"]) => JSON.stringify({ list: canonicalizeSavedDecklist(list), printings: extractDeckPrintings({ ...list, maybeboard: maybe }), maybe: canonicalizeSavedDecklist({ main: maybe, material: [], sideboard: [] }).main });
    if (deck.title !== draft.title.trim() || deck.format !== draft.format || fingerprint(deck.decklist, deck.maybeboard) !== fingerprint(decklist, maybeboard)) throw new ExistingDeckError(result.id);
  }
  return result.id;
}
