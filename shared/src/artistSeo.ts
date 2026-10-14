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

/** Version changes invalidate cached previews when the composition changes. */
export function artistSocialImagePath(artist?: ArtistIdentity, gallery?: ArtistGallery, galleries: ArtistGallery[] = []): string {
  const summary = (entry: ArtistIdentity, artwork?: ArtistGallery) => [entry.id, entry.name, entry.kind, entry.portrait?.src, entry.portrait?.imageUrl, entry.portrait?.fit, entry.portrait?.framing, Boolean(entry.links.length), artwork?.cards.length ?? 0, artistSocialEditions(artwork).map(edition => [edition.uuid, edition.image])];
  const input = JSON.stringify(['artist-share-v1', artist ? summary(artist, gallery) : galleries.map(entry => summary(entry, entry))]);
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return `/media/social/artists/${artist?.id ?? 'directory'}-${(hash >>> 0).toString(16)}.jpg`;
}

export function artistSocialImageAlt(artist?: ArtistIdentity): string {
  return artist ? `${artist.name} — Grand Archive artwork on Fan of Insight` : 'Meet the Grand Archive artists and studios on Fan of Insight';
}

/** Exact credited editions used by both the offline image cache and sharing metadata. */
export function artistSocialEditions(gallery?: ArtistGallery) {
  const entries = gallery?.cards ?? [];
  const preferred = gallery?.id === 'a004' ? ['fcng06fi6r', 'uDX4LsaLl3'] : [];
  const selected = preferred.flatMap(uuid => entries.flatMap(entry => entry.editions.filter(edition => edition.uuid === uuid)));
  for (const entry of entries) {
    if (selected.length >= 2) break;
    if (!selected.some(edition => entry.editions.some(candidate => candidate.uuid === edition.uuid))) selected.push(entry.editions[0]);
  }
  return selected.slice(0, 2).filter(edition => /^[\w-]+$/.test(edition.uuid) && /^\/cards\/images\/[\w-]+\.(jpg|jpeg|png|webp)$/.test(edition.image ?? ''));
}
