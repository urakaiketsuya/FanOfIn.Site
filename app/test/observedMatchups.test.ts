import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AnalysisMatchups from '../src/features/deck-analysis/AnalysisMatchups';
import type { DeckTestResult } from '../src/lib/deckTestResult';

const result = {
  classification: { cluster: { id: 'mine', name: 'Matched build' }, similarity: .4, status: 'borderline' },
  performance: { winRate: .5, interval95: { matches: 101 }, deckCount: 20, eventCount: 5, confidence: 'emerging' },
  matchups: [1, 20, 3, 8].map(games => ({ opponentClusterId: String(games), opponentClusterName: `Build ${games}`, opponentChampionName: `Champion ${games}`, games, baselineWinRate: games === 1 ? 1 : .5 })),
  winConditions: [],
} as unknown as DeckTestResult;
const render = (value: DeckTestResult) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AnalysisMatchups, { result: value, loading: false, cards: new Map(), preview: true })));

test('observed preview prioritizes samples, retains cohort scope, and does not sum matchup samples', () => {
  const html = render(result);
  assert.ok(html.indexOf('Champion 20') < html.indexOf('Champion 8'));
  assert.ok(html.indexOf('Champion 8') < html.indexOf('Champion 3'));
  assert.doesNotMatch(html, /Champion 1</);
  assert.match(html, /101/);
  assert.match(html, /Loose match/);
  assert.match(html, /Limited data/);
  assert.match(html, /All 4 matchups/);
});

test('empty opponent data remains distinct from the aggregate record', () => {
  const html = render({ ...result, matchups: [] });
  assert.match(html, /101/);
  assert.match(html, /No recorded opponent matchups/);
  assert.doesNotMatch(html, /<article/);
});
