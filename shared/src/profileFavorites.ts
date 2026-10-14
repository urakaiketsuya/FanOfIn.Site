import { artistDirectory } from './artistDirectory.js';
import { profileSetOptions } from './setFamilies.js';
import type { ProfileFavorites } from './saved-deck-types.js';

export const PROFILE_FAVORITES_LIMIT = 6;
export const profileArtistOptions = artistDirectory.map(({ id, name, slug }) => ({ id, name, slug })).sort((a, b) => a.name.localeCompare(b.name));

/** These are trusted catalog references, never user-authored display text. */
export function parseProfileFavorites(input: Record<string, unknown>): ProfileFavorites {
  const result: ProfileFavorites = {};
  for (const [key, options] of [["favoriteArtistIds", profileArtistOptions], ["favoriteSetIds", profileSetOptions]] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > PROFILE_FAVORITES_LIMIT || new Set(value).size !== value.length || value.some(id => typeof id !== "string" || !options.some(option => option.id === id))) throw new Error(`Choose up to six distinct ${key === "favoriteArtistIds" ? "artists" : "sets"} from the catalog`);
    if (value.length) result[key] = value;
  }
  return result;
}
