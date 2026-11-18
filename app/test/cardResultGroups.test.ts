import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@gatcg/shared';
import { groupCardResults } from '../src/lib/cardResultGroups';
const card = (name: string, elements: string[], prefixes: string[] = []): Card => ({ name, elements, editions: prefixes.map(prefix => ({ set: { prefix, name: prefix } })) } as Card);

test('grouping preserves sorted membership, handles multiple elements and missing metadata', () => {
  const cards = [card('Z', ['FIRE', 'WATER', 'FIRE']), card('A', ['FIRE']), undefined];
  const groups = groupCardResults(cards, value => value, 'elements');
  assert.deepEqual(groups.map(group => [group.label, group.items.map(item => item?.name)]), [['FIRE', ['Z', 'A']], ['WATER', ['Z']], ['Unknown', [undefined]]]);
  assert.deepEqual(groupCardResults(cards, value => value, 'none')[0].items, cards);
});
test('set membership deduplicates printings and includes results beyond a display page', () => {
  const cards = Array.from({ length: 70 }, (_, index) => card(String(index), [], [index < 60 ? 'DOA' : 'DTR', 'DOA']));
  const groups = groupCardResults(cards, value => value, 'sets');
  assert.equal(groups.find(group => group.label === 'DOA')?.items.length, 70);
  assert.equal(groups.find(group => group.label === 'DTR')?.items.length, 10);
  assert.deepEqual(groupCardResults([], value => value as Card, 'sets'), []);
});
