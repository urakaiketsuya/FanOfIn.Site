import { readFileSync } from 'node:fs';
import { artistDirectory } from '../shared/src/artistDirectory.ts';
import { buildArtistGalleries } from '../shared/src/artists.ts';
import { artistSocialImagePath } from '../shared/src/artistSeo.ts';

/** Embed published URLs without depending on the browser's cached catalog. */
export function artistSocialManifest() {
  const catalog = JSON.parse(readFileSync(new URL('../data/card-catalog.json', import.meta.url), 'utf8'));
  const galleries = buildArtistGalleries(catalog.cards);
  const identities = [...artistDirectory, ...galleries.filter(gallery => !artistDirectory.some(artist => artist.id === gallery.id))];
  return Object.fromEntries([
    ['directory', artistSocialImagePath(undefined, undefined, galleries)],
    ...identities.map(artist => [artist.id, artistSocialImagePath(artist, galleries.find(gallery => gallery.id === artist.id), galleries)]),
  ]);
}
