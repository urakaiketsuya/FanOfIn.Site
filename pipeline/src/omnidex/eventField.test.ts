import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eventField } from './eventField.js';
import type { OmnidexEventBundle } from './cache.js';
const fixture = JSON.parse(readFileSync(new URL('../../../data/omnidex/events/52397.json', import.meta.url), 'utf8')) as OmnidexEventBundle;
const decks = 'error' in fixture.decklists ? [] : fixture.decklists;
const names = new Set(decks.flatMap(d => d.decklist.material.map(l => l.card.trim().toLowerCase())));
const champions = new Map(decks.map((d, i) => [d.player, { championName: i < 4 ? 'A' : 'B' }]));
test('complete field counts every entrant once, independent of top cut', () => {
  const bundle = structuredClone(fixture);
  bundle.event.singleEliminationCutSize = null;
  const result = eventField(bundle, champions, names)!;
  assert.equal(result.entrants, 16);
  assert.deepEqual(result.champions, [{ name: 'B', count: 12 }, { name: 'A', count: 4 }]);
});
test('incomplete, conflicting, private and unresolved fields never get percentages', () => {
  for (const mutate of [
    (b: OmnidexEventBundle) => { b.decklists = decks.slice(1); },
    (b: OmnidexEventBundle) => { b.decklists = [...decks.slice(1), decks[1]]; },
    (b: OmnidexEventBundle) => { if (!('error' in b.decklists)) b.decklists[0].visible = false; },
    (b: OmnidexEventBundle) => { b.teams = { error: 'Failed' }; },
    (b: OmnidexEventBundle) => { b.event.format = 'Team Standard'; },
  ]) {
    const bundle = structuredClone(fixture); mutate(bundle);
    assert.equal(eventField(bundle, champions, names), undefined);
  }
  assert.equal(eventField(fixture, new Map(), names), undefined);
  assert.equal(eventField(fixture, champions, new Set()), undefined);
});
