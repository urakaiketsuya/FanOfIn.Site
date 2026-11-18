import type { VisualCardSize } from "./decklistDisplayPrefs";

export type CardGridSize = Exclude<VisualCardSize, "rows">;

export const CARD_GRID_MINIMUM: Record<CardGridSize, string> = { large: "12rem", medium: "9rem", compact: "6rem" };
