import assert from 'node:assert/strict';
import test from 'node:test';
import { saveCuration, exportCuration } from '../src/lib/curationStorage';
import { emptyStore, parseStore } from '../src/features/archetypes/localArchetypes';
import { parseStrategyStore } from '@gatcg/shared';

for (const [name, parse] of [['builds', parseStore], ['strategies', parseStrategyStore]] as const) {
  test(`${name}: corrupt storage is exportable and protected until explicit recovery`, () => {
    let value = '{damaged';
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    assert.equal(exportCuration(storage, 'key', emptyStore()), value);
    assert.throws(() => saveCuration(storage, 'key', emptyStore(), parse));
    assert.equal(value, '{damaged');
    saveCuration(storage, 'key', emptyStore(), parse, true);
    assert.deepEqual(JSON.parse(value), emptyStore());
  });
  test(`${name}: quota and blocked storage never report save success`, () => {
    const previous = JSON.stringify(emptyStore());
    const storage = { getItem: () => previous, setItem: () => { throw new Error('QuotaExceededError'); } };
    assert.throws(() => saveCuration(storage, 'key', emptyStore(), parse), /QuotaExceeded/);
    assert.equal(storage.getItem(), previous);
    const blocked = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => assert.fail('Must not write') };
    assert.throws(() => saveCuration(blocked, 'key', emptyStore(), parse), /SecurityError/);
    assert.throws(() => exportCuration(blocked, 'key', emptyStore()), /SecurityError/);
  });
}
