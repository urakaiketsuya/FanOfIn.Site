import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import { gatcgApi } from "./api/client";

interface TtsTransform {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

interface TtsCustomDeckEntry {
  FaceURL: string;
  BackURL: string;
  NumWidth: number;
  NumHeight: number;
  BackIsHidden: boolean;
  UniqueBack: boolean;
  Type: number;
}

interface TtsCardObject {
  Name: "Card";
  Transform: TtsTransform;
  Nickname: string;
  CardID: number;
  CustomDeck: Record<string, TtsCustomDeckEntry>;
}

interface TtsDeckObject {
  Name: "DeckCustom";
  Transform: TtsTransform;
  Nickname: string;
  DeckIDs: number[];
  CustomDeck: Record<string, TtsCustomDeckEntry>;
  ContainedObjects: TtsCardObject[];
}

export interface TtsStackInput {
  label: string;
  lines: OmnidexDecklistCardLine[];
}

function transform(posX: number): TtsTransform {
  return { posX, posY: 1, posZ: 0, rotX: 0, rotY: 180, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
}

/**
 * Builds a Tabletop Simulator save file: one stack per non-empty input group (Main/Material/
 * Sideboard), laid out side by side. No spritesheet generation — TTS's CustomDeck format allows
 * a 1x1 "sheet" per unique card, so each card just references its own hosted image URL directly.
 * There's no real card-back art in our data, so FaceURL is reused for BackURL (harmless since
 * BackIsHidden hides it in normal play). A lone-card group is emitted as a bare Card object
 * instead of a one-item DeckCustom, matching how TTS itself serializes a single-card "stack".
 */
export function buildTtsSaveFile(stacks: TtsStackInput[], cardsByName: Map<string, Card>) {
  const objectStates: (TtsDeckObject | TtsCardObject)[] = [];
  let posX = 0;

  for (const stack of stacks) {
    const contained: TtsCardObject[] = [];
    let sheetKey = 1;

    for (const line of stack.lines) {
      const image = cardsByName.get(line.card)?.editions[0]?.image;
      if (!image) continue; // skip cards we don't have a resolved image for, rather than failing the export
      const url = gatcgApi.imageUrl(image);
      const entry: TtsCustomDeckEntry = {
        FaceURL: url,
        BackURL: url,
        NumWidth: 1,
        NumHeight: 1,
        BackIsHidden: true,
        UniqueBack: false,
        Type: 0,
      };
      const key = String(sheetKey);
      const cardId = sheetKey * 100;
      for (let i = 0; i < line.quantity; i++) {
        contained.push({
          Name: "Card",
          Transform: transform(posX),
          Nickname: line.card,
          CardID: cardId,
          CustomDeck: { [key]: entry },
        });
      }
      sheetKey++;
    }

    if (contained.length === 0) continue;

    if (contained.length === 1) {
      objectStates.push(contained[0]);
    } else {
      objectStates.push({
        Name: "DeckCustom",
        Transform: transform(posX),
        Nickname: stack.label,
        DeckIDs: contained.map((c) => c.CardID),
        CustomDeck: Object.assign({}, ...contained.map((c) => c.CustomDeck)),
        ContainedObjects: contained,
      });
    }
    posX += 3;
  }

  return { SaveName: "", GameMode: "", ObjectStates: objectStates };
}

export function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Deck's Champion for export naming — same "highest-level CHAMPION in the Material Deck" rule as the pipeline's `findChampionName`, kept separate since this only needs to pick a filename, not feed downstream stats. */
export function findDeckChampionName(materialLines: OmnidexDecklistCardLine[], cardsByName: Map<string, Card>): string | null {
  let best: { name: string; level: number } | null = null;
  for (const line of materialLines) {
    const card = cardsByName.get(line.card);
    if (!card?.types.includes("CHAMPION")) continue;
    const level = card.level ?? 0;
    if (!best || level > best.level) best = { name: card.name, level };
  }
  return best?.name ?? null;
}

export function slugifyFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "decklist";
}
