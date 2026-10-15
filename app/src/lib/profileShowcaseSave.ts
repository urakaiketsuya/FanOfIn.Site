import type { ProfileShowcase } from '@gatcg/shared';

/** Older account services can accept a save while silently dropping new fields. */
export function verifyShowcaseFavorites(requested: ProfileShowcase, saved: ProfileShowcase): void {
  for (const key of ['favoriteArtistIds', 'favoriteSetIds'] as const) {
    if (JSON.stringify(requested[key] ?? []) !== JSON.stringify(saved[key] ?? [])) {
      throw new Error('Your favorite artists or sets were not saved. Your selections are kept. Please retry after the account service is updated.');
    }
  }
}
