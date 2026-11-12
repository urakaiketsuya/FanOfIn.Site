import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareRaiDrawReports, compareRaiDamageReports, compareTonorisDrawReports, type AnalyticsDeck, type Card } from '@gatcg/shared';
import { computeSwapImpact } from '../src/features/analytics/swapImpact';
const cards = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((c: Card) => [c.name, c]));
function fixture(name: string): AnalyticsDeck {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
  const lines = (s: Record<string, number>) => Object.entries(s).map(([name, quantity]) => ({ name, quantity }));
  return { main: lines(f.main), material: lines(f.material) };
}
test('Rai swap preserves both checkpoints and exact shared draw/damage results', () => {
  const before = fixture('rai-fire-draw');
  const after = { ...before, main: before.main.map(l => l.name === 'Fireball' ? { ...l, name: 'Peer into Mana' } : l) };
  const result = computeSwapImpact(before, after, cards), draw = compareRaiDrawReports(before, after, cards)!, damage = compareRaiDamageReports(before, after, cards);
  assert.equal(draw.status, 'ready'); assert.equal(damage.status, 'ready');
  if (draw.status !== 'ready' || damage.status !== 'ready') return;
  for (const turn of [3, 5]) {
    const row = result.rows.find(r => r.id === 'draw' && r.turn === turn)!;
    const source = draw.points.find(p => p.turn === turn)!;
    assert.deepEqual(row.before, source.before.seenRange); assert.deepEqual(row.after, source.after.seenRange);
    const hit = result.rows.find(r => r.id === 'champion-damage' && r.turn === turn)!;
    assert.deepEqual(hit.after, damage.scenarios.find(s => s.id === 'champion')!.points.find(p => p.turn === turn)!.after.damage);
  }
  assert.deepEqual(result.unavailable, []);
  for (const id of new Set(result.rows.map(r => r.id))) assert.deepEqual(result.rows.filter(r => r.id === id).map(r => r.turn), [3, 5]);
  assert.ok(result.rows.every(r => !r.id.startsWith('wide-') && !r.id.startsWith('buffed-')));
});
test('identical decks have no changed forecasts, missing and unsupported are not zero impact', () => {
  const deck = fixture('rai-fire-draw');
  assert.deepEqual(computeSwapImpact(deck, deck, cards).rows, []);
  const missing = new Map(cards); missing.delete('Fireball');
  assert.ok(computeSwapImpact(deck, deck, missing).unavailable.includes('Card data incomplete'));
  assert.ok(computeSwapImpact(deck, { main: [], material: [] }, cards).unavailable.length > 0);
});
test('Tonoris probabilities use percentage points and match shared progression at both turns', () => {
  const deck = fixture('tonoris-water');
  const after = { ...deck, main: deck.main.map(l => l.name === 'Academy Guide' ? { ...l, name: 'Frostbind' } : l) };
  const result = computeSwapImpact(deck, after, cards), expected = compareTonorisDrawReports(deck, after, cards)!;
  assert.equal(expected.status, 'ready');
  for (const p of expected.points) {
    const row = result.rows.find(r => r.id === 'level' && r.turn === p.turn)!;
    assert.equal(row.unit, 'pp'); assert.equal(row.before.median, p.before.level3 * 100); assert.equal(row.after.median, p.after.level3 * 100);
  }
});

test('unmodeled pairs have an explicit unavailable-coverage state', () => {
 const result = computeSwapImpact({main:[],material:[]}, {main:[],material:[]}, cards);
 assert.equal(result.supported, false); assert.deepEqual(result.rows, []);
});
