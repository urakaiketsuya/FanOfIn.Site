import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { aggregateLines, calculateCardScenarios, calculateFixtureMatchup, compareFixtureScenarios, defaultCardScenario, defenseAgainstSequence, fixtureAccess, fixtureFloating, fixturePairAccess, fixtureReserveCost, floatingPayment, graveyardDisruption, type AnalyticsDeck, type Card, type CardScenario } from '@gatcg/shared';
const contracts = JSON.parse(readFileSync(new URL('./fixtures/tcgengine-analytics-contracts.json', import.meta.url), 'utf8'));
const catalog = new Map<string, Card>(contracts.cards.map((c: Card) => [c.name, { ...c, editions: [] }]));
const deck = (...names: string[]): AnalyticsDeck => ({ main: names.map(name => ({ name, quantity: 1 })), material: [] });
const state = (overrides: Partial<CardScenario> = {}): CardScenario => ({ ...defaultCardScenario(), ...overrides });
const value = (name: string, id: string, overrides: Partial<CardScenario> = {}) => calculateCardScenarios(deck(name), catalog, state(overrides)).find(row => row.id === `${name}:${id}`)?.value;

test('reviewed Floating Memory contracts agree with independent catalog and positive/negative classes', () => {
  assert.equal(contracts.floatingContracts.length, 44);
  for (const contract of contracts.floatingContracts) {
    const card = catalog.get(contract.name)!;
    assert.match(card.effect!, /\*\*Floating Memory\*\*/);
    if (contract.class) assert.ok(card.classes.includes(contract.class));
    const lines = [{ name: contract.name, quantity: 4 }];
    assert.equal(fixtureFloating(lines, contract.class ? [contract.class] : []).length, 1, contract.name);
    assert.equal(fixtureFloating(lines, ['UNMATCHED']).length, contract.class ? 0 : 1, contract.name);
  }
});
test('memory payment consumes resources once and caps at the requested cost', () => {
  assert.deepEqual(floatingPayment(3, 2), { paid: 2, remainingCost: 0, remainingCards: 1 });
  assert.deepEqual(floatingPayment(floatingPayment(3, 2).remainingCards, 2), { paid: 1, remainingCost: 1, remainingCards: 0 });
  assert.deepEqual(floatingPayment(NaN, -1), { paid: 0, remainingCost: 0, remainingCards: 0 });
});
test('cost contracts preserve missing-class and threshold cases', () => {
  for (const [name, base, reduced, classes] of [
    ['Crosswind Cuts', 5, 3, ['WARRIOR']], ['Frozen Dismissal', 3, 2, ['CLERIC']],
    ['Burst Asunder', 4, 2, ['MAGE']], ['Total Whiteout', 5, 2, ['MAGE']], ["Jianyu, Fate's Premonition", 4, 2, ['CLERIC']],
  ] as const) {
    assert.equal(catalog.get(name)?.cost_reserve, base);
    assert.equal(fixtureReserveCost(name, state())?.cost, base);
    assert.equal(fixtureReserveCost(name, state({ classes: [...classes] }))?.cost, reduced);
  }
  assert.equal(fixtureReserveCost('Thunderclap', state({ level: 2 }))?.cost, 4);
  assert.equal(fixtureReserveCost('Thunderclap', state({ level: 3 }))?.cost, 2);
  assert.equal(fixtureReserveCost('Tidal Lock', state({ waterGrave: 2 }))?.cost, 3);
  assert.equal(fixtureReserveCost('Tidal Lock', state({ waterGrave: 3 }))?.cost, 1);
  assert.equal(fixtureReserveCost('Surging Obstruction', state({ bishop: 1 }))?.cost, 2);
});
test('draw destinations and activation gates mirror fixture outcomes', () => {
  assert.equal(value('Innervate Knowledge', 'draw'), 0);
  assert.equal(value('Innervate Knowledge', 'draw', { lineage: 1 }), 2);
  assert.equal(value('Innervate Knowledge', 'recover', { lineage: 1, damageTaken: 5 }), 5);
  assert.equal(value('Conjure Downpour', 'draw', { classes: ['CLERIC'], memory: 3 }), 0);
  assert.equal(value('Conjure Downpour', 'draw', { classes: ['CLERIC'], memory: 4 }), 1);
  assert.equal(value('Conjure Downpour', 'draw', { memory: 4 }), 0);
  assert.equal(value('Fractal of Waves', 'draw', { levelThree: 1 }), 2);
  assert.equal(value('Fractal of Waves', 'draw'), 0);
  assert.equal(value('Hunt, Weiss King', 'draw', { bishop: 1 }), 1);
  assert.equal(value('Hunt, Weiss King', 'draw'), 0);
});
test('additional recovery respects counters, mastery branch and damage cap', () => {
  assert.equal(value('Mire Reparation', 'recover', { omens: 2, damageTaken: 5 }), 2);
  assert.equal(value('Mire Reparation', 'recover', { omens: 8, damageTaken: 2 }), 2);
  assert.equal(value('Spalling Cleanse', 'recover', { mastery: 1, sheen: 6 }), 0);
  assert.equal(value('Spalling Cleanse', 'recover', { mastery: 1, sheen: 7 }), 3);
  assert.equal(value('Spalling Cleanse', 'recover'), 3);
  assert.equal(value('Spirit of Serene Wind', 'recover', { release: 1, damageTaken: 8 }), 6);
  assert.equal(value('Spirit of Serene Wind', 'recover'), 0);
});
test('resource damage, durability, ranged and combat bonuses preserve conditions', () => {
  assert.equal(value('Burst Asunder', 'damage', { fractals: 2 }), 6);
  assert.equal(value('Strategem of Myriad Ice', 'damage', { floating: 2 }), 6);
  assert.equal(value('Ceremonial Stormblade', 'durability', { windAllies: 2, classes: ['WARRIOR'] }), 3);
  assert.equal(value('Ceremonial Stormblade', 'durability', { windAllies: 2 }), 1);
  assert.equal(value('Calculated Foresight', 'ranged', { floating: 1 }), 3);
  assert.equal(value('Calculated Foresight', 'ranged'), 0);
  assert.equal(value('Windstrike Soldier', 'targets', { extraPaid: 1, classes: ['WARRIOR'] }), 3);
  assert.equal(value('Windstrike Soldier', 'targets', { extraPaid: 1 }), 1);
  assert.equal(value('Poised Strike', 'wake', { prepared: 1, hit: 1, classes: ['ASSASSIN'] }), 1);
  assert.equal(value('Poised Strike', 'wake', { prepared: 0, hit: 1, classes: ['ASSASSIN'] }), 0);
  assert.equal(value('Poised Strike', 'wake', { prepared: 1, hit: 0, classes: ['ASSASSIN'] }), 0);
});
test('draw access agrees with exhaustive small-population enumeration', () => {
  const outcomes: number[][] = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) outcomes.push([a, b]);
  assert.ok(Math.abs(fixtureAccess(6, 2, 2) - outcomes.filter(draw => draw.some(i => i < 2)).length / outcomes.length) < 1e-12);
  const main = [{ name: 'A', quantity: 4 }, { name: 'B', quantity: 4 }, { name: 'Other', quantity: 52 }];
  assert.ok(Math.abs(fixturePairAccess(main, [main[0]], [main[1]], 2) - 32 / (60 * 59)) < 1e-12);
  assert.equal(fixturePairAccess(main, [main[0]], [], 10), 0);
  assert.equal(fixtureAccess(0, 4, 10), 0);
  assert.equal(fixtureAccess(4, 4, 10), 1);
});
test('packages show zero without supports and count duplicate main lines once', () => {
  assert.equal(value('Burst Asunder', 'package'), 0);
  const d = deck('Burst Asunder', 'Fractal of Waves', 'Fractal of Waves');
  const row = calculateCardScenarios(d, catalog, state()).find(row => row.id === 'Burst Asunder:package')!;
  assert.equal(row.support?.[0].quantity, 2);
  assert.ok(row.value > 0);
  assert.deepEqual(aggregateLines([{ name: 'A', quantity: 2 }, { name: 'A', quantity: 2 }, { name: 'B', quantity: -1 }]), [{ name: 'A', quantity: 4 }]);
});
test('negate, tax and printed-life coverage use actual opposing main membership', () => {
  const rows = calculateFixtureMatchup(deck('Engulf', 'Frozen Dismissal', 'Tidal Lock', 'Surging Obstruction', 'Thunderclap', 'Arrow Trap'), deck('Dungeon Guide', 'Giant Tortoise', 'Crosswind Cuts'), catalog, state(), [], '', []);
  const byName = (name: string) => rows.find(row => row.source.name === name)!;
  assert.deepEqual(byName('Engulf').targets.map(line => line.name), ['Dungeon Guide', 'Giant Tortoise']);
  assert.equal(byName('Frozen Dismissal').targets.length, 2);
  assert.match(byName('Frozen Dismissal').detail, /Pay 4/);
  assert.equal(byName('Tidal Lock').targets.length, 3);
  assert.equal(byName('Surging Obstruction').value, '2 copies pay 3 · 1 pay 1');
  assert.deepEqual(byName('Thunderclap').targets.map(line => line.name), ['Dungeon Guide']);
  assert.equal(byName('Arrow Trap').label, 'Return attacking ally');
});
test('variable and missing catalog stats never become guaranteed removal or tax values', () => {
  const partial = new Map(catalog); partial.set('Dungeon Guide', { ...catalog.get('Dungeon Guide')!, life: null, cost_reserve: -1 });
  const rows = calculateFixtureMatchup(deck('Thunderclap', 'Surging Obstruction'), deck('Dungeon Guide', 'Missing'), partial, state(), [], '', []);
  assert.equal(rows[0].targets.length, 0);
  assert.equal(rows[1].targets.length, 0);
  assert.ok(rows.some(row => row.detail.includes('lack fixed life')));
  assert.match(rows.find(row => row.source.name === 'Thunderclap')!.value, /1 unknown/);
});
test('graveyard disruption accounts for opponent choice and physical limits', () => {
  assert.deepEqual(graveyardDisruption(5, 2, 2, true), { removed: 2, floatingMin: 0, floatingMax: 2 });
  assert.deepEqual(graveyardDisruption(5, 2, 4, true), { removed: 4, floatingMin: 1, floatingMax: 2 });
  assert.deepEqual(graveyardDisruption(2, 9, 4, true), { removed: 2, floatingMin: 2, floatingMax: 2 });
  assert.deepEqual(graveyardDisruption(5, 2, 2, false), { removed: 2, floatingMin: 0, floatingMax: 2 });
});
test('prevention uses unequal ordered events, ignores zero events and does not double spend a card', () => {
  assert.deepEqual(defenseAgainstSequence([0, 8, 2, 5], 3, 6), { total: 15, breezePrevented: 8, afterBreeze: 7, destinyPrevented: 8, afterDestiny: 7, destinyTax: 2, recoveryOffset: 6, afterRecovery: 9 });
  assert.equal(defenseAgainstSequence([6, 8], 0, 0).destinyTax, 0);
  assert.equal(defenseAgainstSequence([], 4, 9).total, 0);
});
test('combat and named disruption preserve class, selected name and link requirements', () => {
  const own = deck('Port Smuggler', "Protector's Plate", 'Nia, Mistveiled Scout', "Jianyu, Fate's Premonition", 'Total Whiteout');
  const opponent = deck('Port Smuggler', 'Dungeon Guide', 'Crosswind Cuts');
  const rows = calculateFixtureMatchup(own, opponent, catalog, state({ classes: ['ASSASSIN'], linked: 1, phantasias: 3 }), ['ASSASSIN'], 'Dungeon Guide', []);
  assert.equal(rows.find(row => row.source.name === 'Port Smuggler')?.value, 'Bypasses intercept');
  assert.deepEqual(rows.find(row => row.source.name === "Protector's Plate")?.targets.map(line => line.name), ['Crosswind Cuts']);
  assert.match(rows.find(row => row.source.name === "Jianyu, Fate's Premonition")!.value, /\+5 cost/);
  assert.equal(rows.find(row => row.source.name === 'Total Whiteout')?.targets.length, 2);
});
test('version comparison shows additions/removals and probability deltas without multiplying one-copy outcomes', () => {
  const before = deck('Burst Asunder'); const after = deck('Burst Asunder', 'Burst Asunder', 'Fractal of Waves');
  const delta = compareFixtureScenarios(before, after, catalog, state({ fractals: 2 }), state({ fractals: 2 }));
  const damage = delta.find(row => row.id === 'Burst Asunder:damage')!;
  assert.equal(damage.before?.value, 6); assert.equal(damage.after?.value, 6);
  assert.ok(damage.after!.access! > damage.before!.access!);
  assert.ok(delta.find(row => row.id === 'Fractal of Waves:draw')?.before === undefined);
});
test('server rendering handles empty deck, missing catalog names and comparison empty state', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router-dom');
  const { default: CardScenarios } = await import('../src/features/analytics/CardScenarios');
  const { default: FixtureComparison } = await import('../src/features/analytics/FixtureComparison');
  const render = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(MemoryRouter, {}, child));
  assert.equal(render(createElement(CardScenarios, { deck: deck(), cardsByName: new Map() })), '');
  const missing = render(createElement(CardScenarios, { deck: deck('Crosswind Cuts'), cardsByName: new Map() }));
  assert.match(missing, /Crosswind Cuts/); assert.match(missing, /Card data incomplete/);
  const empty = render(createElement(FixtureComparison, { baseline: deck(), target: deck(), cardsByName: new Map(), baselineLabel: 'A', targetLabel: 'B' }));
  assert.match(empty, /No supported interactions/);
});

test('version answer pool access accounts for added answers without including unrelated cards', () => {
  const rows = compareFixtureScenarios(deck('Engulf'), deck('Engulf', 'Thunderclap', 'Giant Tortoise'), catalog, state(), state());
  const row = rows.find(row => row.id === 'answerAccess')!;
  assert.equal(row.before?.value, 1); assert.equal(row.after?.value, 2);
  assert.ok(row.after!.access! > row.before!.access!);
});
