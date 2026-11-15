import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/features/merchandise/catalog.json";
import { imgurEmbedUrl } from "../src/features/merchandise/photoPresentation";

test("embeds source albums without treating album IDs as image filenames", () => {
  assert.equal(imgurEmbedUrl("https://imgur.com/a/SCymgAP"), "https://imgur.com/a/SCymgAP/embed?pub=true");
  assert.equal(imgurEmbedUrl("https://imgur.com/a/frostsworn-paladin-creator-s-guild-CjFSHpX"), "https://imgur.com/a/CjFSHpX/embed?pub=true");
  assert.equal(imgurEmbedUrl("https://imgur.com/T4MbCDv"), "https://imgur.com/T4MbCDv/embed?pub=true");
  const sourceLinks = catalog.filter(item => item.photoUrl && new URL(item.photoUrl).hostname === "imgur.com");
  assert.equal(sourceLinks.length, 253);
  for (const item of sourceLinks) assert.ok(imgurEmbedUrl(item.photoUrl), item.photoUrl);
});

test("unsupported galleries and untrusted hosts never become iframe sources", () => {
  for (const url of ["", "javascript:alert(1)", "https://imgur.com.evil.test/a/SCymgAP", "https://ibb.co/Q3vsV5hy", "https://imgur.com/upload", "http://imgur.com/a/SCymgAP"]) {
    assert.equal(imgurEmbedUrl(url), undefined);
  }
});

test("every ImgBB gallery uses its extracted image and retains its source identity", async () => {
  const { galleryImageUrl } = await import("../src/features/merchandise/photoPresentation");
  const sourceLinks = catalog.filter(item => item.photoUrl.startsWith("https://ibb.co/"));
  assert.equal(sourceLinks.length, 77);
  for (const item of sourceLinks) {
    const image = galleryImageUrl(item.photoUrl);
    assert.ok(image, item.photoUrl);
    assert.equal(new URL(image).hostname, "i.ibb.co");
    assert.equal(new URL(image).protocol, "https:");
    assert.match(new URL(image).pathname, /\.(jpg|png)$/);
    assert.equal(galleryImageUrl(`${item.photoUrl}/different`), undefined);
  }
  assert.equal(galleryImageUrl("https://ibb.co/Q3vsV5hy"), "https://i.ibb.co/XrxmPw6c/Conniving-Plans-PR.jpg");
  assert.equal(galleryImageUrl("__proto__"), undefined);
  assert.equal(galleryImageUrl("https://ibb.co/unknown"), undefined);
});
