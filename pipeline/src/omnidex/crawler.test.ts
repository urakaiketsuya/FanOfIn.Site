import test from 'node:test';
import assert from 'node:assert/strict';
import type { OmnidexEvent } from '@gatcg/shared';
import { isDeepFetchWorthy } from './crawler';
test('completed events have no minimum attendance requirement', () => {
  for (const size of [0, 1, 2, 4, 7, 8, 100]) assert.equal(isDeepFetchWorthy({ status: 'complete', players: Array.from({ length: size }, (_, id) => id) } as OmnidexEvent), true);
  assert.equal(isDeepFetchWorthy({ status: 'canceled', players: [] } as unknown as OmnidexEvent), false);
});
