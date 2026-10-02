import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DeckPreviewCard, { type DeckPreviewModel } from "../src/components/DeckPreviewCard";

const model: DeckPreviewModel = {
  id: "snapshot", title: "Saved tournament snapshot", source: { kind: "event", label: "Tournament" },
  decklist: { material: [{ card: "Missing catalog champion", quantity: 1 }], main: [{ card: "Main card", quantity: 4 }, { card: "Another card", quantity: 2 }], sideboard: [{ card: "Side card", quantity: 3 }] },
};
function render(value: DeckPreviewModel) {
  return renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(DeckPreviewCard, { model: value, cardsByName: new Map(), view: { to: "/decks/snapshot" } }),
  ));
}

function counts(html: string) {
  return [...html.matchAll(/<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g)]
    .map(([, label, value]) => [label, value]);
}

test("immutable previews count copies, retain sideboards and name cards missing from the catalog", () => {
  const before = JSON.stringify(model);
  const html = render(model);
  assert.deepEqual(counts(html), [["Main deck", "6"], ["Sideboard", "3"]]);
  assert.match(html, /Missing catalog champion/);
  assert.match(html, /View list: Saved tournament snapshot/);
  assert.match(html, /href="\/decks\/snapshot"/);
  assert.equal(JSON.stringify(model), before);
});

test("a summary sample never becomes a full deck or an invented zero sideboard", () => {
  const html = render({ ...model, decklist: null, mainCount: 60, preview: { label: "Featured cards", lines: [{ name: "Sample card", quantity: 4 }] } });
  assert.deepEqual(counts(html), [["Main deck", "60"], ["Sideboard", "Unknown"]]);
  assert.match(html, /Sample card/);
  assert.deepEqual(counts(render({ ...model, sideboardCount: null })), [["Main deck", "6"], ["Sideboard", "Unknown"]]);
});

test("expanded source errors remain visible and associated with the list disclosure", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(DeckPreviewCard, {
      model: { ...model, decklist: null }, cardsByName: new Map(),
      view: { expanded: true, onToggle: () => {}, content: createElement("p", { role: "alert" }, "Decklist unavailable") },
    }),
  ));
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /role="alert">Decklist unavailable/);
  const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
  assert.ok(controls && html.includes(`id="${controls}"`));
});
