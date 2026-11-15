import test from "node:test";
import assert from "node:assert/strict";
import { merchandiseCatalog as catalog } from "@gatcg/shared";
import photos from "../src/features/merchandise/reviewedPhotos.json";
import { reviewedPhotoFor } from "../src/features/merchandise/reviewedPhotos";

test("reviewed merchandise photos cannot leak into another variant or refreshed source row", () => {
  assert.equal(new Set(photos.map(photo => photo.catalogId)).size, photos.length);
  for (const photo of photos) {
    const item = catalog.find(row => row.id === photo.catalogId);
    assert.ok(item, photo.catalogId);
    assert.equal(reviewedPhotoFor(item), photo);
    for (const change of [{ name: "Another artwork" }, { category: "Another product category" }, { detail: "Another release" }, { id: "another-row" }]) {
      assert.equal(reviewedPhotoFor({ ...item, ...change }), undefined);
    }
    assert.equal(new URL(photo.imageUrl).protocol, "https:");
    assert.equal(new URL(photo.sourceUrl).protocol, "https:");
  }
});

test("group and cached-reference images retain their distinct attribution", () => {
  assert.deepEqual(photos.filter(photo => photo.group).map(photo => photo.catalogId).sort(), ["sheet-12-i13", "sheet-12-i14", "sheet-12-i15"]);
  const jin = photos.find(photo => photo.catalogId === "sheet-12-b18");
  assert.equal(jin?.kind, "reference");
  assert.equal(photos.some(photo => photo.catalogId === "sheet-12-f18"), false);
});
