import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeRaiDrawReport, computeTonorisDrawReport, computeRaiDamageReport, computeDefenseReport, computeRecursionReport, type AnalyticsDeck, type Card } from '@gatcg/shared';
import { automaticForecast, forecastCoverage, visibleForecastMetrics } from '../src/features/compare/automaticForecastModel';
const cards = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((c: Card) => [c.name, c]));
const fixture = (name: string): AnalyticsDeck => {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
  const lines = (s: Record<string, number>) => Object.entries(s).map(([name, quantity]) => ({ name, quantity }));
  return { main: lines(f.main), material: lines(f.material) };
};
const coverage = { damage: true, defense: true, recursion: true };
test('mixed Rai/Tonoris comparison preserves independent exact draw and resource forecasts at both checkpoints', () => {
  const rai = fixture('rai-fire-draw'), tonoris = fixture('tonoris-water');
  const reports = [rai, tonoris].map(d => automaticForecast(d, cards, coverage));
  const r = computeRaiDrawReport(rai, cards)!, t = computeTonorisDrawReport(tonoris, cards)!;
  assert.equal(r.status, 'ready'); if (r.status !== 'ready') return;
  for (const [key, index] of [['early', 2], ['late', 4]] as const) {
    assert.deepEqual(reports[0].metrics.find(m => m.id === 'draw')![key], r.points[index].seenRange);
    assert.deepEqual(reports[1].metrics.find(m => m.id === 'draw')![key], t.points[index].seen);
    assert.equal(reports[1].metrics.find(m => m.id === 'level')![key].median, t.points[index].level3 * 100);
    assert.deepEqual(reports[1].metrics.find(m => m.id === 'saved')![key], t.points[index].saved);
  }
  assert.ok(!reports[1].metrics.some(m => m.id.startsWith('damage-')));
  assert.ok(visibleForecastMetrics(reports, [rai, tonoris]).some(m => m.id === 'tokens'));
});
test('all relevant paid damage scenarios preserve shared output, including unchanged results', () => {
  const deck = fixture('rai-fire-draw');
  const report = automaticForecast(deck, cards, coverage), damage = computeRaiDamageReport(deck, cards);
  assert.equal(damage.status, 'ready'); if (damage.status !== 'ready') return;
  for (const s of damage.scenarios) for (const key of ['damage', 'allies', 'self', 'recovery'] as const) {
    const metric = report.metrics.find(m => m.id === `damage-${s.id}-${key}`)!;
    assert.deepEqual(metric.early, s.points[2][key]); assert.deepEqual(metric.late, s.points[4][key]);
  }
  assert.ok(visibleForecastMetrics([report, report], [deck, deck]).length > 0);
});
test('existing Wind fixture adapters preserve prevention, recovery and returned versus replayed cards', () => {
  const deck = fixture('rai-wind-conditional-draw');
  deck.main = deck.main.map(l => l.name === 'Aenean Flux Generator' ? { ...l, name: 'Cyclical Breeze' } : l.name === 'ChannelTech Charm S' ? { ...l, name: 'Aenean Cyclic Winds' } : l);
  deck.main.push({ name: 'Veiling Breeze', quantity: 3 }, { name: 'Flourishing Restoration', quantity: 3 });
  assert.deepEqual(forecastCoverage([deck]), { damage: false, defense: true, recursion: true });
  const report = automaticForecast(deck, cards, coverage), defense = computeDefenseReport(deck, cards), reuse = computeRecursionReport(deck, cards);
  assert.equal(defense.status, 'ready'); assert.equal(reuse.status, 'ready');
  if (defense.status !== 'ready' || reuse.status !== 'ready') return;
  for (const [key, index] of [['early', 2], ['late', 4]] as const) {
    for (const s of defense.scenarios) {
      assert.deepEqual(report.metrics.find(m => m.id === `defense-${s.id}-range`)![key], s.points[index].range);
      assert.equal(report.metrics.find(m => m.id === `defense-${s.id}-chance`)![key].median, s.points[index].ready * 100);
    }
    for (const k of ['returned', 'replayed'] as const) assert.deepEqual(report.metrics.find(m => m.id === `reuse-${k}-range`)![key], reuse.points[index][k]);
  }
});
test('empty, incomplete and unsupported decks never fabricate zero forecasts; supported absence retains zero', () => {
  assert.equal(automaticForecast({ main: [], material: [] }, cards, coverage).status, 'Empty Main deck');
  assert.equal(automaticForecast({ main: [{ name: 'Unknown', quantity: 1 }], material: [] }, cards, coverage).status, 'Card data incomplete');
  assert.equal(automaticForecast({ main: [{ name: 'Fireball', quantity: 4 }], material: [] }, cards, coverage).status, 'Forecast not supported');
  const deck = fixture('rai-fire-draw');
  const report = automaticForecast(deck, cards, coverage);
  assert.deepEqual(report.metrics.find(m => m.id === 'reuse-returned-range')!.late, { low: 0, median: 0, high: 0, ready: 0 });
});
