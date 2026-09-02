import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { buildDecklistText } from "../../events/DecklistView";
import { copyDecklistAndOpen } from "../../../lib/deckBuilderDestinations";
import { buildTtsSaveFile, downloadJsonFile, slugifyFilename } from "../../../lib/ttsExport";
import { createBuilderShareParams, legacyMapsToSelections } from "../persistence/builderPersistence";
import type { LockedSection } from "../model/builderTypes";

export async function copyBuilderDecklist(decklist: OmnidexDecklist): Promise<void> {
  await navigator.clipboard.writeText(buildDecklistText(decklist));
}

export async function copyBuilderDecklistAndOpen(decklist: OmnidexDecklist, url: string): Promise<void> {
  await copyDecklistAndOpen(buildDecklistText(decklist), url);
}

export async function copyBuilderShareLink(input: {
  origin: string;
  championName: string | null;
  spiritName: string | null;
  archetypeId: string | null;
  format: DeckFormat;
  lockedCards: ReadonlyMap<string, number>;
  lockedSections: ReadonlyMap<string, LockedSection>;
}): Promise<void> {
  const params = createBuilderShareParams({
    championName: input.championName,
    spiritName: input.spiritName,
    archetypeId: input.archetypeId,
    format: input.format,
    lockedCards: legacyMapsToSelections(input.lockedCards, input.lockedSections),
  });
  await navigator.clipboard.writeText(`${input.origin}/deck-builder?${params.toString()}`);
}

export function exportBuilderTts(decklist: OmnidexDecklist, cardsByName: Map<string, Card>, championName: string | null): void {
  const save = buildTtsSaveFile([
    { label: "Main", lines: decklist.main },
    { label: "Material", lines: decklist.material },
    { label: "Sideboard", lines: decklist.sideboard },
  ], cardsByName);
  downloadJsonFile(`${slugifyFilename(championName ?? "decklist")}-tts.json`, save);
}
