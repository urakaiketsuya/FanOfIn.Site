import type { RatingPillar } from "../../../lib/deckIdentity";
import { selectionsToMaps, type ChangeLogEntry, type LockedSection, type PopulationSource } from "../model/builderTypes";
import { loadBuilderSession, parseBuilderShareParams } from "./builderPersistence";
import { loadActiveDeckWorkspace } from "./deckWorkspace";

export interface BuilderSeed {
  championName: string;
  spiritFilter: string | null;
  lockedCards: Map<string, number>;
  lockedSections: Map<string, LockedSection>;
  archetypeId: string | null;
}

export interface BuilderSessionSeed extends BuilderSeed {
  rejectedCards: Set<string>;
  pillarBias: RatingPillar | null;
  populationSource: PopulationSource;
  championLevelCap: number | null;
  collectionMode: "all" | "prioritize" | "owned-only";
  changeLog: ChangeLogEntry[];
  maybeboard: Map<string, number>;
}

/** Parse initial shared-link state before the first render so mount effects cannot
 * briefly initialize and then erase locked-card selections. */
export function parseBuilderUrlSeed(searchParams: URLSearchParams): BuilderSeed | null {
  const selection = parseBuilderShareParams(searchParams);
  if (!selection?.championName) return null;
  const { cards: lockedCards, sections: lockedSections } = selectionsToMaps(selection.lockedCards ?? []);
  return {
    championName: selection.championName,
    spiritFilter: selection.spiritName ?? null,
    archetypeId: selection.archetypeId ?? null,
    lockedCards,
    lockedSections,
  };
}

/** Restore a tab-local builder session or a deck-review workspace. Malformed and
 * outdated storage is handled by the underlying persistence readers. */
export function loadBuilderSessionSeed(storage: Storage): BuilderSessionSeed | null {
  const workspace = loadActiveDeckWorkspace(storage);
  if (workspace?.source === "review" && workspace.championName) {
    const locked = selectionsToMaps([
      ...workspace.main.map((line) => ({ ...line, section: "main" as const })),
      ...workspace.material.map((line) => ({ ...line, section: "material" as const })),
      ...workspace.sideboard.map((line) => ({ ...line, section: "sideboard" as const })),
    ]);
    return {
      championName: workspace.championName,
      spiritFilter: workspace.spiritName,
      lockedCards: locked.cards,
      lockedSections: locked.sections,
      rejectedCards: new Set(),
      pillarBias: null,
      archetypeId: null,
      populationSource: "balanced",
      championLevelCap: null,
      collectionMode: "all",
      changeLog: [],
      maybeboard: new Map(workspace.maybeboard.map((line) => [line.name, line.quantity])),
    };
  }

  const session = loadBuilderSession(storage);
  if (!session?.selection.championName) return null;
  const locked = selectionsToMaps(session.selection.lockedCards);
  const maybeboard = selectionsToMaps(session.selection.maybeboard);
  return {
    championName: session.selection.championName,
    spiritFilter: session.selection.spiritName,
    lockedCards: locked.cards,
    lockedSections: locked.sections,
    rejectedCards: new Set(session.selection.rejectedCards),
    pillarBias: session.selection.pillarBias,
    archetypeId: session.selection.archetypeId,
    populationSource: session.selection.populationSource,
    championLevelCap: session.selection.championLevelCap,
    collectionMode: session.selection.collectionMode,
    changeLog: session.changeLog,
    maybeboard: maybeboard.cards,
  };
}
