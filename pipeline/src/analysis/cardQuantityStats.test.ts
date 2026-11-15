import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCardQuantityStats } from './cardQuantityStats.js';
import type { OmnidexEventBundle } from '../omnidex/cache.js';

test('copy distributions retain singleton quantities and low-count choices without duplicate sightings or sideboards', () => {
  const entry = (player: number, quantity: number) => ({ player, decklist: {
    main: [{ card: 'Draw card', quantity }, { card: 'Draw card', quantity: 1 }],
    material: [{ card: 'Champion', quantity: 1 }],
    sideboard: [{ card: 'Draw card', quantity: 4 }, { card: 'Sideboard only', quantity: 1 }],
  } });
  const first = entry(1, 2);
  const source = { id: 12, decklists: [first, first, entry(2, 3)], standings: { error: 'unavailable' } } as unknown as OmnidexEventBundle;
  const rows = computeCardQuantityStats([source, source], new Map());
  assert.deepEqual(rows.find(row => row.name === 'Draw card')?.quantities.map(q => [q.quantity, q.deckCount]), [[3, 1], [4, 1]]);
  assert.deepEqual(rows.find(row => row.name === 'Champion')?.quantities.map(q => [q.quantity, q.deckCount]), [[1, 2]]);
  assert.equal(rows.some(row => row.name === 'Sideboard only'), false);
  assert.deepEqual(computeCardQuantityStats([], new Map()), []);
});
