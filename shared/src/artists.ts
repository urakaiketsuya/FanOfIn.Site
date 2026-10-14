import type { Card, CardEdition } from './api-types';
import { artistDirectory } from './artistDirectory';

export interface ArtistLink {
  platform: string;
  label: string;
  url: string;
  evidence: string;
  verifiedAt: string;
}
export interface ArtistIdentity {
  id: string;
  slug: string;
  /** Previous directory URLs retained after a curated identity merge. */
  slugAliases?: string[];
  name: string;
  kind: 'individual' | 'studio' | 'combined' | 'unknown';
  /** Studio named in this artist’s catalog credits; does not imply current employment. */
  studioId?: string;
  credits: string[];
  links: ArtistLink[];
  portrait?: {
    src: string;
    sourceUrl: string;
    imageUrl: string;
    verifiedAt: string;
  };
}
export interface ArtistCard {
  card: Card;
  editions: CardEdition[];
}
export interface ArtistGallery extends ArtistIdentity {
  cards: ArtistCard[];
  printingCount: number;
}

/** Unknown new credits remain browsable without borrowing another identity's accounts. */
export function artistForCredit(credit: string): ArtistIdentity {
  const name = credit.trim();
  const curated = artistDirectory.find(artist => artist.credits.includes(name));
  if (curated) return curated;
  // Exact UTF-8-independent encoding is collision-free and stable across catalog refreshes.
  const id = 'credit-' + Array.from(name).map(c => c.codePointAt(0)!.toString(16)).join('-');
  return { id, slug: id, name, kind: 'unknown', credits: [name], links: [] };
}

export function buildArtistGalleries(cards: readonly Card[]): ArtistGallery[] {
  const artists = new Map<string, ArtistGallery>();
  for (const card of cards) {
    const editionsByArtist = new Map<string, CardEdition[]>();
    for (const edition of card.editions) {
      if (!edition.illustrator?.trim()) continue;
      const identity = artistForCredit(edition.illustrator);
      if (!artists.has(identity.id)) artists.set(identity.id, { ...identity, cards: [], printingCount: 0 });
      const editions = editionsByArtist.get(identity.id) ?? [];
      if (!editions.some(existing => existing.uuid === edition.uuid)) editions.push(edition);
      editionsByArtist.set(identity.id, editions);
    }
    for (const [id, editions] of editionsByArtist) {
      const artist = artists.get(id)!;
      artist.cards.push({ card, editions });
      artist.printingCount += editions.length;
    }
  }
  for (const artist of artists.values()) artist.cards.sort((a, b) => a.card.name.localeCompare(b.card.name));
  return [...artists.values()].sort((a, b) => b.cards.length - a.cards.length || a.name.localeCompare(b.name));
}
