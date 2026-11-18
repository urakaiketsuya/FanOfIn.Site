import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { groupSpoilerResults, sortSpoilers } from '../src/lib/spoilerCatalog';

const reveals = [
  { name: 'Zulu', setPrefix: 'CBL 1st', addedAt: '2026-11-01' },
  { name: 'Alpha', setPrefix: 'CBLOS', addedAt: '2026-11-03' },
  { name: 'Beta', setPrefix: 'CBL', addedAt: '2026-11-02' },
];
const catalog = () => ({ elements: ['FIRE', 'WATER'], editions: [{ set: { prefix: 'DOA' } }] }) as Card;
test('spoiler set groups use reveal identity, newest set order and selected card order', () => {
  const sorted = sortSpoilers(reveals, 'name');
  const groups = groupSpoilerResults(sorted, catalog, 'sets');
  assert.deepEqual(groups.map(g => [g.label, g.items.map(c => c.name)]), [
    ['Asphodel/Cantabile Opus', ['Alpha']], ['Asphodel/Cantabile', ['Beta', 'Zulu']],
  ]);
  assert.deepEqual(reveals.map(c => c.name), ['Zulu', 'Alpha', 'Beta']);
});
test('chronology works across sets; other groupings retain order and multiple membership', () => {
  for (const [sort, expected] of [ ['newest', ['Alpha', 'Beta', 'Zulu']], ['oldest', ['Zulu', 'Beta', 'Alpha']], ['name-desc', ['Zulu', 'Beta', 'Alpha']] ] as const) {
    const sorted = sortSpoilers(reveals, sort);
    assert.deepEqual(groupSpoilerResults(sorted, catalog, 'none')[0].items.map(c => c.name), expected);
    const groups = groupSpoilerResults(sorted, catalog, 'elements');
    assert.equal(groups.length, 2);
    for (const group of groups) assert.deepEqual(group.items.map(c => c.name), expected);
  }
  assert.deepEqual(groupSpoilerResults([], catalog, 'sets'), []);
});
