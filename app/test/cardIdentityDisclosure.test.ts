import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardHero from "../src/features/cards/CardHero";

test("card identity displays additional subtypes once without repeating class labels", () => {
  const card = { name: "Test card", classes: ["CLERIC"], types: ["ACTION"], elements: ["FIRE"], subtypes: ["CLERIC", "SPELL", "SPELL"], editions: [], effect: "", flavor: "" } as unknown as Card;
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CardHero, {
    card, editionIndex: 0, editionsExpanded: false, priceSeries: null, rarityLabel: () => "", onEditionChange: () => {}, onEditionsExpandedChange: () => {},
  })));
  assert.match(html, /cards\?class=CLERIC/);
  assert.doesNotMatch(html, /cards\?subtype=CLERIC/);
  assert.equal((html.match(/cards\?subtype=SPELL/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<summary[^>]*>.*subtypes/);
});
