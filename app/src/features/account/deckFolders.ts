import type { DeckFolder, SavedDeck } from "@gatcg/shared";
export function decksInFolder(decks: SavedDeck[], folders: DeckFolder[], selected: string): SavedDeck[] {
  if (!selected) return decks;
  const ids = new Set(selected === "unfiled" ? folders.flatMap(folder => folder.deckIds) : folders.find(folder => folder.id === selected)?.deckIds ?? []);
  return decks.filter(deck => selected === "unfiled" ? !ids.has(deck.id) : ids.has(deck.id));
}
