import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateDefenseWindow, computeDefenseReport, compareDefenseReports, DEFENSE_CARDS, DEFENSE_SCENARIOS, type Card, type DefenseState, type AnalyticsDeck } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const state = (overrides: Partial<DefenseState> = {}): DefenseState => ({ hand: [], memory: [], graveyard: [], level: 3, element: 'WIND', advanced: 'ARCANE', mage: true, diao: false, ...overrides });
const filler = 'Academy Guide', wind = 'Channel the Wind';
const window = (overrides: Partial<DefenseState>, scenario = DEFENSE_SCENARIOS[0]) => evaluateDefenseWindow(state(overrides), scenario, catalog);
const fixture = (element: string): AnalyticsDeck => {
  const data = JSON.parse(readFileSync(new URL(`./fixtures/rai-${element}-conditional-draw.json`, import.meta.url), 'utf8'));
  const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
  return { main: lines(data.main), material: lines(data.material) };
};

test('reviewed defense text and costs match the committed contracts', () => {
  const contracts = JSON.parse(readFileSync(new URL('./fixtures/defense-contracts.json', import.meta.url), 'utf8'));
  for (const name of DEFENSE_CARDS) {
    const card = catalog.get(name)!;
    assert.deepEqual({ effect: card.effect, reserve: card.cost_reserve, element: card.element, subtypes: card.subtypes }, contracts[name], name);
  }
});
test('Breeze reveals actual memory including its payment, not deck composition or itself', () => {
  assert.equal(window({ hand: ['Veiling Breeze', wind], memory: [wind] }).prevented, 2);
  assert.equal(window({ hand: ['Veiling Breeze'] }).prevented, 0);
  assert.equal(window({ hand: ['Veiling Breeze', filler] }).prevented, 0);
  assert.equal(window({ hand: ['Veiling Breeze', wind], memory: [wind] }, DEFENSE_SCENARIOS[1]).prevented, 6);
});
test('Breeze off-element is unavailable and multiple paid copies stack without reusing payment', () => {
  assert.equal(window({ hand: ['Veiling Breeze', wind], element: 'WATER' }).prevented, 0);
  const result = window({ hand: ['Veiling Breeze', 'Veiling Breeze', wind] });
  assert.equal(result.activated.length, 1);
});
test('Destiny consumes one event, does not claim seven points against every hit', () => {
  assert.equal(window({ hand: ['Crystallized Destiny', filler, filler, filler] }).prevented, 7);
  assert.equal(window({ hand: ['Crystallized Destiny', filler, filler, filler] }, DEFENSE_SCENARIOS[1]).prevented, 3);
  assert.equal(window({ hand: ['Crystallized Destiny', filler, filler] }).prevented, 0);
});
test('two next-event responses are paid separately and scheduled against distinct hits', () => {
  const result = window({ hand: ['Crystallized Destiny', 'Crystallized Destiny', ...Array(6).fill(filler)] }, DEFENSE_SCENARIOS[1]);
  assert.equal(result.prevented, 6); assert.equal(result.activated.length, 2);
});
test('Ward is a finite two-point pool, not two per event', () => {
  assert.equal(window({ hand: ['Aenean Ward', filler], level: 0 }, DEFENSE_SCENARIOS[1]).prevented, 2);
});
test('Spellshield requires paid Arcane access and applies its Mage discount', () => {
  assert.equal(window({ hand: ['Spellshield: Arcane', filler, filler], level: 2 }).prevented, 0);
  assert.equal(window({ hand: ['Spellshield: Arcane', filler, filler] }).prevented, 7);
  assert.equal(window({ hand: ['Spellshield: Arcane', filler, filler], mage: false }).prevented, 0);
});
test('Restoration enforces Tera or paid Diao waiver; recovery is bounded by existing damage', () => {
  const recovery = DEFENSE_SCENARIOS[2];
  assert.equal(window({ hand: ['Flourishing Restoration', filler, filler] }, recovery).recovered, 0);
  assert.equal(window({ hand: ['Flourishing Restoration', filler, filler], advanced: 'TERA', diao: true }, recovery).recovered, 9);
  assert.equal(window({ hand: ['Flourishing Restoration', ...Array(3).fill(filler)], level: 1, diao: true }, recovery).recovered, 0);
  assert.equal(window({ hand: ['Flourishing Restoration', ...Array(4).fill(filler)], level: 1, diao: true }, recovery).recovered, 9);
  assert.equal(window({ hand: ['Flourishing Restoration', filler, filler], advanced: 'TERA' }, { ...recovery, damage: 2 }).recovered, 2);
  assert.equal(window({ hand: ['Flourishing Restoration', filler, filler], advanced: 'TERA' }, { ...recovery, allies: 0 }).recovered, 3);
});
test('Diao can spend two entry glimmer on one memory Reaction, never ordinary reserve from memory', () => {
  assert.equal(window({ memory: ['Flourishing Restoration'], advanced: 'TERA', diao: true }, DEFENSE_SCENARIOS[2]).recovered, 9);
  assert.equal(window({ memory: ['Flourishing Restoration'], advanced: 'TERA', diao: false }, DEFENSE_SCENARIOS[2]).recovered, 0);
  assert.equal(window({ memory: ['Flourishing Restoration'], level: 1, advanced: 'TERA', diao: true }, DEFENSE_SCENARIOS[2]).recovered, 0);
  assert.equal(window({ memory: ['Aenean Ward', 'Aenean Ward'], diao: true }).activated.length, 1);
});
test('Embers Kindle consumes physical Fire graveyard once; recovery cannot exceed injury', () => {
  const result = window({ hand: ['Restoring Embers', 'Restoring Embers'], graveyard: Array(4).fill('Fireball'), element: 'FIRE' }, DEFENSE_SCENARIOS[2]);
  assert.equal(result.recovered, 4); assert.equal(result.activated.length, 1);
  assert.equal(window({ hand: ['Restoring Embers'], graveyard: Array(4).fill(wind), element: 'FIRE' }, DEFENSE_SCENARIOS[2]).recovered, 0);
});
test('Knowledge cannot delevel a spirit or recover five without five damage', () => {
  const hand = ['Innervate Knowledge', ...Array(4).fill(filler)];
  assert.equal(window({ hand, element: 'WATER', level: 0 }, DEFENSE_SCENARIOS[2]).recovered, 0);
  assert.equal(window({ hand, element: 'WATER', level: 1 }, DEFENSE_SCENARIOS[2]).recovered, 5);
  assert.equal(window({ hand, element: 'WATER' }, { ...DEFENSE_SCENARIOS[2], damage: 4 }).recovered, 0);
});
test('deleveling removes advanced access for subsequent responses', () => {
  const result = window({ hand: ['Innervate Knowledge', 'Flourishing Restoration', ...Array(6).fill(filler)], element: 'WATER', advanced: 'TERA' }, DEFENSE_SCENARIOS[2]);
  assert.equal(result.recovered, 5);
});
test('Obelisk cannot rest as both its activation and reserve payment; shares budget with cards', () => {
  assert.equal(window({ objectReserve: 1, protectionCost: 1, protectionUsesObject: true }).prevented, 0);
  assert.equal(window({ hand: ['Crystallized Destiny', filler], objectReserve: 3, protectionCost: 0, protectionUsesObject: true }, DEFENSE_SCENARIOS[1]).prevented, 3);
  assert.equal(window({ objectReserve: 2, protectionCost: 1, protectionUsesObject: true }).prevented, 2);
  const result = window({ hand: ['Crystallized Destiny'], objectReserve: 3, protectionCost: 1, protectionUsesObject: true }, DEFENSE_SCENARIOS[1]);
  assert.equal(result.prevented, 3);
});
test('checkpoint calculation leaves input zones unchanged and is deterministic', () => {
  const input = state({ hand: ['Veiling Breeze', wind], memory: [wind] }); const copy = structuredClone(input);
  assert.deepEqual(evaluateDefenseWindow(input, DEFENSE_SCENARIOS[0], catalog), evaluateDefenseWindow(input, DEFENSE_SCENARIOS[0], catalog)); assert.deepEqual(input, copy);
});
for (const element of ['fire', 'water', 'wind']) test(`${element}: report and comparison agree, canonical order and sideboards do not change results`, () => {
  const base = fixture(element);
  const deck = { ...base, main: [...base.main, ...DEFENSE_CARDS.map(name => ({ name, quantity: 2 }))] };
  const report = computeDefenseReport(deck, catalog, 32); assert.equal(report.status, 'ready');
  const comparison = compareDefenseReports(deck, deck, catalog, 32); assert.equal(comparison.status, 'ready');
  if (report.status !== 'ready' || comparison.status !== 'ready') return;
  for (let i = 0; i < report.scenarios.length; i++) for (const point of comparison.scenarios[i].points) {
    assert.deepEqual(point.before, report.scenarios[i].points[point.turn - 1]); assert.deepEqual(point.before, point.after);
    assert.ok(point.before.ready >= 0 && point.before.ready <= 1); assert.ok(point.before.range.high <= 9);
  }
  assert.deepEqual(computeDefenseReport({ ...deck, main: deck.main.slice().reverse(), sideboard: [{ name: 'Veiling Breeze', quantity: 100 }] }, catalog, 32), report);
});
test('missing data and unsupported lineages never become a zero result', () => {
  const deck = fixture('wind');
  assert.equal(computeDefenseReport({ ...deck, main: [{ name: 'Missing', quantity: 1 }] }, catalog).status, 'missing');
  assert.equal(computeDefenseReport({ ...deck, material: [] }, catalog).status, 'unsupported');
  assert.equal(compareDefenseReports(deck, { ...deck, material: [] }, catalog).status, 'unsupported');
});
test('Diao fixture pays progression without acquiring Rai enlighten; Restoration can become ready', () => {
  const data = JSON.parse(readFileSync(new URL('./fixtures/diao-wind-defense.json', import.meta.url), 'utf8'));
  const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
  const deck: AnalyticsDeck = { main: lines(data.main), material: lines(data.material) };
  assert.equal(deck.main.reduce((n, line) => n + line.quantity, 0), 60);
  const report = computeDefenseReport(deck, catalog, 64); assert.equal(report.status, 'ready');
  if (report.status === 'ready') assert.ok(report.scenarios[2].points[4].ready > 0);
});
test('Tonoris fixture shares object payments and preserves comparison values', () => {
  const data = JSON.parse(readFileSync(new URL('./fixtures/tonoris-water.json', import.meta.url), 'utf8'));
  const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
  const deck = { main: [...lines(data.main), { name: 'Crystallized Destiny', quantity: 4 }, { name: 'Innervate Knowledge', quantity: 4 }], material: lines(data.material) };
  const report = computeDefenseReport(deck, catalog, 32), comparison = compareDefenseReports(deck, deck, catalog, 32);
  assert.equal(report.status, 'ready'); assert.equal(comparison.status, 'ready');
  if (report.status === 'ready' && comparison.status === 'ready') assert.deepEqual(comparison.scenarios[0].points[1].before, report.scenarios[0].points[4]);
  assert.equal(computeDefenseReport({ ...deck, material: [...deck.material, { name: 'Rai, Archmage', quantity: 1 }] }, catalog).status, 'unsupported');
});
test('removing defense copies updates report cards and produces no phantom reactions', () => {
  const deck = fixture('wind'); const after = { ...deck, main: [...deck.main, { name: 'Veiling Breeze', quantity: 4 }] };
  const beforeReport = computeDefenseReport(deck, catalog, 32), afterReport = computeDefenseReport(after, catalog, 32);
  assert.equal(beforeReport.status, 'ready'); assert.equal(afterReport.status, 'ready');
  if (beforeReport.status === 'ready' && afterReport.status === 'ready') {
    assert.ok(!beforeReport.scenarios[0].cards.some(line => line.name === 'Veiling Breeze'));
    assert.ok(afterReport.scenarios[0].cards.some(line => line.name === 'Veiling Breeze'));
    assert.notDeepEqual(beforeReport.scenarios[0].points, afterReport.scenarios[0].points);
  }
});
