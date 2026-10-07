import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import AggressionForecast from "../src/features/decks/AggressionForecast";
import { computeAggressionForecast } from "../src/lib/aggressionForecast";

function render(mainLines: { name: string; quantity: number }[], cardsByName: Map<string, Card>) {
  return renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(AggressionForecast, {
    forecast: computeAggressionForecast(mainLines, cardsByName), mainLines, cardsByName, materialLines: [],
  })));
}

test("empty damage data renders no misleading damage panel", () => {
  assert.equal(render([], new Map()), "");
});

test("missing catalog data remains visible in coverage rather than marked complete", () => {
  const html = render([{ name: "Unresolved Card", quantity: 1 }], new Map());
  assert.match(html, /Missing card data/);
  assert.match(html, /Unresolved Card/);
  assert.doesNotMatch(html, /All damage text classified/);
});

test("automatic forecast shows card-name fallback and has no board-state configuration", () => {
  const card = { name: "Fireball", slug: "fireball", effect: "Deal 1+LV damage to target unit.", types: ["ACTION"], subtypes: ["MAGE", "SPELL"], elements: ["FIRE"], editions: [] } as unknown as Card;
  const html = render([{ name: card.name, quantity: 4 }], new Map([[card.name, card]]));
  assert.match(html, /data-component="CardArtTile"/);
  assert.match(html, /href="\/cards\/fireball"/);
  assert.match(html, /Fireball/);
  assert.doesNotMatch(html, /<(?:input|select)|Set damage conditions|Reset conditions/);
});
