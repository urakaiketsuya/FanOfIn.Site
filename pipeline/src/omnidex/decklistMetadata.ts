import type { OmnidexDecklistMetadata } from '@gatcg/shared';

/** An ambiguous multi-champion summary must not arbitrarily select one identity. */
export function metadataChampion(metadata: OmnidexDecklistMetadata | undefined): string | null {
  const names = [...new Set((metadata?.champions?.named ?? []).map(card => card.name?.trim()).filter(Boolean))];
  return names.length === 1 ? names[0]! : null;
}
