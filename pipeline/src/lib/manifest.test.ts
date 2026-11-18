import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { shortHash } from '@gatcg/shared';
import { writeManifest, readGeneratedAt } from '../manifest.js';

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

test('publisher includes empty known champions and preserves observed populations', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'champion-manifest-'));
  const stamp = '2026-11-18T00:00:00.000Z';
  const champion = "Casella, Sky's Cantatrice";
  try {
    await mkdir(path.join(directory, 'analysis'), { recursive: true });
    await mkdir(path.join(directory, 'reference'), { recursive: true });
    const save = (file: string, data: unknown) => writeFile(path.join(directory, file), JSON.stringify(data));
    await save('card-catalog.json', { cards: [{ name: 'Recorded champion', types: ['CHAMPION'], subtypes: [] }] });
    await save('reference/card-spoilers-2026-11-01.json', { cards: [
      { name: champion, types: ['CHAMPION'], subtypes: [] },
      { name: 'Casella, Volant Songstress', types: ['CHAMPION'], subtypes: [] },
      { name: 'Spirit of Wind', types: ['CHAMPION'], subtypes: ['SPIRIT'] }, { name: 'Action', types: ['ACTION'], subtypes: [] },
    ] });
    const cards = { generatedAt: stamp, cardNames: ['Ally'], decks: [
      { deckId: 'event:player', main: [[0, 4]], material: [], sideboard: [] },
    ] };
    const popularity = { generatedAt: stamp, entries: [{ deckId: 'event:player', championName: 'Recorded champion' }] };
    await save('analysis/deck-card-index.json', cards);
    await save('analysis/deck-popularity-index.json', popularity);
    await writeManifest(directory);
    const read = async (file: string) => JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    const manifest = await read('manifest.json');
    const key = shortHash('Casella');
    assert.equal(manifest[`champion-decks-${key}`], stamp);
    assert.deepEqual(await read(`analysis/champion-decks/${key}.json`), {
      generatedAt: stamp, cards: { generatedAt: stamp, cardNames: [], decks: [] },
      popularity: { generatedAt: stamp, entries: [] },
    });
    const observed = await read(`analysis/champion-decks/${shortHash('Recorded champion')}.json`);
    assert.deepEqual(observed.cards, cards);
    assert.equal(observed.popularity.entries.length, 1);
    assert.equal(manifest[`champion-decks-${shortHash('Action')}`], undefined);
    assert.equal(manifest[`champion-decks-${shortHash('Spirit of Wind')}`], undefined);
    assert.equal(Object.keys(manifest).filter(key => key.startsWith('champion-decks-')).length, 2);
    // A subsequent tournament publication replaces the empty population.
    popularity.entries[0].championName = 'Casella';
    await save('analysis/deck-popularity-index.json', popularity);
    await writeManifest(directory);
    assert.equal((await read(`analysis/champion-decks/${key}.json`)).cards.decks.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
