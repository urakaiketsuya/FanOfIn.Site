import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import MissingCardShopping from "../src/features/collection/MissingCardShopping";

// The Node TSX runner uses the classic JSX runtime for these component imports.
Object.assign(globalThis, { React });

const card = (name: string): Card => ({ uuid: name, name, slug: name, editions: [], element: "NORM", elements: ["NORM"], types: [], subtypes: [], classes: [] } as unknown as Card);
test("shopping handoff includes missing cards beyond the visual page and encodes names", () => {
  const cards = Array.from({ length: 25 }, (_, i) => card(`Card & ${i}`));
  const html = renderToStaticMarkup(<MemoryRouter><MissingCardShopping cards={cards} /></MemoryRouter>);
  const href = html.match(/href="(https:\/\/www.tcgplayer.com\/massentry[^"]+)"/)?.[1].replaceAll("&amp;", "&");
  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.searchParams.get("productline"), "Grand Archive");
  assert.equal(url.searchParams.get("c")?.split("||").length, 25);
  assert.ok(url.searchParams.get("c")?.includes("1 Card & 24"));
  assert.match(html, /Show more missing cards/);
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});
test("no missing cards means no shopping control", () => {
  assert.equal(renderToStaticMarkup(<MissingCardShopping cards={[]} />), "");
});
