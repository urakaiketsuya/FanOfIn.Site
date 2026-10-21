import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readShoppingDraft } from '../src/features/collection/shoppingDraft';

test('shopping drafts recover valid quantities without accepting malformed stored rows', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ valid: { name: 'Veiling Breeze', quantity: 4 }, negative: { name: 'Burst', quantity: -1 }, fractional: { name: 'Burst', quantity: 1.5 }, excessive: { name: 'Burst', quantity: 100 }, missing: null }) } });
    assert.deepEqual(readShoppingDraft(), { valid: { name: 'Veiling Breeze', quantity: 4 } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{invalid' } });
    assert.deepEqual(readShoppingDraft(), {});
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage unavailable'); } });
    assert.deepEqual(readShoppingDraft(), {});
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
