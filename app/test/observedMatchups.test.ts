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
  assert.doesNotMatch(html, /Observed matchups|No recorded opponent matchups/);
  assert.doesNotMatch(html, /<article/);
});

test('filtered results replace all-time totals, show cohort scope, and distinguish empty rates', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AnalysisMatchups, {
    result: { ...result, matchups: [] }, loading: false, cards: new Map(),
    observed: { winRate: null, results: 0, decks: 0, events: 0, matchups: [] }, observedLabel: '2026-10-01 – 2026-10-31 · All events',
  })));
  assert.equal(html, '');
  assert.doesNotMatch(html, /101|Limited data|Historical win rate/);
});

test('previous periods use inclusive UTC days, preserve format, and reject incomplete or event scopes', async () => {
  const { previousMatchupScope, emptyMatchupScope } = await import('@gatcg/shared');
  const scope = { ...emptyMatchupScope, from: '2024-03-01', to: '2024-03-31', format: 'Standard' };
  assert.deepEqual(previousMatchupScope(scope), { ...scope, from: '2024-01-30', to: '2024-02-29' });
  assert.equal(previousMatchupScope({ ...scope, event: '1' }), null);
  assert.equal(previousMatchupScope({ ...scope, to: '' }), null);
  assert.equal(previousMatchupScope({ ...scope, to: '2024-02-30' }), null);
  assert.equal(previousMatchupScope({ ...scope, to: '2024-02-01' }), null);
  assert.deepEqual(previousMatchupScope({ ...scope, to: scope.from }), { ...scope, from: '2024-02-29', to: '2024-02-29' });
});

test('period comparison keeps empty samples distinct from zero performance', async () => {
  const { default: Comparison } = await import('../src/features/deck-analysis/MatchupPeriodComparison');
  const { emptyMatchupScope } = await import('@gatcg/shared');
  const current = { winRate: 0, results: 5, decks: 1, events: 1, matchups: [] };
  const html = renderToStaticMarkup(createElement(Comparison, { current, previous: { ...current, winRate: null, results: 0 }, scope: emptyMatchupScope, previousScope: emptyMatchupScope }));
  assert.match(html, /0%/); assert.match(html, /—/);
  assert.doesNotMatch(html, /No comparison/); assert.doesNotMatch(html, /percentage points/);
});

test('opponent comparisons retain both cohorts, rank combined samples, and distinguish absent from zero rates', async () => {
  const { compareObservedMatchups } = await import('@gatcg/shared');
  const base = { winRate: .5, results: 10, decks: 2, events: 1 };
  const rows = compareObservedMatchups({ ...base, matchups: [{ id: 'both', matches: 2, winRate: 0 }, { id: 'new', matches: 3, winRate: 1 }] },
    { ...base, matchups: [{ id: 'both', matches: 8, winRate: .5 }, { id: 'old', matches: 4, winRate: 0 }] });
  assert.deepEqual(rows.map(row => row.id), ['both', 'old', 'new']);
  assert.equal(rows[0].delta, -50);
  assert.equal(rows[0].current?.matches, 2);
  assert.equal(rows[0].previous?.matches, 8);
  assert.equal(rows[1].current, null); assert.equal(rows[1].delta, null);
  assert.equal(rows[2].previous, null); assert.equal(rows[2].delta, null);
});

test('opponent preview shows names, both samples and missing-period labels', async () => {
  const { default: Comparison } = await import('../src/features/deck-analysis/MatchupPeriodComparison');
  const { emptyMatchupScope } = await import('@gatcg/shared');
  const base = { winRate: .5, results: 10, decks: 2, events: 1, matchups: [] };
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Comparison, {
    current: { ...base, matchups: [{ id: 'new', matches: 5, winRate: 0 }] },
    previous: { ...base, matchups: [{ id: 'old', matches: 4, winRate: 1 }] },
    scope: emptyMatchupScope, previousScope: emptyMatchupScope,
    builds: { new: { name: 'New build', champion: 'Unknown' }, old: { name: 'Old build', champion: 'Unknown' } },
  })));
  assert.match(html, /New build/); assert.match(html, /Old build/);
  assert.match(html, /Selected period only/); assert.match(html, /Previous period only/);
  assert.match(html, /0%/); assert.match(html, /—/);
  assert.match(html, /href="\/archetypes\/new"/);
});

test('event ranges preserve ties, reversed pair order, mirrors, and scoped samples', async () => {
  const { observedMatchupCohort, emptyMatchupScope } = await import('@gatcg/shared');
  const data = { generatedAt: '', builds: {}, events: [
    { id: 1, name: 'First', date: '2026-01-01', format: 'Standard', decks: { mine: 2 }, rows: [['mine', 'other', 3, 0, 1], ['mine', 'mine', 1, 0, 0]] },
    { id: 2, name: 'Second', date: '2026-02-01', format: 'Standard', decks: { mine: 3 }, rows: [['other', 'mine', 2, 0, 0], ['mine', 'mine', 2, 1, 1], ['mine', 'empty', 0, 0, 0]] },
  ] } as import('@gatcg/shared').ObservedMatchupData;
  const cohort = observedMatchupCohort(data, 'mine', emptyMatchupScope);
  const other = cohort.matchups.find(row => row.id === 'other')!;
  assert.equal(other.matches, 6);
  assert.equal(other.winRate, 3.5 / 6);
  assert.deepEqual(other.eventRange, { low: 0, high: .875, events: 2 });
  assert.deepEqual(cohort.matchups.find(row => row.id === 'mine')?.eventRange, { low: .5, high: .5, events: 2 });
  assert.equal(cohort.matchups.some(row => row.id === 'empty'), false);
  assert.deepEqual(observedMatchupCohort(data, 'mine', { ...emptyMatchupScope, event: '1' }).matchups.find(row => row.id === 'other')?.eventRange, { low: .875, high: .875, events: 1 });
});

