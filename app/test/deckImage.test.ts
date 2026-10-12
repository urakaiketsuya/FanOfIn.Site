import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { deckImageSections } from "../src/lib/deckImage";

const card = { name: "Example", editions: [{ uuid: "default", image: "/default.jpg" }, { uuid: "alternate", image: "/alternate.jpg" }] } as Card;
const cards = new Map([[card.name, card]]);
test("image export preserves section totals, mixed printings, and unspecified copies", () => {
  const sections = [{ title: "Main", lines: [{ card: "Example", quantity: 4, printings: [{ editionUuid: "alternate", quantity: 2 }] }] }, { title: "Sideboard", lines: [{ card: "Example", quantity: 1 }] }];
  const before = JSON.stringify(sections);
  assert.deepEqual(deckImageSections(sections, cards), [
    { title: "Main", total: 4, tiles: [{ name: "Example", quantity: 2, image: "/alternate.jpg" }, { name: "Example", quantity: 2, image: "/default.jpg" }] },
    { title: "Sideboard", total: 1, tiles: [{ name: "Example", quantity: 1, image: "/default.jpg" }] },
  ]);
  assert.equal(JSON.stringify(sections), before);
});
test("unavailable cards and selected printings keep names and quantities instead of substituting artwork", () => {
  const groups = deckImageSections([{ title: "Material", lines: [{ card: "Unknown", quantity: 2 }, { card: "Example", quantity: 1, printings: [{ editionUuid: "missing", quantity: 1 }] }] }, { title: "Main", lines: [] }], cards);
  assert.deepEqual(groups, [{ title: "Material", total: 3, tiles: [{ name: "Unknown", quantity: 2, image: undefined }, { name: "Example", quantity: 1, image: undefined }] }]);
  assert.deepEqual(deckImageSections([], cards), []);
});

test("PNG header includes the deck name and wraps the owner above the card sections", async () => {
  const { renderDeckImage } = await import("../src/lib/deckImage");
  const text: { value: string; y: number }[] = [];
  const context = {
    font: "", fillStyle: "", textAlign: "",
    measureText: (value: string) => ({ width: value.length * 30 }),
    fillRect() {},
    fillText(value: string, _x: number, y: number) { text.push({ value, y }); },
  };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (done: (blob: Blob) => void) => done(new Blob(["png"], { type: "image/png" })) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  try {
    const owner = "A very long player display name that wraps across multiple header lines";
    const result = await renderDeckImage("Slime Party", [{ title: "Main", lines: [{ card: "Unknown", quantity: 4 }] }], new Map(), new AbortController().signal, () => {}, owner);
    assert.equal(text[0].value, "Slime Party");
    const ownerLines = text.slice(1, text.findIndex(item => item.value.startsWith("Fan of Insight")));
    assert.equal(ownerLines.map(item => item.value).join(" "), `By ${owner}`);
    assert.ok(ownerLines.length > 1);
    assert.ok(ownerLines.at(-1)!.y < text.find(item => item.value.startsWith("Fan of Insight"))!.y);
    assert.ok(text.find(item => item.value.startsWith("Fan of Insight"))!.y < text.find(item => item.value === "Main (4)")!.y);
    assert.equal(result.blob.type, "image/png");
    assert.deepEqual(result.missing, ["Unknown"]);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
