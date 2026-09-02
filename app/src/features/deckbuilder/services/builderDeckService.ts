import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { accountApi } from "../../../lib/accountApi";

export interface SaveBuilderDeckRequest {
  improveDeckId: string | null;
  title: string;
  changeNote: string;
  format: DeckFormat;
  championName: string;
  decklist: OmnidexDecklist;
  maybeboard: ReadonlyMap<string, number>;
}

/** Account persistence adapter for builder output. UI operation state remains with the caller. */
export async function saveBuilderDeck(request: SaveBuilderDeckRequest): Promise<{ id: string }> {
  const maybeboard = Array.from(request.maybeboard, ([card, quantity]) => ({ card, quantity }));
  if (request.improveDeckId) {
    await accountApi.createDeckVersion(request.improveDeckId, {
      format: request.format,
      championName: request.championName,
      decklist: request.decklist,
      changeNote: request.changeNote.trim() || "Improved in Guided Deck Builder",
    });
    await accountApi.updateDeckMetadata(request.improveDeckId, { maybeboard });
    return { id: request.improveDeckId };
  }
  return accountApi.saveDeck({
    title: request.title.trim() || `${request.championName} guided build`,
    format: request.format,
    championName: request.championName,
    decklist: request.decklist,
    maybeboard,
    source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Guided Deck Builder" },
  });
}
