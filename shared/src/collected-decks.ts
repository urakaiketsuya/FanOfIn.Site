import type { DeckFormat, DeckLine } from './shoutatyourdecks-types.js';
import type { OmnidexDecklist } from './omnidex-types.js';

/** Existing tournament identity: combined Main + Material quantities; sideboards excluded. */
export function deckBuildSignature(main: DeckLine[], material: DeckLine[]): string {
  const counts = new Map<string, number>();
  for (const line of [...main, ...material]) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  return [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([name, qty]) => `${name}:${qty}`).join('|');
}
export type CollectedLines = [number, number][];
export interface CollectedVariant { id: string; main: CollectedLines; material: CollectedLines; sideboard: CollectedLines }
export interface CollectedBuild {
  id: string;
  tournamentHash: string;
  championName: string | null;
  title: string;
  format: DeckFormat;
  collectedAt: string;
  variants: CollectedVariant[];
}
export interface CollectedDeckData { generatedAt: string; cardNames: string[]; decks: CollectedBuild[] }
export function collectedDecklist(deck: CollectedVariant, names: string[]): OmnidexDecklist {
  const decode = (lines: CollectedLines) => lines.map(([index, quantity]) => ({ card: names[index], quantity }));
  return { main: decode(deck.main), material: decode(deck.material), sideboard: decode(deck.sideboard) };
}

/** Verified tournament sightings take precedence over anonymous collected results. */
export function isCollectedOnlyBuild(deck: CollectedBuild, tournamentHashes: ReadonlySet<string | null>): boolean {
  return deck.format !== "STANDARD" || !tournamentHashes.has(deck.tournamentHash);
}
