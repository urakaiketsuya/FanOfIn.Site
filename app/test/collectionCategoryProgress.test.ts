import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionProgressKey, resolveCollectionProgressGroup, buildCollectionProgressGroups, collectionGroupProgress, parseCollectionProgressGoals, type Card, type CollectionEntry } from '@gatcg/shared';
const card = (uuid: string, overrides = {}) => ({ uuid, name: uuid, types: [], effect: '**Stealth**', cost_memory: null, editions: [
  { uuid: `${uuid}-a`, rarity: 1, illustrator: 'Artist A', set: { prefix: 'ALC', name: 'Alchemical Revolution' } },
  { uuid: `${uuid}-b`, rarity: 3, illustrator: 'Artist B', set: { prefix: 'ALC 1st', name: 'Alchemical Revolution First Edition' } },
], ...overrides }) as Card;
const entry = (cardUuid: string, ownedQuantity: number, editionUuid?: string, extra = {}) => ({ cardUuid, ownedQuantity, editionUuid, proxyQuantity: 0, ...extra }) as CollectionEntry;
test('sets preserve family union and any-printing coverage, exact mode counts every edition once', () => {
 const groups = buildCollectionProgressGroups([card('A'), card('B')]);
 const set = groups.find(g => g.kind === 'set')!;
 assert.equal(groups.filter(g => g.kind === 'set').length, 1);
 const entries = [entry('A', 8), entry('B', 1, 'B-a'), entry('B', 2, 'B-a', { finish: 'foil' })];
 assert.equal(collectionGroupProgress(set, 'single', entries).complete, 2);
 const exact = collectionGroupProgress(set, 'printing', entries);
 assert.equal(exact.total, 4); assert.equal(exact.complete, 1);
 assert.equal(exact.rows.filter(r => r.needsIdentification).length, 2);
});
test('artist and rarity cannot borrow another printing or unspecified copies; finishes pool', () => {
 const groups = buildCollectionProgressGroups([card('A')]);
 for (const group of groups.filter(g => (g.kind === 'artist' && g.title === 'Artist B') || (g.kind === 'rarity' && g.id === '3'))) {
  const missing = collectionGroupProgress(group, 'printing', [entry('A', 99, 'A-a'), entry('A', 5), entry('A', 0, 'A-b', { proxyQuantity: 10 })]);
  assert.equal(missing.complete, 0); assert.equal(missing.rows[0].needsIdentification, true);
  const owned = collectionGroupProgress(group, 'printing', [entry('A', 1, 'A-b', { finish: 'foil' }), entry('A', 2, 'A-b')]);
  assert.equal(owned.complete, 1); assert.equal(owned.rows[0].owned, 3);
 }
});
test('champion membership excludes support cards; keyword groups overlap without duplicate rows', () => {
 const groups = buildCollectionProgressGroups([card('A', { name: 'Lorraine, Wandering Warrior', types: ['CHAMPION'] }), card('B', { name: 'Lorraine, Blademaster', types: ['CHAMPION'], effect: '**Stealth** **Taunt** **Stealth**' }), card('C', { effect: '[Lorraine Bonus]' })]);
 const champion = groups.find(g => g.kind === 'champion')!;
 assert.equal(champion.id, 'Lorraine'); assert.equal(champion.members.length, 2);
 assert.equal(groups.find(g => g.kind === 'keyword' && g.id === 'Stealth')!.members.length, 2);
 assert.equal(groups.find(g => g.kind === 'keyword' && g.id === 'Taunt')!.members.length, 1);
});
test('playsets cap completion per card and ignore proxies, surplus and unknown cards', () => {
 const group = buildCollectionProgressGroups([card('A'), card('B', { cost_memory: 0 })]).find(g => g.kind === 'set')!;
 const result = collectionGroupProgress(group, 'playset', [entry('A', 20), entry('B', 0, undefined, { proxyQuantity: 5 }), entry('unknown', 100)]);
 assert.equal(result.complete, 1); assert.equal(result.percent, 50); assert.equal(result.missingCopies, 1);
 assert.equal(collectionGroupProgress(group, 'playset', []).complete, 0);
});
test('goal parsing validates targets and preserves multiple distinct pins', () => {
 const goals = [{ kind: 'artist', id: 'a', target: 'printing' }, { kind: 'set', id: 'ALC', target: 'single' }, { kind: 'set', id: 'ALC', target: 'playset' }];
 assert.deepEqual(parseCollectionProgressGoals(JSON.stringify([...goals, goals[0]])), goals);
 for (const value of ['{}', '[null]', '[{"kind":"artist","id":"a","target":"single"}]', 'broken']) assert.throws(() => parseCollectionProgressGoals(value));
 assert.deepEqual(parseCollectionProgressGoals(null), []);
});

test('combined goals intersect the same edition and preserve card-level coverage', () => {
 const groups = buildCollectionProgressGroups([card('A'), card('B')]);
 const artist = groups.find(g => g.kind === 'artist' && g.title === 'Artist A')!;
 const goal = { kind: 'set', id: 'ALC', target: 'printing', filters: [{ kind: 'artist', id: artist.id }, { kind: 'rarity', id: '3' }] } as const;
 const empty = resolveCollectionProgressGroup(groups, { ...goal, filters: [...goal.filters] })!;
 assert.equal(empty.members.length, 0);
 const matching = resolveCollectionProgressGroup(groups, { ...goal, filters: [goal.filters[0]] })!;
 assert.equal(collectionGroupProgress(matching, 'printing', [entry('A', 4, 'A-b')]).complete, 0);
 assert.equal(collectionGroupProgress(matching, 'printing', [entry('A', 1, 'A-a')]).complete, 1);
 const keyword = resolveCollectionProgressGroup(groups, { kind: 'set', id: 'ALC', target: 'playset', filters: [{ kind: 'keyword', id: 'Stealth' }] })!;
 assert.equal(collectionGroupProgress(keyword, 'playset', [entry('A', 4)]).complete, 1);
 assert.equal(resolveCollectionProgressGroup(groups, { ...goal, filters: [{ kind: 'artist', id: 'gone' }] }), undefined);
});
test('combined pins round trip, deduplicate reordered filters and reject invalid scope', () => {
 const goal = { kind: 'set', id: 'ALC', target: 'printing', filters: [{ kind: 'artist', id: 'a' }, { kind: 'rarity', id: '1' }] };
 assert.deepEqual(parseCollectionProgressGoals(JSON.stringify([goal, { ...goal, filters: [...goal.filters].reverse() }])), [goal]);
 const parsed = parseCollectionProgressGoals(JSON.stringify([goal]))[0];
 assert.notEqual(collectionProgressKey(parsed), collectionProgressKey({ kind: 'set', id: 'ALC', target: 'printing' }));
 for (const invalid of [{ ...goal, target: 'single' }, { ...goal, filters: [goal.filters[0], goal.filters[0]] }, { ...goal, filters: null }, { ...goal, filters: [{ kind: 'set', id: 'ALC' }] }]) assert.throws(() => parseCollectionProgressGoals(JSON.stringify([invalid])));
});
