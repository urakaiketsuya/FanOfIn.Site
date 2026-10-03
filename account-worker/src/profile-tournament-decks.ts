import { decodeCardLines, deckDetailPartition, type DeckDetailData, type ProfileTournamentDeck } from "@gatcg/shared";
import type { Env } from "./auth";
import { assetJson } from "./assets";

/** Public profiles never publish the editable text in private favorite snapshots. */
export async function resolveProfileTournamentDecks(env: Env, hashes: string[]): Promise<ProfileTournamentDeck[]> {
  const partitions = new Map<string, Promise<DeckDetailData>>();
  return (await Promise.all(hashes.map(async deckHash => {
    const partition = deckDetailPartition(deckHash);
    let data = partitions.get(partition);
    if (!data) {
      data = assetJson<DeckDetailData>(env, `/data/analysis/deck-details/${partition}.json`);
      partitions.set(partition, data);
    }
    const detail = await data;
    const sighting = detail.popularity.entries.find(entry => entry.deckHash === deckHash);
    const cards = sighting && detail.cards.decks.find(entry => entry.deckId === sighting.deckId);
    if (!sighting || !cards) return null;
    return { deckHash, championName: sighting.championName, materialPreview: decodeCardLines(cards.material, detail.cards.cardNames).slice(0, 4).map(line => ({ card: line.name, quantity: line.quantity })) };
  }))).filter((deck): deck is ProfileTournamentDeck => deck !== null);
}
