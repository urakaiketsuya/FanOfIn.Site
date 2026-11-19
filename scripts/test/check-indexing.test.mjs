import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { STATIC_SITEMAP_ROUTES } from '../../shared/src/discoverySeo.ts';
import { canonicalSiteUrl } from '../../shared/src/seo.ts';
import { sitemapUrls, assertIndexableHtml, checkBuiltIndexing, smokeIndexing } from '../check-indexing.mjs';
const url = 'https://fanofin.site/cards/';
const xml = urls => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
const html = url => `<title>Cards</title><meta name="description" content="Browse cards"><link rel="canonical" href="${url}"><div id="root"><h1>Cards</h1><p>Grand Archive cards</p></div>`;
test('sitemap validation rejects duplicate, filtered, off-site and noncanonical URLs', () => {
  assert.deepEqual(sitemapUrls(xml([url])), [url]);
  for (const urls of [[url, url], [url + '?q=test'], ['https://example.com/cards/'], ['https://fanofin.site/cards']]) assert.throws(() => sitemapUrls(xml(urls)));
});
test('document validation rejects fallbacks, blocked pages and conflicting canonicals', () => {
  assertIndexableHtml(html(url), url);
  for (const body of [html(url).replace(url, 'https://fanofin.site/'), html(url) + '<meta content="noindex,follow" name="robots">', html(url) + '<link rel="canonical" href="https://fanofin.site/">', html(url).replace(/<h1>.*?<\/h1>/, '')]) assert.throws(() => assertIndexableHtml(body, url));
  assert.throws(() => assertIndexableHtml(html(url), url, new Headers({ 'X-Robots-Tag': 'noindex' })));
});
test('build guard rejects the sitemap-without-documents regression', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'indexing-guard-'));
  try {
    // Missing required browse pages must fail even if a sitemap is syntactically valid.
    await writeFile(path.join(outDir, 'sitemap.xml'), xml([url]));
    await assert.rejects(checkBuiltIndexing({ outDir, publicUrls: [] }), /missing from sitemap/);
    await writeFile(path.join(outDir, 'sitemap.xml'), xml([...new Set(STATIC_SITEMAP_ROUTES.map(canonicalSiteUrl))]));
    await assert.rejects(checkBuiltIndexing({ outDir, publicUrls: [] }), /no generated document/);
  } finally { await rm(outDir, { recursive: true, force: true }); }
});
test('live smoke rejects HTTP 404, noindex and canonical mismatches on indexed pages', async () => {
  const { STATIC_SITEMAP_ROUTES } = await import('../../shared/src/discoverySeo.ts');
  const { canonicalSiteUrl } = await import('../../shared/src/seo.ts');
  const urls = [...new Set([...STATIC_SITEMAP_ROUTES.map(canonicalSiteUrl), 'https://fanofin.site/cards/extra-a/', 'https://fanofin.site/cards/extra-z/'])];
  for (const mode of ['ok', '404', 'noindex', 'canonical', 'head-404']) {
    const fetchImpl = async (input, options) => {
      const path = new URL(input).pathname;
      if (path === '/sitemap.xml') return new Response(xml(urls));
      if (path === '/decks/sitemap.xml') return new Response(xml([]));
      if (path === '/robots.txt') return new Response('User-agent: *\nAllow: /\nSitemap: https://fanofin.site/sitemap.xml\nSitemap: https://fanofin.site/decks/sitemap.xml');
      return new Response(html(mode === 'canonical' ? 'https://fanofin.site/wrong/' : 'https://fanofin.site' + path), { status: mode === '404' || (mode === 'head-404' && options.method === 'HEAD' && path === '/cards/extra-a/') ? 404 : 200, headers: mode === 'noindex' ? { 'X-Robots-Tag': 'noindex' } : {} });
    };
    const result = smokeIndexing({ fetchImpl, publicUrls: [url], allStatuses: true });
    if (mode === 'ok') await result; else await assert.rejects(result);
  }
});
