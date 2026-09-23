import type { Card, CardEdition, CardOrientation } from "@gatcg/shared";

/**
 * Returns the API-linked printed faces for one exact edition. Rules text is deliberately not used:
 * some cards say “transform” because they transform another object, while flip relationships are
 * represented explicitly by `other_orientations` on the edition.
 */
export function alternateFacesForEdition(edition: CardEdition | undefined): CardOrientation[] {
  if (!edition) return [];
  return (edition.other_orientations ?? []).filter((face) => Boolean(face.name && face.edition?.image));
}

/** The first alternate face for compact previews. Current official data has at most one per face. */
export function primaryAlternateFace(card: Card | undefined, edition = card?.editions[0]): CardOrientation | undefined {
  return alternateFacesForEdition(edition)[0];
}
