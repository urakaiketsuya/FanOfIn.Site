import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDeckPages, renderDeckPage } from '../build-deck-pages.mjs';

const partition = entries => ({ cards: { cardNames: ['Test Card'], decks: entries.map(e => ({ deckId: e.deckId, main: [[0, 4]], material: [], sideboard: [[0, 1]] })) }, popularity: { entries } });
const sighting = (deckId, player, deckHash = 'abc') => ({ deckId, player, deckHash, championName: 'Silvie' });

test('only independent players qualify; repeated sightings are not extra players', () => {
  const pages = collectDeckPages([partition([sighting('a', 1), sighting('b', 1), sighting('c', 2), sighting('d', 3, 'def')])]);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].hash, 'abc');
  assert.equal(pages[0].players.size, 2);
});

test('missing source cards and unsafe routes fail the build', () => {
  assert.throws(() => collectDeckPages([{ cards: { decks: [] }, popularity: { entries: [sighting('a', 1)] } }]), /Missing cards/);
  assert.throws(() => collectDeckPages([partition([sighting('a', 1, '../escape')])]), /Invalid tournament/);
});

test('metadata is escaped, canonical is unique, and app assets and root survive', () => {
  const metas = [['name', 'description'], ['property', 'og:title'], ['property', 'og:description'], ['property', 'og:url'], ['name', 'twitter:title'], ['name', 'twitter:description']].map(([attr, name]) => `<meta ${attr}="${name}" content="generic">`).join('\n');
  const shell = `<head><title>Generic</title>${metas}<link rel="canonical" href="https://fanofin.site/"><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body>`;
  const html = renderDeckPage(shell, { hash: 'abc', champion: '<Silvie> & "friends" $&', players: new Set([1, 2]), sections: [{ name: 'Main', lines: [{ name: '<Test> & Card', quantity: 4 }] }, { name: 'Material', lines: [] }] }, new Map([['<Test> & Card', { slug: 'test-card' }]]));
  assert.match(html, /&lt;Silvie&gt; &amp; &quot;friends&quot; \$&amp;/);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, /href="https:\/\/fanofin.site\/decks\/abc"/);
  assert.match(html, /independently played by 2 players/);
  assert.ok(html.includes('<script type="module" src="/assets/app.js"></script>'));
  assert.match(html, /<div id="root"><style>/);
  assert.match(html, /href="\/cards\/test-card">4 × &lt;Test&gt; &amp; Card/);
  assert.match(html, /Main · 4/);
  assert.doesNotMatch(html, /Sideboard/);
  assert.throws(() => renderDeckPage('<head></head>', { hash: 'abc', champion: 'Silvie', players: new Set() }), /missing description/);
});

test('build regenerates routes, removes stale output and leaves unknown decks absent', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, readdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { buildDeckPages } = await import('../build-deck-pages.mjs');
  const directory = await mkdtemp(path.join(tmpdir(), 'deck-pages-'));
  try {
    const dataDir = path.join(directory, 'data');
    const outDir = path.join(directory, 'dist');
    const source = path.join(dataDir, 'analysis/deck-details');
    await mkdir(source, { recursive: true });
    await writeFile(path.join(dataDir, 'card-catalog.json'), JSON.stringify({ cards: [] }));
    await mkdir(path.join(outDir, 'decks/stale'), { recursive: true });
    await writeFile(path.join(outDir, 'decks/stale/index.html'), 'old');
    // Use the real source shell to catch metadata changes that invalidate generation.
    const shell = await readFile(new URL('../../app/index.html', import.meta.url), 'utf8');
    await writeFile(path.join(outDir, 'index.html'), shell);
    for (let i = 0; i < 256; i++) {
      await writeFile(path.join(source, `${i.toString(16).padStart(2, '0')}.json`), JSON.stringify(partition(i === 0 ? [sighting('a', 1), sighting('b', 2), sighting('c', 3, 'def')] : [])));
    }
    assert.equal(await buildDeckPages({ dataDir, outDir }), 1);
    assert.deepEqual(await readdir(path.join(outDir, 'decks')), ['abc']);
    const page = await readFile(path.join(outDir, 'decks/abc/index.html'), 'utf8');
    assert.match(page, /Silvie deck · Fan of Insight/);
    assert.match(page, /<li>4 × Test Card<\/li>/);
    assert.equal(await readFile(path.join(outDir, 'index.html'), 'utf8'), shell);
    await rm(path.join(source, 'ff.json'));
    await assert.rejects(buildDeckPages({ dataDir, outDir }), /Expected 256/);
    assert.equal(await readFile(path.join(outDir, 'decks/abc/index.html'), 'utf8'), page);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid dictionary references and quantities fail before publishing', () => {
  for (const line of [[2, 4], [0, 0], [0, -1], [0, 1.5]]) {
    const data = partition([sighting('a', 1), sighting('b', 2)]);
    data.cards.decks[0].main = [line];
    assert.throws(() => collectDeckPages([data]), /Invalid card lines/);
  }
});
