import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { basicDeckStats, cardAccess } from '@gatcg/shared';
import DeckConsistency from '../src/components/DeckConsistency';

test('missing catalog still presents named card access with exact aggregated quantities', () => {
  const catalog = new Map();
  const stats = basicDeckStats([{ card: 'Example card', quantity: 2 }, { card: 'Example card', quantity: 1 }, { card: 'Other card', quantity: 57 }], catalog);
  const html = renderToStaticMarkup(createElement(DeckConsistency, { size: stats.total, groups: stats.copies, cardsByName: catalog }));
  assert.match(html, /Example card/);
  assert.match(html, /3 copies in Main/);
  assert.ok(html.includes(`${(cardAccess(60, 3, 7).access * 100).toFixed(1)}%`));
  assert.match(html, /Current/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('empty and small decks render without invalid draw populations', () => {
  const empty = renderToStaticMarkup(createElement(DeckConsistency, { size: 0, groups: [], cardsByName: new Map() }));
  assert.match(empty, /Add Main cards/);
  const stats = basicDeckStats([{ card: 'Only card', quantity: 2 }], new Map());
  const html = renderToStaticMarkup(createElement(DeckConsistency, { size: stats.total, groups: stats.copies, cardsByName: new Map() }));
  assert.match(html, /100.0%/);
  assert.match(html, /2 seen/);
});

test('automatic summary covers every card at the shared checkpoints before calculator controls', () => {
  const stats = basicDeckStats([{ card: 'First', quantity: 4 }, { card: 'Second', quantity: 56 }], new Map());
  const html = renderToStaticMarkup(createElement(DeckConsistency, { size: stats.total, groups: stats.copies, cardsByName: new Map() }));
  const summary = html.slice(0, html.indexOf('Explore copy counts'));
  for (const seen of [7, 10, 15, 20]) {
    assert.ok(summary.includes(`${seen} seen`));
    assert.ok(summary.includes(`${(cardAccess(60, 4, seen).access * 100).toFixed(1)}%`));
  }
  assert.match(summary, /First/);
  assert.match(summary, /Second/);
  assert.doesNotMatch(summary, /<select/);
});
