import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderCardPage, buildCardPages } from '../build-card-pages.mjs';
import { cardKeywords, cardPageMetadata } from '../../shared/src/cardSeo.ts';
import { canonicalSiteUrl } from '../../shared/src/seo.ts';

const shell = await readFile(new URL('../../app/index.html', import.meta.url), 'utf8');
const card = {
  slug: 'test-card', name: '</script><b>Test</b> & "Card"', elements: ['FIRE'], classes: ['CLERIC'], types: ['ACTION'], subtypes: ['CLERIC', 'SKILL'],
  cost: { type: 'reserve', value: '2' }, level: null, power: null, life: null, durability: null, speed: false, flavor: 'Old words.',
  effect_raw: 'Deal 2 damage to your champion. Then glimpse 6.',
  effect_html: 'Deal 2. Then <span class="effect__label">glimpse 6</span>. <span class="effect__label">On Enter:</span> <span class="effect__label">Banish Test Card:</span> <span class="effect__label">Recover 3+LV</span> <span class="effect__label">Glimpse</span>', references: [{ name: 'Other Card', slug: 'other-card' }], referenced_by: [],
  editions: [{ uuid: 'ed1', image: '/cards/images/ed1.jpg', illustrator: 'Pekoe', collector_number: '001', set: { name: 'Test Set' } }],
};
const other = { ...card, slug: 'other-card', name: 'Other Card', references: [] };

test('SEO metadata holds only the card name, keywords and effect text', () => {
  const meta = cardPageMetadata(card);
  assert.equal(meta.title, card.name);
  assert.equal(meta.description, `${card.name}. Keywords: Glimpse, On Enter, Recover. Deal 2 damage to your champion. Then glimpse 6.`);
  assert.doesNotMatch(meta.description, /Fire|Cleric|Action/);
  assert.ok(cardPageMetadata({ ...card, effect_raw: 'word '.repeat(80) }).description.length <= 160);
  assert.equal(meta.path, '/cards/test-card/');
  assert.equal(canonicalSiteUrl('/cards/test-card?edition=ed1'), 'https://fanofin.site/cards/test-card/');
  assert.equal(canonicalSiteUrl('/cards/stats'), 'https://fanofin.site/cards/stats');
});

test('keywords drop counts, formulas, costs and duplicates', () => {
  assert.deepEqual(cardKeywords(card), ['Glimpse', 'On Enter', 'Recover']);
  assert.deepEqual(cardKeywords({ effect_html: null }), []);
});

test('entry page keeps the full escaped card body, lean metadata and one canonical', () => {
  const html = renderCardPage(shell, card, new Map([['other-card', other]]));
  const head = html.slice(0, html.indexOf('</head>'));
  assert.doesNotMatch(html, /<\/script><b>Test/);
  assert.match(html, /<h1>&lt;\/script&gt;&lt;b&gt;Test&lt;\/b&gt; &amp; &quot;Card&quot;<\/h1>/);
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/fanofin.site\/cards\/test-card\/">/);
  assert.match(html, /og:image" content="https:\/\/api.gatcg.com\/cards\/images\/ed1.jpg"/);
  assert.match(html, /twitter:card" content="summary"/);
  assert.equal((html.match(/name="description"/g) ?? []).length, 1);
  // Body: everything on the card.
  assert.match(html, /<p>Fire Cleric Action \(Skill\)<\/p>/);
  assert.match(html, /<img src="https:\/\/api.gatcg.com\/cards\/images\/ed1.jpg"/);
  assert.match(html, /<dt>Reserve cost<\/dt><dd>2<\/dd>/);
  assert.match(html, /<p>Keywords: Glimpse, On Enter, Recover<\/p>/);
  assert.match(html, /<blockquote>Old words.<\/blockquote>/);
  assert.match(html, /href="\/cards\/test-card\/\?edition=ed1">Test Set #001<\/a> · Art by Pekoe/);
  assert.match(html, /href="\/cards\/other-card\/">Other Card/);
  // Head: no type line, stats, flavor, printings or structured data.
  assert.doesNotMatch(head, /Fire Cleric|Reserve cost|Old words|Test Set|Pekoe|application\/ld\+json|og:image:width/);
  assert.match(html, /<script type="module"/);
  assert.throws(() => renderCardPage(shell, { ...card, slug: 'stats' }), /Invalid card slug/);
  assert.throws(() => renderCardPage(shell, { ...card, slug: '../escape' }), /Invalid card slug/);
});

test('build writes card pages and replaces card sitemap URLs with canonical ones', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'card-pages-'));
  try {
    const dataDir = path.join(dir, 'data'), outDir = path.join(dir, 'dist');
    await mkdir(dataDir, { recursive: true }); await mkdir(path.join(outDir, 'cards', 'stale'), { recursive: true });
    await writeFile(path.join(dataDir, 'card-catalog.json'), JSON.stringify({ cards: [card, other] }));
    await writeFile(path.join(outDir, 'index.html'), shell);
    await writeFile(path.join(outDir, 'sitemap.xml'), '<urlset>\n  <url><loc>https://fanofin.site/cards/stats</loc></url>\n  <url><loc>https://fanofin.site/cards/old-card</loc></url>\n</urlset>\n');
    assert.equal(await buildCardPages({ dataDir, outDir }), 2);
    const sitemap = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /cards\/stats<\/loc>/);
    assert.doesNotMatch(sitemap, /old-card/);
    assert.match(sitemap, /<loc>https:\/\/fanofin.site\/cards\/test-card\/<\/loc>/);
    await access(path.join(outDir, 'cards', 'other-card', 'index.html'));
    await assert.rejects(access(path.join(outDir, 'cards', 'stale')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
