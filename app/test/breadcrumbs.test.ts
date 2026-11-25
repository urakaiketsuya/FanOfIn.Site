import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ancestorBreadcrumbs, defaultBreadcrumbs, nextBreadcrumbs, routeLabel } from '../src/lib/breadcrumbs';

test('detail trails preserve full filtered source URLs and trim loops', () => {
  const source = { to: '/cards/spoilers?q=class%3Amage&sort=name&group=element', label: 'Card spoilers' };
  const trail = nextBreadcrumbs(defaultBreadcrumbs('/cards/spoilers'), source, '/cards/example');
  assert.deepEqual(trail.at(-1), source);
  assert.deepEqual(nextBreadcrumbs(trail, { to: '/cards/example', label: 'Example' }, source.to), defaultBreadcrumbs('/cards/spoilers'));
});
test('primary navigation resets trail and direct details have a useful parent', () => {
  assert.deepEqual(defaultBreadcrumbs('/cards/example'), [{ to: '/', label: 'Home' }, { to: '/cards', label: 'Browse Cards' }]);
  assert.deepEqual(nextBreadcrumbs([{ to: '/', label: 'Home' }], { to: '/cards/example', label: 'Example' }, '/players'), [{ to: '/', label: 'Home' }]);
});
test('deep journeys remain bounded while retaining immediate source', () => {
  let trail = defaultBreadcrumbs('/cards/example');
  for (let index = 0; index < 10; index++) trail = nextBreadcrumbs(trail, { to: `/cards/card-${index}`, label: `Card ${index}` }, `/cards/card-${index + 1}`);
  assert.equal(trail.length, 4);
  assert.equal(trail[0].to, '/');
  assert.equal(trail.at(-1)?.to, '/cards/card-9');
});

test('fallback breadcrumb labels never expose route parameters', () => {
  assert.equal(routeLabel('/players/12345'), 'Details');
  assert.equal(routeLabel('/decks/876%3Aplayer-name'), 'Details');
  assert.equal(routeLabel('/thema/de5cac89-a12a-42c8-af47-24b26b296e52'), 'Details');
  assert.equal(routeLabel('/players?tab=judges'), 'Judges');
  assert.equal(routeLabel('/players?q=avery#results'), 'Players');
});

test('ancestors exclude the current route regardless of query, hash, or trailing slash', () => {
  const browse = { to: '/players?q=avery#results', label: 'Players' };
  const current = { to: '/players/12345?tab=decks#history', label: 'Player Name' };
  assert.deepEqual(ancestorBreadcrumbs([browse, current], '/players/12345/'), [browse]);
});
