import assert from 'node:assert/strict';
import test from 'node:test';
import { packageAccessOutcomes, packageReport, type PackageRequirement } from '@gatcg/shared';
const req = (cards: string[], minimum = 1, section: 'main' | 'material' = 'main'): PackageRequirement => ({ cards, minimum, section });
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('joint outcomes match exhaustive draws with overlapping alternatives and duplicate lines', () => {
  const physical = ['A', 'A', 'B', 'C', 'D'];
  const deck = { main: physical.map(name => ({ name, quantity: 1 })), material: [] };
  const actual = packageAccessOutcomes(deck, [req(['A', 'B'])], [req(['B', 'C'])], 2);
  const expected = { both: 0, anchorOnly: 0, supportOnly: 0, neither: 0 };
  for (let i = 0; i < physical.length; i++) for (let j = i + 1; j < physical.length; j++) {
    const names = [physical[i], physical[j]], a = names.some(n => ['A', 'B'].includes(n)), b = names.some(n => ['B', 'C'].includes(n));
    expected[a ? b ? 'both' : 'anchorOnly' : b ? 'supportOnly' : 'neither'] += 0.1;
  }
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) near(actual[key], expected[key]);
});
test('material is deterministic and minimum counts distinct names, not copies', () => {
  const deck = { main: [{ name: 'A', quantity: 1 }, { name: 'X', quantity: 3 }], material: [{ name: 'M', quantity: 3 }] };
  near(packageAccessOutcomes(deck, [req(['A'])], [req(['M'], 1, 'material')], 1).both, 0.25);
  near(packageAccessOutcomes(deck, [req(['A'])], [req(['M', 'N'], 2, 'material')], 1).anchorOnly, 0.25);
});
test('missing cards, empty decks and checkpoints past library size remain normalized', () => {
  for (const main of [[], [{ name: 'A', quantity: 1 }]]) {
    const result = packageAccessOutcomes({ main, material: [] }, [req(['A'])], [req(['B'])], 20);
    near(result.both + result.anchorOnly + result.supportOnly + result.neither, 1);
    assert.equal(result.seen, main.length);
    assert.equal(result.both, 0);
  }
});
test('published package detects missing material and does not treat sideboard as support', () => {
  const report = packageReport({ main: [{ name: 'Turbo Charge', quantity: 4 }, { name: 'Other', quantity: 56 }], material: [] });
  const row = report.find(row => row.definition.id === 'turbo-charge-backup-charger')!;
  assert.equal(row.requirementsMet, false);
  assert.equal(row.checkpoints[0].both, 0);
  assert.ok(row.checkpoints[0].anchorOnly > 0);
});

test('minimum-two Main requirements match an exhaustive draw census', () => {
  const physical = ['A', 'A', 'B', 'C', 'D'];
  const deck = { main: physical.map(name => ({ name, quantity: 1 })), material: [] };
  const result = packageAccessOutcomes(deck, [req(['A', 'B', 'C'], 2)], [req(['A', 'D'])], 2);
  let both = 0;
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const names = new Set([physical[i], physical[j]]);
    if (['A', 'B', 'C'].filter(n => names.has(n)).length >= 2 && ['A', 'D'].some(n => names.has(n))) both += .1;
  }
  near(result.both, both);
});
