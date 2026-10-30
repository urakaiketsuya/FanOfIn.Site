import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import DamageStatisticalReport from '../src/features/analytics/DamageStatisticalReport';
import { computeAggressionForecast } from '../src/lib/aggressionForecast';
const cards = JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards as Card[];
const catalog = new Map(cards.map(c => [c.name, c]));
const report = (names: string[]) => computeAggressionForecast(names.map(name => ({ name, quantity: 4 })), catalog, [{ name: 'Covenant of Thorns', quantity: 1 }]);
const render = (forecast: ReturnType<typeof report>) => renderToStaticMarkup(<MemoryRouter><DamageStatisticalReport forecast={forecast} cardsByName={catalog} /></MemoryRouter>);
test('Storm Slime has access and conditional damage rather than a zero forecast', () => {
  const forecast = report(['Storm Slime']);
  assert.ok(!forecast.audit.some(row => row.name === 'Covenant of Thorns'));
  const html = render(forecast);
  assert.match(html, /39.9/);
  assert.match(html, /1 damage per banished Slime/);
  assert.doesNotMatch(html, /median|contain 10\+ damage|Damage coverage incomplete/);
  assert.match(html, /6 damage/);
});
test('quantified damage retains distribution; empty and missing data remain explicit', () => {
  assert.match(render(report(['Fireball'])), /median/);
  assert.match(render(report([])), /No direct damage in this model/);
  assert.match(render(report(['Missing card'])), /Damage amount not modeled/);
});
