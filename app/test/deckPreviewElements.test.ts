import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckPreviewElements } from '../src/lib/deckPreviewElements';
const champion = (element: string) => ({ types: ['CHAMPION'], element });
test('combines spirit and champion elements, deduplicating and excluding Norm when another exists', () => {
  assert.deepEqual(deckPreviewElements([champion('WATER'), champion('NORM'), champion('WATER'), champion('TERA')]), ['WATER', 'TERA']);
});
test('retains Norm alone and ignores non-champions and unknown cards', () => {
  assert.deepEqual(deckPreviewElements([undefined, champion('NORM'), { types: ['REGALIA'], element: 'FIRE' }]), ['NORM']);
  assert.deepEqual(deckPreviewElements([undefined, champion('')]), []);
});
