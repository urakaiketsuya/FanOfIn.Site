import { artistSocialImageAlt, type ArtistIdentity } from '@gatcg/shared';

declare const __ARTIST_SOCIAL_IMAGES__: Record<string, string>;

/** This map is embedded by Vite from the same catalog that generates the JPEGs. */
export function artistSharePreview(artist?: ArtistIdentity) {
  const path = __ARTIST_SOCIAL_IMAGES__[artist?.id ?? 'directory'];
  return path ? { src: `https://fanofin.site${path}`, alt: artistSocialImageAlt(artist) } : undefined;
}
