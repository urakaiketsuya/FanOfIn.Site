import type { DeckFormat } from "./shoutatyourdecks-types.js";

export type ComboVisibility = "private" | "unlisted" | "public";
export type ComboGoal = "level" | "lethal" | "board" | "resources" | "cards" | "custom";

export interface ComboAvoidance {
  kind: "cards" | "attribute" | "keyword";
  cards: string[];
  value: string;
  /** Most matching cards that may be seen at the block's checkpoint. Defaults to zero. */
  maximum: number;
}

export interface ComboRequirement {
  kind: "cards" | "attribute" | "keyword";
  cards: string[];
  value: string;
  required: number;
  /** Optional per-piece deadline. Null/omitted means the active combo checkpoint applies. */
  byTurn?: number | null;
  /** Optional exclusion evaluated jointly with this wanted piece at the same deadline. */
  avoid?: ComboAvoidance | null;
}

export interface ComboDefinition {
  schemaVersion: 1;
  requirements: ComboRequirement[];
  damage: number;
  goal: ComboGoal;
  targetTurn: number | null;
}

export interface ComboOwner { displayName: string; profileSlug: string }

export interface SavedCombo {
  id: string;
  publicSlug: string | null;
  name: string;
  description: string;
  tags: string[];
  visibility: ComboVisibility;
  definition: ComboDefinition;
  format: DeckFormat;
  championName: string | null;
  exampleDeckId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCombo extends Omit<SavedCombo, "id" | "exampleDeckId"> {
  publicSlug: string;
  owner: ComboOwner;
  saveCount: number;
  exampleDeckSlug: string | null;
}

export interface BookmarkedCombo extends PublicCombo { bookmarkedAt: string }
