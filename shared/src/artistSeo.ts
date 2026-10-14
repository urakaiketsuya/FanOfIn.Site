import type { ArtistGallery, ArtistIdentity } from './artists';

export function artistPagePath(artist?: ArtistIdentity): string {
  return artist ? `/artists/${encodeURIComponent(artist.slug)}/` : '/artists/';
}

export function artistPageMetadata(artist?: ArtistIdentity, gallery?: ArtistGallery) {
  const title = artist ? `${artist.name} — Grand Archive ${artist.kind === 'studio' ? 'Studio' : 'Artist'} & Artwork` : 'Grand Archive Artist Directory — Artwork & Official Accounts';
  const examples = gallery?.cards.slice(0, 3).map(entry => entry.card.name).join(', ');
  const description = artist
    ? `Explore ${artist.name}’s Grand Archive card artwork${examples ? `, including ${examples}` : ''}${artist.links.length ? ', and find their official accounts' : ''}.`
    : 'Discover the artists and studios behind Grand Archive cards. Browse credited artwork, card printings, and official artist accounts.';
  return { title, description, path: artistPagePath(artist) };
}
