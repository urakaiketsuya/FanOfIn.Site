import test from 'node:test';
import assert from 'node:assert/strict';
import spoilers from '../../data/reference/card-spoilers-2026-11-01.json';
import { expandSpoilerPrintings } from '../src/lib/spoilerPrintings';
import { groupSpoilerResults, sortSpoilers, spoilerSetKey, searchSpoilers } from '../src/lib/spoilerCatalog';
import { mergePreviewCards, previewCardImage } from '../src/lib/previewCards';

test('all artwork has stable identities, printing metadata and its own image', () => {
  const printings = expandSpoilerPrintings(spoilers.cards);
  assert.ok(printings.length > spoilers.cards.length);
  assert.equal(new Set(printings.map(p => p.printingId)).size, printings.length);
  const casella = printings.filter(p => p.name === "Casella, Sky's Cantatrice");
  assert.equal(casella.length, 3);
  assert.equal(new Set(casella.map(p => previewCardImage(mergePreviewCards([], [p], true)[0]))).size, 3);
  assert.deepEqual(casella.map(p => p.rarity), ['C', 'CSR', 'CUR']);
});

test('alternate printings retain their own set and addition date through sorting and grouping', () => {
  const printings = expandSpoilerPrintings(spoilers.cards);
  const thunder = printings.filter(p => p.name === 'Let My Thunder Be Heard');
  assert.deepEqual(thunder.map(p => p.setPrefix), ['CBLOS', 'Re:C-SKY']);
  assert.equal(thunder[1].addedAt, '2026-11-24');
  assert.equal(sortSpoilers(thunder, 'newest')[0].collectorNumber, '016');
  assert.equal(thunder.filter(p => spoilerSetKey(p.setPrefix) === 'Re:C-SKY').length, 1);
  assert.equal(groupSpoilerResults(thunder, () => undefined, 'sets').length, 2);
  const legacy = printings.filter(p => p.name === 'Casella, Volant Songstress');
  assert.equal(legacy[1].addedAt, legacy[0].addedAt);
  assert.equal(spoilers.cards.filter(p => p.name === 'Let My Thunder Be Heard').length, 1);
});

test('printing searches distinguish sets without losing same-name artwork', () => {
  const printings = expandSpoilerPrintings(spoilers.cards);
  const all = searchSpoilers('name:"Let My Thunder Be Heard"', printings);
  assert.equal(all.length, 2);
  const rec = searchSpoilers('name:"Let My Thunder Be Heard" set:"Re:C-SKY"', printings);
  assert.deepEqual(rec.map(p => p.collectorNumber), ['016']);
  assert.deepEqual(searchSpoilers('power>=', printings), []);
});
