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
  const cards = new Map<string, number>();
  const sections = new Map<string, LockedSection>();
  // Preserve the legacy plain-name key for the primary section; duplicates get
  // a section-qualified key so Main and Sideboard copies survive round trips.
  const ordered = [...selections].sort((a, b) => Number(a.section === "sideboard") - Number(b.section === "sideboard"));
  for (const { name, quantity, section } of ordered) {
    const key = cards.has(name) && sections.get(name) !== section ? `${section}\0${name}` : name;
    cards.set(key, (cards.get(key) ?? 0) + quantity);
    sections.set(key, section);
  }
  return { cards, sections };
}

export function mapsToSelections(cards: ReadonlyMap<string, number>, sections: ReadonlyMap<string, LockedSection>): CardSelection[] {
  return Array.from(cards, ([name, quantity]) => ({ name: selectionCardName(name), quantity, section: sections.get(name) ?? "main" }));
}

export function selectionCardName(key: string): string { return key.includes("\0") ? key.slice(key.indexOf("\0") + 1) : key; }
