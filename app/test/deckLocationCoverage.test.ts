import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { SavedDeck } from '@gatcg/shared';
import DeckLocationCoverage from '../src/features/collection/DeckLocationCoverage';

test('official product locations never link to a synthetic saved-deck ID', () => {
  const decks = ['official-product:starter', 'saved-deck'].map(id => ({
    id, title: id, decklist: {main: [], material: [], sideboard: []},
  })) as SavedDeck[];
  const markup = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(DeckLocationCoverage, {decks, cards: [], entries: [], records: [], onAssign() {}})));
  assert.match(markup, /href="\/official-decks"/);
  assert.match(markup, /href="\/decks\/saved-deck"/);
  assert.doesNotMatch(markup, /href="\/decks\/official-product/);
});
