import type { DeckFormat } from "@gatcg/shared";
import type { RatingPillar } from "../../../lib/deckIdentity";

export type LockedSection = "main" | "material" | "sideboard";
export type PopulationSource = "tournament" | "community" | "simulator" | "balanced";
export type CollectionMode = "all" | "prioritize" | "owned-only";

export interface CardSelection {
  name: string;
  quantity: number;
  section: LockedSection;
}

export interface ChangeLogEntry {
  label: string;
  added: string[];
  removed: string[];
  winRateDelta: number | null;
}

export interface ArchetypeTuningOption {
  id: string;
  name: string;
  routeName: string;
  routeDeckCount: number;
  deckCount: number;
  confidence: "established" | "emerging";
}

/** Serializable input contract for recommendation engines, URLs, storage, and future API calls. */
export interface BuilderSelection {
  format: DeckFormat;
  championName: string | null;
  spiritName: string | null;
  archetypeId: string | null;
  populationSource: PopulationSource;
  pillarBias: RatingPillar | null;
  championLevelCap: number | null;
  collectionMode: CollectionMode;
  lockedCards: CardSelection[];
  rejectedCards: string[];
  maybeboard: CardSelection[];
}

export interface BuilderSession {
  selection: BuilderSelection;
  changeLog: ChangeLogEntry[];
}

export function selectionsToMaps(selections: CardSelection[]): {
  cards: Map<string, number>;
  sections: Map<string, LockedSection>;
} {
  return {
    cards: new Map(selections.map(({ name, quantity }) => [name, quantity])),
    sections: new Map(selections.map(({ name, section }) => [name, section])),
  };
}

export function mapsToSelections(cards: ReadonlyMap<string, number>, sections: ReadonlyMap<string, LockedSection>): CardSelection[] {
  return Array.from(cards, ([name, quantity]) => ({ name, quantity, section: sections.get(name) ?? "main" }));
}
