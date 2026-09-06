import type { DeckFormat } from "@gatcg/shared";
import type { RatingPillar } from "../../../lib/deckIdentity";
import {
  mapsToSelections,
  type BuilderSelection,
  type BuilderSession,
  type CardSelection,
  type ChangeLogEntry,
  type LockedSection,
  type PopulationSource,
} from "../model/builderTypes";

export const BUILDER_SESSION_KEY = "deckbuilder-session-v2";
const LEGACY_SESSION_KEY = "deckbuilder-session-v1";
/** A separate session slot for the suggestions-only Deck Review page — same storage shape and
 * functions as the full Guided Deck Builder, just a distinct key so the two tools' in-progress
 * state never overwrites each other. */
export const DECK_REVIEW_SESSION_KEY = "deck-review-session-v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredSessionV2 {
  version: 2;
  session: BuilderSession;
}

interface LegacySession {
  championName?: string;
  spiritFilter?: string | null;
  locked?: string;
  rejectedCards?: string[];
  pillarBias?: RatingPillar | null;
  archetypeId?: string | null;
  populationSource?: PopulationSource;
  changeLog?: ChangeLogEntry[];
  maybeboard?: string;
}

export function encodeCardSelections(selections: CardSelection[]): string {
  return selections.map(({ section, quantity, name }) => `${section}:${quantity}:${name}`).join(";");
}

export function decodeCardSelections(encoded: string): CardSelection[] {
  const selections: CardSelection[] = [];
  for (const entry of encoded.split(";")) {
    if (!entry) continue;
    const [sectionValue, quantityValue, ...nameParts] = entry.split(":");
    const name = nameParts.join(":");
    const quantity = Number(quantityValue);
    if (!name || !Number.isFinite(quantity) || quantity < 1) continue;
    const section: LockedSection = sectionValue === "material" || sectionValue === "sideboard" ? sectionValue : "main";
    selections.push({ name, quantity, section });
  }
  return selections;
}

export function parseBuilderShareParams(params: URLSearchParams): Partial<BuilderSelection> | null {
  const championName = params.get("champion");
  if (!championName) return null;
  return {
    championName,
    spiritName: params.get("spirit"),
    archetypeId: params.get("archetype"),
    format: params.get("format")?.toUpperCase() === "PANTHEON" ? "PANTHEON" : "STANDARD",
    lockedCards: decodeCardSelections(params.get("locked") ?? ""),
  };
}

export function createBuilderShareParams(selection: Pick<BuilderSelection, "championName" | "spiritName" | "archetypeId" | "format" | "lockedCards">): URLSearchParams {
  const params = new URLSearchParams();
  if (selection.championName) params.set("champion", selection.championName);
  if (selection.format === "PANTHEON") params.set("format", "pantheon");
  if (selection.spiritName) params.set("spirit", selection.spiritName);
  if (selection.archetypeId) params.set("archetype", selection.archetypeId);
  const locked = encodeCardSelections(selection.lockedCards);
  if (locked) params.set("locked", locked);
  return params;
}

export function loadBuilderSession(storage: StorageLike, fallbackFormat: DeckFormat = "STANDARD", storageKey: string = BUILDER_SESSION_KEY): BuilderSession | null {
  try {
    const current = storage.getItem(storageKey);
    if (current) {
      const parsed = JSON.parse(current) as Partial<StoredSessionV2>;
      if (parsed.version === 2 && parsed.session?.selection?.championName) return parsed.session;
    }
    // Legacy (pre-v2) sessions only ever existed under the main builder's own key.
    if (storageKey !== BUILDER_SESSION_KEY) return null;
    const legacyRaw = storage.getItem(LEGACY_SESSION_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as LegacySession;
    if (!legacy.championName) return null;
    return {
      selection: {
        format: fallbackFormat,
        championName: legacy.championName,
        spiritName: legacy.spiritFilter ?? null,
        archetypeId: legacy.archetypeId ?? null,
        populationSource: isPopulationSource(legacy.populationSource) ? legacy.populationSource : "balanced",
        pillarBias: legacy.pillarBias ?? null,
        championLevelCap: null,
        collectionMode: "all",
        lockedCards: decodeCardSelections(legacy.locked ?? ""),
        rejectedCards: legacy.rejectedCards ?? [],
        maybeboard: decodeCardSelections(legacy.maybeboard ?? ""),
      },
      changeLog: Array.isArray(legacy.changeLog) ? legacy.changeLog : [],
    };
  } catch {
    return null;
  }
}

export function saveBuilderSession(storage: StorageLike, session: BuilderSession, storageKey: string = BUILDER_SESSION_KEY): void {
  try {
    if (!session.selection.championName) {
      clearBuilderSession(storage, storageKey);
      return;
    }
    storage.setItem(storageKey, JSON.stringify({ version: 2, session } satisfies StoredSessionV2));
    if (storageKey === BUILDER_SESSION_KEY) storage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Storage may be unavailable or full; an in-progress build should remain usable in memory.
  }
}

export function clearBuilderSession(storage: StorageLike, storageKey: string = BUILDER_SESSION_KEY): void {
  try {
    storage.removeItem(storageKey);
    if (storageKey === BUILDER_SESSION_KEY) storage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Clearing persistence must never make resetting the in-memory builder fail.
  }
}

export function legacyMapsToSelections(cards: ReadonlyMap<string, number>, sections: ReadonlyMap<string, LockedSection>): CardSelection[] {
  return mapsToSelections(cards, sections);
}

function isPopulationSource(value: unknown): value is PopulationSource {
  return value === "balanced" || value === "tournament" || value === "community" || value === "simulator";
}
