import type { Card } from "@gatcg/shared";
import spoilers from "../../../data/reference/card-spoilers-2026-11-01.json";
import { mergePreviewCards } from "./previewCards";

/** Shared display catalog: official records supersede editorial previews. */
export function withSpoilerCards(cards: Card[]): Card[] {
  return mergePreviewCards(cards, spoilers.cards, true);
}