test('compact rows expose ranges and samples as text, without inventing single-event ranges', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AnalysisMatchups, {
    result, loading: false, cards: new Map(), observed: { winRate: .5, results: 32, decks: 4, events: 2,
      matchups: [{ id: '20', matches: 20, winRate: .5, eventRange: { low: .25, high: .75, events: 2 } },
        { id: '1', matches: 1, winRate: 1, eventRange: { low: 1, high: 1, events: 1 } }] },
  })));
  assert.match(html, /Event range 25%–75%/);
  assert.match(html, /20.*matches.*2 events/);
  assert.doesNotMatch(html, /Event range 100%–100%/);
  assert.match(html, /1 event/);
});

test('period rows show separate event ranges and do not mark absent observations as zero', async () => {
  const { default: Comparison } = await import('../src/features/deck-analysis/MatchupPeriodComparison');
  const { emptyMatchupScope } = await import('@gatcg/shared');
  const base: ReturnType<typeof import('@gatcg/shared').observedMatchupCohort> = { winRate: .5, results: 10, decks: 2, events: 2, matchups: [] };
  const renderComparison = (current: typeof base, previous: typeof base) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Comparison, { current, previous, scope: emptyMatchupScope, previousScope: emptyMatchupScope })));
  const html = renderComparison({ ...base, matchups: [{ id: 'new', matches: 10, winRate: 0, eventRange: { low: 0, high: .2, events: 2 } }] }, base);
  assert.match(html, /Event range 0%–20%/);
  assert.match(html, /Selected period only/);
  assert.equal((html.match(/data-rate-dot/g) ?? []).length, 3); // Two aggregate dots, one observed opponent period.
  const emptyOpponents = renderComparison(base, base);
  assert.doesNotMatch(emptyOpponents, /By opponent|No recorded opponents/);
  assert.equal(renderComparison({ ...base, results: 0, winRate: null }, { ...base, results: 0, winRate: null }), '');
});

test('single observations use singular units and card interactions start with a bounded preview', () => {
  const value = { ...result, winConditions: Array.from({ length: 5 }, (_, index) => ({ anchorCard: `Anchor ${index}`, memberCards: [`Partner ${index}`], confidence: null, matchingDecks: 1 })) } as unknown as DeckTestResult;
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AnalysisMatchups, { result: value, loading: false, cards: new Map() })));
  assert.match(html.replace(/<[^>]*>/g, ''), /1 game/);
  assert.match(html, /Anchor 2/);
  assert.doesNotMatch(html, /Anchor 3|Anchor 4/);
  assert.match(html, /All 5 card interactions/);
});

test('event quartiles describe equal-weight events while pooled rates retain match weights', async () => {
  const { observedMatchupCohort, emptyMatchupScope } = await import('@gatcg/shared');
  const data: import('@gatcg/shared').ObservedMatchupData = { generatedAt: '', builds: {}, events: [
    [0, 1], [4, 6], [5, 5], [6, 4], [1, 0],
  ].map(([wins, losses], index) => ({ id: index, name: '', date: `2026-01-0${index + 1}`, format: 'Standard', decks: { mine: 1 }, rows: [['mine', 'other', wins, losses, 0]] })) };
  const row = observedMatchupCohort(data, 'mine', emptyMatchupScope).matchups[0];
  assert.deepEqual(row.eventRange, { low: 0, high: 1, events: 5, middle: { low: .4, high: .6 } });
  assert.equal(row.matches, 32);
  assert.equal(row.winRate, .5);
  const four = observedMatchupCohort(data, 'mine', { ...emptyMatchupScope, to: '2026-01-04' }).matchups[0];
  assert.ok(Math.abs(four.eventRange!.middle!.low - .3) < 1e-10);
  assert.equal(four.eventRange!.middle!.high, .525);
  assert.equal(observedMatchupCohort(data, 'mine', { ...emptyMatchupScope, to: '2026-01-03' }).matchups[0].eventRange?.middle, undefined);
  const unequal = structuredClone(data);
  unequal.events[4].rows[0][2] = 100;
  const weighted = observedMatchupCohort(unequal, 'mine', emptyMatchupScope).matchups[0];
  assert.deepEqual(weighted.eventRange, row.eventRange);
  assert.equal(weighted.winRate, 115 / 131);
});

test('distribution tracks retain extremes, collapsed bands and absent observations', async () => {
  const { default: Track, EventRangeLabel } = await import('../src/features/deck-analysis/ObservedRateTrack');
  const range = { low: 0, high: 1, events: 8, middle: { low: .5, high: .5 } };
  const html = renderToStaticMarkup(createElement(Track, { value: .5, range }));
  assert.match(html, /data-event-middle/);
  assert.match(html, /width="1"/);
  assert.match(renderToStaticMarkup(createElement(EventRangeLabel, { range })).replace(/<[^>]*>/g, ' '), /Middle 50% of events 50%–50%.*Full range 0%–100%/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(Track, { value: null, range })), /data-event-middle|data-rate-dot/);
});
