import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SavedDeckDetail } from "@gatcg/shared";
import { DeckVersionHistory } from "../src/features/account/DeckVersionHistory";

test("history shows version summaries without reading historical decklists", () => {
  const versions = Array.from({ length: 100 }, (_, index) => ({
    id: `version-${index}`,
    get decklist() { throw new Error("History summaries must not read decklists"); },
  }));
  const deck = { currentVersionId: "version-99", versions } as unknown as SavedDeckDetail;
  const markup = renderToStaticMarkup(createElement(DeckVersionHistory, { deck, busy: false, onRestore: () => {} }));
  assert.match(markup, /Version history/);
  assert.match(markup, /100/);
  assert.match(markup, /aria-expanded="false"/);
  assert.doesNotMatch(markup, /UserDecklistPanel/);
});
