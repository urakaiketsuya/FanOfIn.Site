import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listCachedBundles, readCachedBundle } from './cache';
test('restored caches retain published small-event backfills and prefer fresh snapshots', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'omni-cache-'));
  const dirs = { cache: path.join(root, 'cache'), published: path.join(root, 'published') };
  const bundle = (id: number, fetchedAt: string, username: string) => ({ id, fetchedAt, event: { status: 'complete', players: [31533] }, players: [{ id: 31533, username }], pairingsByRound: [] });
  try {
    await Promise.all(Object.values(dirs).map(dir => mkdir(dir)));
    await writeFile(path.join(dirs.cache, '1.json'), JSON.stringify(bundle(1, '2026-01-01', 'Old name')));
    await writeFile(path.join(dirs.published, '1.json'), JSON.stringify(bundle(1, '2026-02-01', 'Current name')));
    await writeFile(path.join(dirs.published, '2.json'), JSON.stringify(bundle(2, '2026-02-01', 'Small-event player')));
    assert.equal((await readCachedBundle(1, dirs))?.players[0].username, 'Current name');
    assert.deepEqual((await listCachedBundles(dirs)).map(b => b.id), [1, 2]);
    assert.equal((await readCachedBundle(2, dirs))?.players[0].username, 'Small-event player');
    await writeFile(path.join(dirs.cache, '1.json'), JSON.stringify(bundle(1, '2026-03-01', 'Newest name')));
    assert.equal((await readCachedBundle(1, dirs))?.players[0].username, 'Newest name');
    assert.equal(await readCachedBundle(3, dirs), null);
    await writeFile(path.join(dirs.cache, '1.json'), '{broken');
    await assert.rejects(listCachedBundles(dirs), SyntaxError);
  } finally { await rm(root, { recursive: true, force: true }); }
});
