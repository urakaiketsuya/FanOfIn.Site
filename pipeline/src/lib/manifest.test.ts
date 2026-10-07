import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readGeneratedAt } from '../manifest.js';

test('manifest reads top-level timestamps regardless of property order', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'manifest-'));
  const target = path.join(directory, 'data.json');
  const stamp = '2026-10-07T00:00:00.000Z';
  try {
    for (const data of [
      { generatedAt: stamp, rows: [] },
      { rows: ['x'.repeat(400)], generatedAt: stamp },
      { nested: { generatedAt: 'wrong' }, generatedAt: stamp },
    ]) {
      await writeFile(target, JSON.stringify(data));
      assert.equal(await readGeneratedAt(target), stamp);
    }
    await writeFile(target, JSON.stringify({ nested: { generatedAt: stamp } }));
    assert.equal(await readGeneratedAt(target), null);
    assert.equal(await readGeneratedAt(path.join(directory, 'absent.json')), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
