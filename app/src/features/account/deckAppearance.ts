import { DECK_FOLDER_ACCENTS, type DeckFolderAccent } from "@gatcg/shared";
import type { CSSProperties } from "react";

/** Stable decorative identity, never a game element or legality signal. */
export function deckAccent(championName: string | null): DeckFolderAccent {
  if (!championName) return "blue";
  let hash = 0;
  for (const character of championName.split(",")[0].trim().normalize("NFKC").toLowerCase()) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return DECK_FOLDER_ACCENTS[hash % DECK_FOLDER_ACCENTS.length];
}
export function identityStyle(accent: DeckFolderAccent = "blue"): CSSProperties {
  return { "--identity-accent": `var(--catppuccin-color-${accent})` } as CSSProperties;
}
