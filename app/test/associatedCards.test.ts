import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import AssociatedCards from "../src/components/AssociatedCards";
import DeckAccessSummary from "../src/features/account/DeckAccessSummary";

test("associated cards combine copies across sections and preserve unknown-card names", () => {
  const known = { name: "Known", slug: "known", editions: [] } as unknown as Card;
  const lines = [{ name: "Known", quantity: 3 }, { name: "Known", quantity: 1 }, { name: "Missing", quantity: 2 }];
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(AssociatedCards, {
    lines, cardsByName: new Map([["Known", known]]), highlighted: new Set(["Known"]),
  })));
  assert.equal((html.match(/href="\/cards\/known"/g) ?? []).length, 1);
  assert.match(html, /4 copies/);
  assert.match(html, /Missing/);
  assert.match(html, /2 copies/);
  assert.equal((html.match(/✓ Contributes/g) ?? []).length, 1);
  assert.deepEqual(lines.map(line => line.quantity), [3, 1, 2]);
});

test("access summary uses combined main copies and does not invent odds for an empty list", () => {
  const render = (mainLines: { name: string; quantity: number }[]) => renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(DeckAccessSummary, {
    mainLines, cardsByName: new Map(),
  })));
  const html = render([{ name: "Unknown", quantity: 2 }, { name: "Unknown", quantity: 2 }, { name: "Other", quantity: 56 }]);
  assert.match(html, /52\.8%/);
  assert.match(html, /4 copies/);
  assert.doesNotMatch(render([]), /0%/);
  assert.match(render([]), /Add Main cards/);
  const incomplete = render([{ name: "Unknown", quantity: 4 }]);
  assert.match(incomplete, /Incomplete Main deck/);
  assert.match(incomplete, /100\.0%/);
});
