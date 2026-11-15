import test from "node:test";
import assert from "node:assert/strict";
import { merchandiseCatalog as catalog } from "@gatcg/shared";
import { sellerPhotoFor, sellerPhotos } from "../src/features/merchandise/sellerPhotos";

test("seller photos resolve only to their reviewed source name and product type", () => {
  for (const photo of sellerPhotos) {
    const item = catalog.find(entry => entry.id === photo.catalogId);
    assert.ok(item, `Missing source row ${photo.catalogId}`);
    assert.equal(sellerPhotoFor(item), photo);
    assert.equal(sellerPhotoFor({ ...item, name: "Different item after refresh" }), undefined);
    assert.equal(sellerPhotoFor({ ...item, category: "Standees" }), undefined);
    assert.equal(new URL(photo.listingUrl).hostname, "www.ebay.com");
    assert.equal(new URL(photo.imageUrl).hostname, "i.ebayimg.com");
  }
  const standee = catalog.find(entry => entry.name === "Merlin, Memory Thief" && entry.category === "Standees");
  assert.ok(standee);
  assert.equal(sellerPhotoFor(standee), undefined);
});

test("conflicting seller metadata does not become a catalog photo", () => {
  const raziel = catalog.find(entry => entry.id === "sheet-12-i18");
  assert.ok(raziel);
  assert.equal(sellerPhotoFor(raziel), undefined);
});

test("Nia photo does not silently merge duplicate source observations", () => {
  const original = catalog.find(entry => entry.id === "sheet-12-b13");
  const duplicate = catalog.find(entry => entry.id === "sheet-12-b24");
  assert.ok(original && duplicate);
  assert.ok(sellerPhotoFor(original));
  assert.equal(sellerPhotoFor(duplicate), undefined);
});
