import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Card } from '@gatcg/shared';
import { computeNewReleaseCards } from '../src/features/deckbuilder/newReleaseCards';
const real = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
const template = real.find(c => c.name === 'Veiling Breeze')!;
const make = (name: string, prefix: string, date: string, extra: Partial<Card> = {}): Card => ({ ...template, name, uuid: name, effect: 'Draw two cards, then discard a card.', editions: [{ ...template.editions[0], set: { ...template.editions[0].set, prefix, name: prefix, release_date: date } }], ...extra });
const context = make('Context', 'DTR', '2025-07-25');
const run = (cards: Card[], date = '2026-10-24', format: 'STANDARD' | 'PANTHEON' = 'STANDARD') => computeNewReleaseCards(cards, [context], new Set(['WIND']), new Set(['Context']), format, date);
test('new release pool includes latest main set and released Alter editions, deduplicates printings', () => {
  const alter = make('Alter', 'DTR Alter', '2026-10-16T00:00:00');
  const result = run([make('Latest', 'PRD', '2026-08-21'), alter, alter, make('Old', 'DTR', '2025-07-25'), make('Promo', 'P26', '2026-10-17'), make('Future', 'CBL', '2026-12-11')]);
  assert.deepEqual(result.map(c => c.card.name), ['Alter', 'Latest']);
  assert.equal(result[0].releaseDate, '2026-10-16');
  assert.equal(run([alter], '2026-10-15').length, 0);
});
test('new-release suggestions respect format legality, elements and existing selections', () => {
  const blocked = make('Blocked', 'DTR Alter', '2026-10-16', { legality: { STANDARD: { limit: 0 }, PANTHEON: { limit: 1 } } });
  assert.equal(run([blocked]).length, 0); assert.equal(run([blocked], '2026-10-24', 'PANTHEON').length, 1);
  assert.equal(run([make('Unverified', 'DTR Alter', '2026-10-16', { legality: {} })]).length, 0);
  assert.equal(run([make('Wrong element', 'DTR Alter', '2026-10-16', { element: 'FIRE', elements: ['FIRE'] })]).length, 0);
  assert.equal(run([make('Context', 'DTR Alter', '2026-10-16')]).length, 0);
});
test('real DTR Alter catalog cards are eligible without tournament history', () => {
  const candidate = real.find(c => c.name === 'Effluve Guard')!;
  const support = real.find(c => c.name === 'Vacuous Servant')!;
  const found = computeNewReleaseCards([candidate], [support], new Set(['WIND', 'WATER', 'FIRE', 'UMBRA']), new Set(), 'STANDARD', '2026-10-24');
  assert.ok(found.length > 0);
  assert.ok(found.every(row => row.setPrefix === 'DTR Alter'));
});
