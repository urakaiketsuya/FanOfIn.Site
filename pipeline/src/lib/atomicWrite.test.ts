import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeJsonAtomic } from './atomicWrite.js';

test('compact publication preserves the previous document on serialization failure and permits retry', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'field-publication-'));
  const target = path.join(directory, 'history.json');
  try {
    await writeJsonAtomic(target, { generation: 1 }, 0);
    const before = await readFile(target, 'utf8');
    const circular: Record<string, unknown> = {}; circular.self = circular;
    await assert.rejects(writeJsonAtomic(target, circular, 0));
    assert.equal(await readFile(target, 'utf8'), before);
    await writeJsonAtomic(target, { generation: 2 }, 0);
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), { generation: 2 });
    assert.ok(!(await readFile(target, 'utf8')).includes('\n'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
