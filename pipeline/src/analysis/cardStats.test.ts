import assert from 'node:assert/strict';
import test from 'node:test';
import { cardAdoption } from '@gatcg/shared';
import { cardStatsReferenceEnd, computeCardStatsReport } from './cardStats.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

function bundle(id: number, date: string, cards: string[][]): OmnidexEventBundle {
  return { id, event: { date }, standings: { error: 'missing' }, decklists: cards.map((names, player) => ({ player,
    decklist: { main: names.map(card => ({ card, quantity: 1 })), material: [{ card: 'Material', quantity: 1 }],
      sideboard: [{ card: 'Sideboard only', quantity: 4 }] },
  })) } as unknown as OmnidexEventBundle;
}

test('equal UTC calendar periods normalize adoption despite different tournament volumes', () => {
  const prior = bundle(1, '2026-09-02', [['Target'], ['Other']]);
  const recent = bundle(2, '2026-10-31T23:59:59Z', [['Target'], ['Target'], ['Other'], ['Other']]);
  const report = computeCardStatsReport([prior, recent, recent], new Map());
  assert.equal(report.decksConsidered, 6);
  assert.deepEqual(report.adoptionPeriods, {
    recent: { start: '2026-10-02T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z', decks: 4 },
    prior: { start: '2026-09-02T00:00:00.000Z', end: '2026-10-02T00:00:00.000Z', decks: 2 },
  });
  const target = report.cards.find(c => c.name === 'Target')!;
  assert.deepEqual(cardAdoption(target, report.adoptionPeriods), { recent: .5, prior: .5, change: 0 });
  assert.equal(report.cards.some(c => c.name === 'Sideboard only'), false);
  const decline = cardAdoption({ recentDeckCount: 2, priorDeckCount: 1 }, {
    ...report.adoptionPeriods!, recent: { ...report.adoptionPeriods!.recent, decks: 8 },
  });
  assert.deepEqual(decline, { recent: .25, prior: .5, change: -.25 });
});

test('boundaries, unavailable lists, invalid dates and category anchoring preserve denominators', () => {
  const sources = [
    bundle(1, '2026-09-01T23:59:59Z', [['Old']]),
    bundle(2, '2026-09-02', [['Prior']]),
    bundle(3, '2026-10-01T23:59:59Z', [['Prior']]),
    bundle(4, '2026-10-02', [['Recent', 'Recent'], []]),
    bundle(5, '2026-10-31', [['Recent']]),
    bundle(7, '2027-10-31', [[]]),
    bundle(6, 'invalid', [['Undated']]),
  ];
  const unavailable = bundle(8, '2028-10-31', [['Recent']]);
  unavailable.decklists = { error: 'unavailable' } as OmnidexEventBundle['decklists'];
  sources.push(unavailable);
  const end = cardStatsReferenceEnd(sources);
  const report = computeCardStatsReport(sources, new Map(), end);
  assert.equal(report.decksConsidered, 6);
  assert.equal(report.adoptionPeriods?.recent.decks, 2);
  assert.equal(report.adoptionPeriods?.prior.decks, 2);
  const recent = report.cards.find(c => c.name === 'Recent')!;
  assert.equal(recent.totalCopies, 3);
  assert.deepEqual(cardAdoption(recent, report.adoptionPeriods), { recent: 1, prior: 0, change: 1 });
  const category = computeCardStatsReport([sources[1]], new Map(), end);
  assert.equal(category.adoptionPeriods?.recent.start, report.adoptionPeriods?.recent.start);
  assert.equal(cardAdoption(category.cards[0], category.adoptionPeriods), null);
  assert.deepEqual(computeCardStatsReport([], new Map()), { cards: [], decksConsidered: 0 });
});

test('old artifacts, empty populations, invalid counts and incompatible periods stay unavailable', () => {
  const report = computeCardStatsReport([bundle(1, '2026-10-31', [['Target']]), bundle(2, '2026-09-20', [['Other']])], new Map());
  const periods = report.adoptionPeriods!;
  assert.equal(cardAdoption({ recentDeckCount: 0, priorDeckCount: 0 }, undefined), null);
  assert.deepEqual(cardAdoption({ recentDeckCount: 0, priorDeckCount: 0 }, periods), { recent: 0, prior: 0, change: 0 });
  assert.equal(cardAdoption({ recentDeckCount: 2, priorDeckCount: 0 }, periods), null);
  assert.equal(cardAdoption({ recentDeckCount: -1, priorDeckCount: 0 }, periods), null);
  assert.equal(cardAdoption({ recentDeckCount: 1, priorDeckCount: 0 }, { ...periods, prior: { ...periods.prior, decks: 0 } }), null);
  assert.equal(cardAdoption({ recentDeckCount: 1, priorDeckCount: 0 }, { ...periods, prior: { ...periods.prior, end: periods.recent.end } }), null);
});
