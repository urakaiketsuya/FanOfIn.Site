import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixtureAccess, type Card } from '@gatcg/shared';
import { accessExtension, accessProfile } from './cardAccessValidation.js';
import { scoreComposition, type CompositionDeck } from './cardCompositionValidation.js';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((c: Card) => [c.name, c]));
function fixture(name: string): CompositionDeck {
  const d = JSON.parse(readFileSync(new URL(`../../../app/test/fixtures/${name}.json`, import.meta.url), 'utf8'));
  const main = Object.entries(d.main) as [string, number][], material = Object.entries(d.material) as [string, number][];
  return { identity: name, champion: name, main, material, cards: [...main, ...material] };
}
test('existing Rai and Tonoris fixtures produce deterministic bounded access with separate material', () => {
  for (const name of ['tonoris-water', 'rai-water-conditional-draw']) {
    const d = fixture(name), p = accessProfile(d, catalog, 32);
    assert.notEqual(p.policy, 'unsupported');
    assert.deepEqual(p, accessProfile({ ...d, main: [...d.main!].reverse() }, catalog, 32));
    assert.ok(p.bonus.size > 0);
    const size = d.main!.reduce((s, [, q]) => s + q, 0);
    assert.equal(p.natural.get(`main:T3:${d.main![0][0]}`), fixtureAccess(size, d.main![0][1], 9));
    for (const [card] of d.material!) assert.equal(p.natural.get(`material:${card}`), 1);
    const features = accessExtension('adjusted', new Map([[d.identity, p]]), true).features(d);
    for (const [key, value] of features) if (key.startsWith('extra:')) {
      assert.ok(value > 0 && value + p.natural.get(key.slice(6))! <= 1);
    }
  }
});
test('a lone Tonoris draw source cannot help find its own first copy', () => {
  const d = fixture('tonoris-water');
  d.main = [['Hub of Innovation', 4], ['Frostbind', 56]];
  d.cards = [...d.main, ...d.material!];
  const p = accessProfile(d, catalog, 128);
  assert.equal(p.policy, 'tonoris');
  assert.equal(p.bonus.get('main:T1:Hub of Innovation') ?? 0, 0);
});
test('unsupported policies are marked and never gain invented extra access; sections required', () => {
  const d = fixture('tonoris-water'); d.material = [];
  const p = accessProfile(d, catalog, 16);
  assert.equal(p.policy, 'unsupported'); assert.equal(p.bonus.size, 0);
  const profiles = new Map([[d.identity, p]]);
  assert.deepEqual(accessExtension('a', profiles, false).features(d), accessExtension('b', profiles, true).features(d));
  assert.throws(() => accessProfile({ ...d, main: undefined }, catalog), /explicit deck sections/);
});

test('draw adjustment preserves every control feature and compares against natural access', () => {
  const d = fixture('tonoris-water'), p = accessProfile(d, catalog, 32), profiles = new Map([[d.identity, p]]);
  const natural = accessExtension('natural', profiles, false).features(d);
  const adjusted = accessExtension('adjusted', profiles, true).features(d);
  assert.deepEqual(new Map([...adjusted].filter(([key]) => !key.startsWith('extra:'))), natural);
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), event: String(i), date: '2025-01-01', format: 'standard', score: 1, prior: .5, a: d, b: d }));
  const report = scoreComposition(rows, { cards: () => .4, adjustedContext: () => .4, naturalAccess: () => .5, drawAdjustedAccess: () => .6 });
  const interval = report.models.drawAdjustedAccess.improvementOverNaturalAccess95!;
  assert.ok(interval.every(value => Math.abs(value - .09) < 1e-10));
});
