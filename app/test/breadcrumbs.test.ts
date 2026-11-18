import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultBreadcrumbs, nextBreadcrumbs } from '../src/lib/breadcrumbs';

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
