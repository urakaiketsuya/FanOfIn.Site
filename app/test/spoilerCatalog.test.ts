import test from 'node:test';
import assert from 'node:assert/strict';
import { withSpoilerCards } from '../src/lib/spoilerCatalog';
import { findDeckChampionName } from '../src/lib/ttsExport';
import { previewCardImage } from '../src/lib/previewCards';

test('shared catalog resolves CBL art and champion identity without official sync', () => {
  const cards = withSpoilerCards([]);
  const champion = cards.find(card => card.name === "Casella, Sky's Cantatrice");
  assert.ok(champion);
  assert.ok(previewCardImage(champion));
  assert.equal(findDeckChampionName([{ card: champion.name, quantity: 1 }], new Map(cards.map(card => [card.name, card]))), champion.name);
  const official = { ...champion, uuid: 'official-casella' };
  assert.equal(withSpoilerCards([official]).filter(card => card.name === champion.name).length, 1);
  assert.equal(withSpoilerCards([official]).find(card => card.name === champion.name)?.uuid, official.uuid);
});
