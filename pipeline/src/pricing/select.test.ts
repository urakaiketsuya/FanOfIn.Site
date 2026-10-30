import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectGroupPrices } from './select.js';
import type { TcgcsvPrice, TcgcsvProduct } from './tcgcsv.js';
const product = (productId: number, name: string, number = '011'): TcgcsvProduct => ({ productId, name, groupId: 24457, url: `https://example.com/${productId}`, extendedData: [{ name: 'Number', displayName: 'Number', value: number }] });
const row = (productId: number, subTypeName: string, marketPrice: number | null): TcgcsvPrice => ({ productId, subTypeName, marketPrice, lowPrice: .1, midPrice: 1, highPrice: 2 });
const group = { abbreviation: 'PTM' };
test('ordinary Enfeebling Orb survives an unpriced Curio collision regardless of feed order', () => {
  const products = [product(665244, 'Enfeebling Orb'), product(665511, 'Enfeebling Orb (Curio Foil)')];
  const rows = [row(665244, 'Normal', .32), row(665244, 'Foil', 23.33), row(665511, 'Foil', null)];
  const result = selectGroupPrices(group, products, rows);
  assert.deepEqual(result, selectGroupPrices(group, [...products].reverse(), [...rows].reverse()));
  assert.equal(result['PTM-011'].normal?.market, .32);
  assert.equal(result['PTM-011'].foil?.market, 23.33);
  assert.equal(result['PTM-011'].tcgplayerProductId, 665244);
  assert.equal(result['PTM-011'].tcgplayerUrl, 'https://example.com/665244');
});
test('never borrows a variant finish or market quote when the ordinary product has none', () => {
  const result = selectGroupPrices(group, [product(1, 'Card'), product(2, 'Card (Curio Foil)')], [row(2, 'Foil', 100)]);
  assert.equal(result['PTM-011'].tcgplayerProductId, 1);
  assert.equal(result['PTM-011'].normal, null);
  assert.equal(result['PTM-011'].foil, null);
});
test('valid zero survives duplicates, invalid numeric values become missing, sealed products are skipped', () => {
  const result = selectGroupPrices(group, [product(1, 'Card'), product(2, 'Box', '')], [row(1, 'Normal', NaN), row(1, 'Normal', 0), row(1, 'Foil', -1), row(2, 'Normal', 100)]);
  assert.equal(result['PTM-011'].normal?.market, 0);
  assert.equal(result['PTM-011'].foil?.market, null);
  assert.equal(Object.keys(result).length, 1);
});
test('stable product selection retains both finishes from one product', () => {
  const products = [product(10, 'Card'), product(20, 'Card')];
  const rows = [row(10, 'Normal', 1), row(10, 'Foil', 20), row(20, 'Normal', 2), row(20, 'Foil', .5)];
  const result = selectGroupPrices(group, products, rows);
  assert.deepEqual(result, selectGroupPrices(group, [...products].reverse(), rows));
  assert.equal(result['PTM-011'].normal?.market, 2);
  assert.equal(result['PTM-011'].foil?.market, .5);
  assert.equal(result['PTM-011'].tcgplayerProductId, 20);
});
