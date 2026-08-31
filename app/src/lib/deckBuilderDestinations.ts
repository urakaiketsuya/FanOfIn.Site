/**
 * Destinations that accept a pasted Grand Archive decklist. The list is copied first so users can
 * paste it into the destination's own import flow after its deck builder opens.
 */
export const deckBuilderDestinations = [
  {
    id: "tcgarchitect",
    label: "TCGArchitect",
    url: "https://tcgarchitect.com/grand-archive/deck-builder",
  },
  {
    id: "sleeved",
    label: "Sleeved.gg",
    url: "https://sleeved.gg/grand-archive",
  },
] as const;

/** Opens the external builder immediately to preserve the browser's user-gesture permission. */
export async function copyDecklistAndOpen(text: string, url: string): Promise<void> {
  window.open(url, "_blank", "noopener,noreferrer");
  await navigator.clipboard.writeText(text);
}
