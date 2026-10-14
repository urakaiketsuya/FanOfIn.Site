import { artistDirectory } from '../shared/src/artistDirectory.ts';
import { readArtistGalleries } from './artist-gallery-data.mjs';
import { artistSocialImagePath } from '../shared/src/artistSeo.ts';

/** Embed published URLs without depending on the browser's cached catalog. */
export function artistSocialManifest() {
  const galleries = readArtistGalleries();
  const identities = [...artistDirectory, ...galleries.filter(gallery => !artistDirectory.some(artist => artist.id === gallery.id))];
  return Object.fromEntries([
    ['directory', artistSocialImagePath(undefined, undefined, galleries)],
    ...identities.map(artist => [artist.id, artistSocialImagePath(artist, galleries.find(gallery => gallery.id === artist.id), galleries)]),
  ]);
}
