import type { Card, CardEdition } from './api-types';
import type { CardStat } from './analysis-types';
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
  /** Curated pronunciation of the native-script name, never an identity alias. */
  pronunciation?: {
    /** Exact native-script substring to annotate; excludes Latin prefixes and suffixes. */
    nativeText: string;
    text: string;
    lang: 'zh-Latn-pinyin' | 'ja-Latn' | 'en';
    basis: 'standard-mandarin' | 'artist-confirmed' | 'estimated';
    sourceUrl?: string;
  };
  kind: 'individual' | 'studio' | 'combined' | 'unknown';
  /** Studio named in this artist’s catalog credits; does not imply current employment. */
  studioId?: string;
  credits: string[];
  links: ArtistLink[];
  portrait?: {
    src: string;
    fit?: 'cover' | 'contain';
    framing?: 'card-art';
    position?: string;
    scale?: number;
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

export function buildArtistGalleries(cards: readonly Card[], popularity: readonly Pick<CardStat, 'name' | 'slug' | 'deckCount'>[] = []): ArtistGallery[] {
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
  const bySlug = new Map(popularity.filter(stat => stat.slug).map(stat => [stat.slug, stat.deckCount]));
  const byName = new Map(popularity.map(stat => [stat.name, stat.deckCount]));
  const usage = (entry: ArtistCard) => bySlug.get(entry.card.slug) ?? byName.get(entry.card.name) ?? 0;
  for (const artist of artists.values()) artist.cards.sort((a, b) => usage(b) - usage(a) || a.card.name.localeCompare(b.card.name));
  return [...artists.values()].sort((a, b) => b.cards.length - a.cards.length || a.name.localeCompare(b.name));
}

/** Match curated names and readings using plain letters, with optional spacing. */
export function normalizeArtistSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s\p{P}]+/gu, '');
}

export function matchesArtistSearch(artist: Pick<ArtistIdentity, 'id' | 'name' | 'credits' | 'pronunciation'>, query: string): boolean {
  const needle = normalizeArtistSearch(query);
  return [artist.id, artist.name, ...artist.credits, artist.pronunciation?.text ?? ''].some(value => normalizeArtistSearch(value).includes(needle));
}
