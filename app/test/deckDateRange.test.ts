import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckDateInRange } from '../src/features/decks/deckDateRange.js';
test('deck date ranges include both boundaries and support open ends', () => {
  assert.equal(deckDateInRange('2026-10-07T23:59:00Z', '2026-10-07', '2026-10-07'), true);
  assert.equal(deckDateInRange('2026-10-06', '2026-10-07', ''), false);
  assert.equal(deckDateInRange('2026-10-08', '', '2026-10-07'), false);
  assert.equal(deckDateInRange('2026-10-07', '2026-10-08', '2026-10-06'), false);
  assert.equal(deckDateInRange('', '2026-10-07', ''), false);
  assert.equal(deckDateInRange('', '', ''), true);
});
