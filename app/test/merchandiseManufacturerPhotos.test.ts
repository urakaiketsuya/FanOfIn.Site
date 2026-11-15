import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/features/merchandise/catalog.json";
import photos from "../src/features/merchandise/manufacturerPhotos.json";
import { manufacturerPhotoFor } from "../src/features/merchandise/manufacturerPhotos";

test("manufacturer photos preserve reviewed product identity and retail variants", () => {
  assert.equal(new Set(photos.map(photo => photo.catalogId)).size, photos.length);
  for (const photo of photos) {
    const item = catalog.find(entry => entry.id === photo.catalogId);
    assert.ok(item);
    assert.equal(manufacturerPhotoFor(item), photo);
    assert.equal(manufacturerPhotoFor({ ...item, category: "Deckboxes" }), undefined);
    assert.equal(manufacturerPhotoFor({ ...item, detail: "Worlds 2026" }), undefined);
    assert.equal(manufacturerPhotoFor({ ...item, name: "Different artwork" }), undefined);
    assert.ok(["www.dragonshield.com", "ga-mainsite-common.s3.us-west-2.amazonaws.com"].includes(new URL(photo.imageUrl).hostname));
    assert.ok(["www.dragonshield.com", "www.gatcg.com"].includes(new URL(photo.productUrl).hostname));
  }
  for (const item of catalog.filter(entry => entry.name.startsWith("BCW ") || entry.detail.startsWith("Worlds"))) {
    assert.equal(manufacturerPhotoFor(item), undefined);
  }
});
