import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { championMetadata, archetypeMetadata, eventMetadata, STATIC_SITEMAP_ROUTES } from '../../shared/src/discoverySeo.ts';
import { canonicalSiteUrl, isCardPageSlug } from '../../shared/src/seo.ts';
import { renderDiscoveryPage, championEntry, archetypeEntry, eventEntry, refreshDiscoverySitemap, buildDiscoveryPages } from '../build-discovery-pages.mjs';
import { renderDiscoveryImage } from '../discovery-social-image.mjs';
const shell = await readFile(new URL('../../app/index.html', import.meta.url), 'utf8');
const champion = { championName: 'Diao Chan', seasons: [{ seasonName: 'Test season', deckCount: 8, eventCount: 3, avgWinRate: 0.5 }] };
const cluster = { id: 'abc', name: 'Water </script> & "Cards"', championName: 'Diao Chan', definingCards: [{ name: 'Unknown card', prevalence: 0.5 }], deckCount: 8, playerCount: 4, eventCount: 3, deckIds: ['1:12'] };
const event = { id: 1, name: 'Worlds </script>', status: 'complete', category: 'worlds', date: '2026-10-01T00:00:00Z', playerCount: 3, hostName: 'Test host', topPlayerIdentity: { placement: 2, playerName: 'Runner up', championName: 'Diao Chan' } };
const bundle = { id: 1, players: [{ id: 12, username: '<player>', finalPlacement: 2 }, { id: 13, username: 'Unknown', finalPlacement: null }], decklists: [{ player: 12, visible: true, decklist: {} }] };
const card = { name: 'Diao Chan, Test', slug: 'diao-chan-test', types: ['CHAMPION'], level: 3, editions: [] };
const xml = '<urlset><url><loc>https://fanofin.site/top-decks</loc></url><url><loc>https://fanofin.site/champions/Guo%20Jia</loc></url><url><loc>https://fanofin.site/events/999</loc></url><url><loc>https://fanofin.site/cards/card/</loc></url></urlset>';
test('canonical routes normalize legacy champion spaces and query state without treating browse pages as cards', () => {
  assert.equal(canonicalSiteUrl('/champions/Guo%20Jia?tab=season'), championMetadata('Guo Jia').url);
  assert.equal(canonicalSiteUrl('/champions/Guo-Jia/stats/'), championMetadata('Guo Jia', true).url);
  assert.equal(canonicalSiteUrl('/events/1?tab=decklists'), eventMetadata(event).url);
  for (const slug of ['spoilers', 'banlist', 'search-reference']) assert.equal(isCardPageSlug(slug), false);
  assert.equal(canonicalSiteUrl('/decks/shared'), 'https://fanofin.site/decks/shared');
  assert.equal(canonicalSiteUrl('/archetypes/compare'), 'https://fanofin.site/archetypes/compare');
  assert.notEqual(championMetadata('Diao Chan').title, championMetadata('Diao Chan', true).title);
});
test('initial HTML safely exposes metadata, readable content, app root and consistent structured URLs', () => {
  const entry = archetypeEntry(cluster, [], '2026-11-18');
  const html = renderDiscoveryPage(shell, entry.meta, entry.body);
  assert.match(html, /Unknown card/); assert.match(html, /&lt;\/script&gt;/);
  assert.match(html, /tab=decklists&amp;player=12/); assert.match(html, /min-height:48px/);
  assert.match(html, /summary_large_image/); assert.match(html, /<div id="root">/);
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
  assert.equal((html.match(/property="og:image"/g) ?? []).length, 1);
  const structured = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(structured.url, archetypeMetadata(cluster).url);
  assert.equal(structured.image, entry.meta.image);
  assert.throws(() => renderDiscoveryPage('<html></html>', entry.meta, ''), /root/);
});
test('event preview preserves recorded placement and does not invent a winner or expose hidden deck links', () => {
  const entry = eventEntry(event, bundle, []);
  assert.match(entry.body, /#2 Runner up/); assert.doesNotMatch(entry.body, /winner|Unknown/);
  assert.match(entry.body, /player=12/);
  const hidden = eventEntry(event, { ...bundle, decklists: [{ player: 12, visible: false, decklist: {} }] }, []);
  assert.doesNotMatch(hidden.body, /player=12/);
  const empty = eventEntry({ ...event, topPlayerIdentity: null }, { players: [], decklists: [] }, []);
  assert.match(empty.body, /No placements recorded/);
  assert.doesNotMatch(eventEntry(event, { ...bundle, decklists: { error: 'Decklists not public for this event.' } }, []).body, /player=12/);
});
test('empty champion seasons and archetypes retain useful name-based content', () => {
  const empty = championEntry({ ...champion, seasons: [] }, [], [], '2026-11-18', true);
  assert.match(empty.body, /No recorded season results/); assert.match(empty.body, /No recorded archetypes/);
  assert.doesNotMatch(empty.body, /NaN|undefined/);
});
test('sitemap replacement is idempotent and removes stale detail URLs and redirects', () => {
  const urls = [championMetadata('Diao Chan').url, archetypeMetadata(cluster).url, eventMetadata(event).url];
  const result = refreshDiscoverySitemap(xml, urls);
  assert.equal(refreshDiscoverySitemap(result, urls), result);
  assert.doesNotMatch(result, /top-decks|Guo%20Jia|events\/999/);
  assert.match(result, /cards\/card\//);
  for (const route of ['/decks', '/metagame', '/cards/staples', '/cards/spoilers', '/cards/banlist']) assert.ok(STATIC_SITEMAP_ROUTES.includes(route));
});
test('landscape previews render with and without bundled artwork', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'discovery-art-'));
  try {
    await sharp({ create: { width: 250, height: 349, channels: 3, background: '#89b4fa' } }).jpeg().toFile(path.join(dir, 'test.jpg'));
    for (const cards of [[], [{ ...card, editions: [{ image: '/cards/images/test.jpg' }] }]]) {
      const bytes = await renderDiscoveryImage({ title: 'Very long tournament title '.repeat(15), label: 'Test', subtitle: 'Missing artwork supported', cards }, [dir]);
      const meta = await sharp(bytes).metadata(); assert.equal(meta.width, 1200); assert.equal(meta.height, 630);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('build emits only eligible events, removes stale output, and matches sitemap/images to pages', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'discovery-build-')), dataDir = path.join(dir, 'data'), outDir = path.join(dir, 'out');
  const put = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  try {
    await put(path.join(dataDir, 'analysis/champion-trends.json'), { generatedAt: '2026-11-18', champions: [champion] });
    await put(path.join(dataDir, 'analysis/archetype-taxonomy.json'), { generatedAt: '2026-11-18', clusters: [cluster] });
    await put(path.join(dataDir, 'omnidex/index.json'), { events: [event, { ...event, id: 2, category: 'regular' }] });
    await put(path.join(dataDir, 'omnidex/events/1.json'), bundle);
    await put(path.join(dataDir, 'card-catalog.json'), { cards: [card] });
    await put(path.join(outDir, 'index.html'), shell); await put(path.join(outDir, 'sitemap.xml'), xml);
    await put(path.join(outDir, 'events/999/index.html'), 'stale');
    assert.equal(await buildDiscoveryPages({ dataDir, outDir, artDirs: [] }), 7);
    await assert.rejects(access(path.join(outDir, 'events/999/index.html')));
    await assert.rejects(access(path.join(outDir, 'events/2/index.html')));
    for (const meta of [championMetadata('Diao Chan'), championMetadata('Diao Chan', true), archetypeMetadata(cluster), eventMetadata(event)]) {
      const html = await readFile(path.join(outDir, meta.path, 'index.html'), 'utf8');
      assert.ok(html.includes(meta.url)); await access(path.join(outDir, new URL(meta.image).pathname));
    }
    const first = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
    await buildDiscoveryPages({ dataDir, outDir, artDirs: [] });
    assert.equal(await readFile(path.join(outDir, 'sitemap.xml'), 'utf8'), first);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('archetypes and events use recorded Material champions rather than another level or element', () => {
  const alternate = { ...card, name: 'Diao Chan, Different Element', level: 4 };
  const cards = [alternate, card];
  const archetype = archetypeEntry({ ...cluster, materialDefiningCards: [{ name: card.name }] }, cards, '2026-11-18');
  assert.equal(archetype.image.cards[0].name, card.name);
  const entry = eventEntry(event, { ...bundle, players: [{ id: 12, username: 'Runner up', finalPlacement: 2 }], decklists: [{ player: 12, visible: true, decklist: { material: [{ card: card.name, quantity: 1 }] } }] }, cards);
  assert.equal(entry.image.cards[0].name, card.name);
  assert.equal(eventEntry(event, { ...bundle, decklists: [] }, cards).image.cards.length, 0);
});
