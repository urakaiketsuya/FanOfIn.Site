import assert from "node:assert/strict";
import test from "node:test";
import type { Card, CardEdition, CardOrientation } from "@gatcg/shared";
import { alternateFacesForEdition, primaryAlternateFace } from "../src/lib/cardFaces";

function orientation(name: string, image: string): CardOrientation {
  return { uuid: name, name, edition: { image } } as CardOrientation;
}

function edition(uuid: string, faces?: CardOrientation[]): CardEdition {
  return { uuid, image: `/cards/images/${uuid}.jpg`, other_orientations: faces } as CardEdition;
}

test("resolves the reverse face attached to the selected printing", () => {
  const firstBack = orientation("Daunting Panda", "/cards/images/panda-1.jpg");
  const promoBack = orientation("Daunting Panda", "/cards/images/panda-promo.jpg");
  const card = { editions: [edition("front-1", [firstBack]), edition("front-promo", [promoBack])] } as Card;

  assert.equal(primaryAlternateFace(card)?.edition.image, "/cards/images/panda-1.jpg");
  assert.equal(primaryAlternateFace(card, card.editions[1])?.edition.image, "/cards/images/panda-promo.jpg");
});

test("does not infer a backside from the word transform", () => {
  const card = {
    effect: "Return that ally to the field transformed at the beginning of the next end phase.",
    editions: [edition("auspicious-manifestation")],
  } as Card;

  assert.equal(primaryAlternateFace(card), undefined);
});

test("filters incomplete orientation records and preserves all valid faces", () => {
  const valid = orientation("Reverse face", "/cards/images/reverse.jpg");
  const missingImage = { ...orientation("Missing image", ""), edition: { image: "" } } as CardOrientation;
  assert.deepEqual(alternateFacesForEdition(edition("front", [missingImage, valid])), [valid]);
});
