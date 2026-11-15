import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ENTRIES, entryIsActive, linkIsActive } from '../src/lib/navigation';

test('deck and collection journeys each have one active section', () => {
  for (const [path, label] of [['/decks/new', 'Decks'], ['/decks/edit', 'Decks'], ['/decks/draft', 'Decks'], ['/decks/saved-id', 'Decks'], ['/deck-analysis', 'Decks'], ['/looking-for', 'Collection'], ['/merchandise', 'Collection'], ['/champions/Diana', 'Champions'], ['/combos/shared-id', 'Tools']]) {
    assert.deepEqual(NAV_ENTRIES.filter(entry => entryIsActive(entry, path)).map(entry => entry.label), [label]);
  }
});
test('browse filters retain current links while query-specific siblings win', () => {
  assert.equal(linkIsActive('/cards', '?tab=sets&set=DOA', '/cards'), true);
  assert.equal(linkIsActive('/players', '?tab=players', '/players'), true);
  assert.equal(linkIsActive('/players', '?tab=judges', '/players'), false);
  assert.equal(linkIsActive('/players', '?tab=judges', '/players?tab=judges'), true);
  assert.equal(linkIsActive('/players', '', '/players?tab=judges'), false);
  assert.equal(linkIsActive('/decks/new', '', '/decks'), false);
  assert.equal(NAV_ENTRIES.some(entry => entryIsActive(entry, '/cards-unrelated')), false);
});

test('archived calculators have no navigation entry while recorded-result tools remain', () => {
  const links = NAV_ENTRIES.flatMap(entry => entry.kind === 'group' ? entry.links : [entry]);
  assert.equal(links.some(link => link.to === '/combo-lab'), false);
  assert.equal(links.some(link => link.to === '/match-log'), true);
});
