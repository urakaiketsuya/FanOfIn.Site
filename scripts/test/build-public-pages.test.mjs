import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildPublicPages, publicEntries } from '../build-public-pages.mjs';
import { canonicalSiteUrl } from '../../shared/src/seo.ts';
import { PUBLIC_PAGE_ROUTES } from '../../shared/src/seo.ts';
import { sitemapUrls, assertIndexableHtml, expectedPublicUrls } from '../check-indexing.mjs';
const shell = await readFile(new URL('../../app/index.html', import.meta.url), 'utf8');
test('every public app entry, season and primer uses its directly served directory canonical', async () => {
  const urls = await expectedPublicUrls();
  for (const url of urls) assert.ok(url.endsWith('/'), url);
  for (const path of ['/cards', '/decks', '/decks/shared', '/cards/tags', '/archetypes/strategies', '/docs/api', '/timelines/combos']) assert.equal(canonicalSiteUrl(`${path}?q=test`), `https://fanofin.site${path}/`);
  for (const path of ['/account', '/decks/new', '/cards/tagging', '/archetypes/mine', '/collection']) assert.ok(!PUBLIC_PAGE_ROUTES.some(([route]) => route === path));
  assert.equal(canonicalSiteUrl('/decks/' + 'a'.repeat(32)), 'https://fanofin.site/decks/' + 'a'.repeat(32));
});
test('build supplies readable content for every public URL, preserves detail entries and is repeatable', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'public-entry-'));
  try {
    await writeFile(path.join(outDir, 'index.html'), shell);
    await writeFile(path.join(outDir, 'sitemap.xml'), '<urlset><url><loc>https://fanofin.site/cards/test-card/</loc></url><url><loc>https://fanofin.site/seasons/retired/</loc></url><url><loc>https://fanofin.site/official-decks/retired/primer/</loc></url></urlset>');
    const expected = await expectedPublicUrls();
    assert.equal(await buildPublicPages({ outDir }), expected.length);
    const xml = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
    const urls = sitemapUrls(xml);
    assert.ok(urls.includes('https://fanofin.site/cards/test-card/'));
    assert.ok(!urls.some(url => url.includes('/retired/')));
    for (const url of expected) {
      assert.ok(urls.includes(url), url);
      const html = await readFile(path.join(outDir, new URL(url).pathname, 'index.html'), 'utf8');
      assertIndexableHtml(html, url);
      assert.equal((html.match(/public-entry-start/g) ?? []).length, 1);
    }
    const primer = await readFile(path.join(outDir, 'official-decks/ciel-mirages-grave/primer/index.html'), 'utf8');
    assert.match(primer, /Opening turns/); assert.match(primer, /Ombreux Chevalier/); assert.match(primer, /<img/);
    await buildPublicPages({ outDir });
    assert.equal(await readFile(path.join(outDir, 'sitemap.xml'), 'utf8'), xml);
    const home = await readFile(path.join(outDir, 'index.html'), 'utf8');
    assert.equal((home.match(/<h1>/g) ?? []).length, 1);
    assert.equal((home.match(/application\/ld\+json/g) ?? []).length, 1);
  } finally { await rm(outDir, { recursive: true, force: true }); }
});
test('editorial display text is escaped and missing primer sources fail before rendering', () => {
  const data = { cards: [], index: { seasons: [], events: [] }, primers: [], official: { decks: [] }, stats: { cards: [] }, spoilers: { cards: [] }, stores: { stores: [] }, teams: { teams: [] }, achievements: { definitions: [] }, tags: { tags: [], cards: {}, editions: {} }, strategies: { entries: [{ definition: { name: '</script><img>' }, coreCards: [], description: '<script>bad()</script>' }] }, changelog: { entries: [] }, matches: { matches: [] } };
  const entry = publicEntries(data).find(entry => entry.route === '/archetypes/strategies');
  assert.match(entry.body, /&lt;script&gt;/); assert.doesNotMatch(entry.body, /<script>/);
  assert.throws(() => publicEntries({ ...data, primers: [{ deckId: 'missing' }] }), /Missing official deck/);
});
