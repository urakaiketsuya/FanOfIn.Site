import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { DeckPopularityEntry } from "@gatcg/shared";
import TopDecksList from "../src/components/TopDecksList";
import { toTopDecksListEntry } from "../src/features/topdecks/topDecksListEntry";

const entry: DeckPopularityEntry = {
  deckId: "77:30", eventId: 77, player: 30, championName: "Lorraine",
  eventDate: "2026-10-01", placement: 1, wins: 5, losses: 0, ties: 0,
  weightedScore: 1, winRate: 1, underplaced: false, deckHash: "abc123",
};

function renderResult(source: DeckPopularityEntry) {
  const deck = toTopDecksListEntry(source, new Map([[77, "Test event"]]));
  return renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(TopDecksList, { decks: [deck], playerName: () => "Test player" })));
}

test("published deck results preserve their deck page destination through the shared adapter", () => {
  const html = renderResult(entry);
  assert.match(html, /href="\/decks\/abc123"/);
  assert.match(html, /aria-label="Open Test player&#x27;s deck list"/);
  assert.equal(toTopDecksListEntry(entry, new Map()).eventDate, entry.eventDate);
});

test("legacy and unhashed results still open the exact player's event decklist", () => {
  for (const deckHash of [undefined, null, ""]) {
    const html = renderResult({ ...entry, deckHash });
    assert.match(html, /href="\/events\/77\?tab=decklists&amp;player=30"/);
    assert.match(html, />Open deck<\/a>/);
  }
});
