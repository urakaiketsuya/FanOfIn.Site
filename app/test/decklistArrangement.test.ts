import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { arrangeDeckSections } from '../src/lib/decklistArrangement';
const cards = new Map([['A', { element: 'FIRE', types: ['ACTION'], cost: { value: '2' }, editions: [{ uuid: 'new', set: { name: 'New', release_date: '2025', prefix: 'NEW' } }, { uuid: 'old', set: { name: 'Old', release_date: '2023', prefix: 'OLD' } }] } as Card]]);
test('set grouping conserves copies, locations and explicit allocations without duplicating tokens', () => {
  const sections = [{ title: 'Main', lines: [{ card: 'A', quantity: 4, printings: [{ editionUuid: 'new', quantity: 1 }] }] }, { title: 'Sideboard', lines: [{ card: 'A', quantity: 2 }, { card: 'Unknown', quantity: 1 }] }, { title: 'Tokens', lines: [{ card: 'Token', quantity: 1 }] }];
  const before = JSON.stringify(sections);
  const result = arrangeDeckSections(sections, cards, new Map(), 'set', 'name');
  assert.equal(result.flatMap(s => s.lines).reduce((n,l) => n+l.quantity,0), 8);
  assert.deepEqual(result.find(s => s.title === 'Old')?.lines.map(l => [l.quantity,l.location]), [[3,'Main'],[2,'Sideboard']]);
  assert.equal(result.find(s => s.title === 'New')?.lines[0].printings?.[0].editionUuid, 'new');
  assert.equal(result.filter(s => s.title === 'Tokens').length, 1);
  assert.ok(result.some(s => s.title === 'Unknown set'));
  assert.equal(JSON.stringify(sections), before);
});
test('price sorting uses unit prices, preserves zero, and puts missing prices last in either direction', () => {
  const sections = [{ title: 'Main', lines: [{ card: 'Unknown', quantity: 1 }, { card: 'A', quantity: 4 }, { card: 'B', quantity: 1 }, { card: 'Free', quantity: 1 }] }];
  const prices = new Map([['A',2], ['B',3], ['Free',0]]);
  assert.deepEqual(arrangeDeckSections(sections,cards,prices,'none','priceAsc')[0].lines.map(l=>l.card), ['Free','A','B','Unknown']);
  assert.deepEqual(arrangeDeckSections(sections,cards,prices,'none','priceDesc')[0].lines.map(l=>l.card), ['B','A','Free','Unknown']);
  assert.deepEqual(arrangeDeckSections([],cards,prices,'set','name'), []);
});
