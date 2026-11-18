import type { VisualCardSize } from "./decklistDisplayPrefs";

export type CardGridSize = Exclude<VisualCardSize, "rows">;

export const CARD_GRID_MINIMUM: Record<CardGridSize, string> = { large: "9rem", medium: "6.5rem", compact: "4.75rem" };
