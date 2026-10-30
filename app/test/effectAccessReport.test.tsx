import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { effectAccessReport, sourceCountRange, calculateCardScenarios, defaultCardScenario, cardReportCheckpoints, type Card } from '@gatcg/shared';
import EffectAccessReport from '../src/features/analytics/EffectAccessReport';
const cards = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
const catalog = new Map(cards.map(card => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/tonoris-water.json', import.meta.url), 'utf8'));
const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
const deck = { main: lines(fixture.main), material: lines(fixture.material) };
test('exact quantiles match enumerated draws and boundary populations', () => {
  assert.deepEqual(sourceCountRange(4, 2, 2), { low: 0, median: 1, high: 2 });
  assert.deepEqual(sourceCountRange(60, 4, 60), { low: 4, median: 4, high: 4 });
  assert.deepEqual(sourceCountRange(60, 0, 20), { low: 0, median: 0, high: 0 });
  assert.deepEqual(sourceCountRange(0, 0, 0), { low: 0, median: 0, high: 0 });
});
test('whole Tonoris list has deduplicated pools and excludes sideboard and Material from draws', () => {
  const report = effectAccessReport({ ...deck, sideboard: [{ name: 'Veiling Breeze', quantity: 4 }] } as typeof deck, catalog);
  assert.equal(report.unavailable, false);
  assert.equal(report.rows.length, 5);
  const tokens = report.rows.find(row => row.id === 'tokens')!;
  assert.equal(tokens.lines.reduce((n, line) => n + line.quantity, 0), 12);
  assert.ok(tokens.points.every((p, i) => !i || p.access >= tokens.points[i - 1].access));
  const draw = report.rows.find(row => row.id === 'draw')!;
  assert.equal(draw.lines.filter(line => line.name === 'Neos Sight').length, 1);
  assert.ok(!report.rows.flatMap(row => row.lines).some(line => line.name === 'Veiling Breeze'));
  const material = effectAccessReport({ main: [], material: [{ name: 'Academy Guide', quantity: 1 }] }, catalog).rows[0];
  assert.ok(material.points.every(p => p.access === 0));
  assert.equal(material.material.length, 1);
});
test('Genesis and reservable outcomes respect champion gates without stacking payments', () => {
  const state = { ...defaultCardScenario(), classes: ['GUARDIAN'], tokens: 5, domains: 4, objects: 8 };
  const rows = calculateCardScenarios(deck, catalog, state);
  const get = (id: string) => rows.find(row => row.id === id)!;
  assert.equal(get('Automata Genesis:titan-power').value, 24);
  assert.deepEqual(cardReportCheckpoints(deck, catalog, state, get('Automata Genesis:titan-power')).map(p => p.value), [18, 24, 30]);
  assert.equal(get('Cordelia, Aurous Kaiser:reserve-payment').value, 5);
  assert.equal(get('The Eternal Kingdom:reserve-payment').value, 4);
  assert.equal(get('Neos Sight:memory-draw').value, 1);
  const other = calculateCardScenarios({ ...deck, material: [] }, catalog, { ...state, classes: [], objects: 7 });
  assert.equal(other.find(r => r.id === 'Automata Genesis:titan-power')!.value, 9);
  assert.equal(other.find(r => r.id === 'Cordelia, Aurous Kaiser:reserve-payment')!.value, 0);
  assert.equal(other.find(r => r.id === 'Neos Sight:memory-draw')!.value, 0);
});
test('defense access pools distinct cards without turning them into outgoing damage', () => {
  const defense = effectAccessReport({ main: lines({ 'Veiling Breeze': 4, 'Crystallized Destiny': 4, 'Flourishing Restoration': 4 }), material: [] }, catalog);
  assert.equal(defense.rows.find(r => r.id === 'prevention')!.lines.length, 2);
  assert.equal(defense.rows.find(r => r.id === 'recovery')!.lines.length, 1);
});
test('reports show removal comparisons, missing and empty states without inputs', () => {
  const render = (main: typeof deck.main, baseline?: typeof deck) => renderToStaticMarkup(<MemoryRouter><EffectAccessReport deck={{ main, material: [] }} baseline={baseline} cardsByName={catalog} /></MemoryRouter>);
  const html = render([], deck);
  assert.match(html, /baseline → target/);
  assert.match(html, /0.0% to find/);
  assert.match(html, /Token producers/);
  assert.doesNotMatch(html, /<input|<select|NaN|Infinity/);
  assert.match(render([]), /No reviewed effect sources/);
  assert.match(render([{ name: 'Unknown', quantity: 1 }]), /report unavailable/);
});
test('eligible boost access requires a drawn target and respects class/level gates', async () => {
  const { computeCombatAccessForecast } = await import('@gatcg/shared');
  const main = lines({ 'Slimeshield': 4, 'Limitless Slime': 4 });
  const forecast = computeCombatAccessForecast(main, [], catalog, 20);
  assert.ok(forecast.boostAccessChance > 0 && forecast.boostAccessChance < 1);
  assert.equal(computeCombatAccessForecast(lines({Slimeshield:4}), [], catalog, 20).boostAccessChance, 0);
  assert.equal(computeCombatAccessForecast(lines({'Limitless Slime':4}), [], catalog, 20).boostAccessChance, 0);
  assert.equal(computeCombatAccessForecast(main, [], catalog, 0).boostAccessChance, 0);
  assert.deepEqual(computeCombatAccessForecast(main, [], catalog, 20), forecast);
});
test('combat comparisons show both ranges and contributing cards without inputs', async () => {
  const { default: CombatRangeComparison } = await import('../src/features/analytics/CombatRangeComparison');
  const html = renderToStaticMarkup(<MemoryRouter><CombatRangeComparison baseline={deck} target={{main: [], material: []}} cardsByName={catalog}/></MemoryRouter>);
  assert.match(html, /Printed power/);
  assert.match(html, /With supported boosts/);
  assert.match(html, /Academy Guide/);
  assert.match(html, /→ 0 \(0–0\)/);
  assert.doesNotMatch(html, /<input|<select|NaN/);
});
test('explicit non-Tonoris champion selection disables the identity bonus', () => {
  const rows = calculateCardScenarios(deck, catalog, { ...defaultCardScenario(), championName: 'Silvie, Slime Sovereign', tokens: 7 });
  assert.equal(rows.find(row => row.id === 'Automata Genesis:titan-power')!.value, 9);
});
test('fixed conditions retain Breeze wind count and Restoration damage cap', async () => {
  const { cardReportFixedConditions } = await import('@gatcg/shared');
  const state = defaultCardScenario();
  const rows = calculateCardScenarios({main: lines({'Veiling Breeze':4,'Flourishing Restoration':4}),material:[]},catalog,state);
  assert.match(cardReportFixedConditions(rows.find(r=>r.name==='Veiling Breeze')!,state), /Wind cards revealed from memory: 2/);
  assert.match(cardReportFixedConditions(rows.find(r=>r.name==='Flourishing Restoration')!,state), /Damage on your champion: 9/);
});
