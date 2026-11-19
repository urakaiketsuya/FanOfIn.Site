import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PAGE_ROUTES, STATIC_SITEMAP_ROUTES, canonicalSiteUrl } from '../shared/src/seo.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attrs(tag) { return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, key, , value]) => [key.toLowerCase(), decode(value)])); }
export function sitemapUrls(xml) {
  assert.match(xml, /<urlset\b[^>]*xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/, 'Invalid sitemap namespace');
  assert.match(xml, /<\/urlset>\s*$/, 'Incomplete sitemap');
  assert.ok(Buffer.byteLength(xml) <= 50 * 1024 * 1024, 'Sitemap exceeds size limit');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  assert.ok(urls.length <= 50000, 'Sitemap exceeds URL limit');
  assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.origin, 'https://fanofin.site', `Unexpected sitemap host: ${value}`);
    assert.equal(value, canonicalSiteUrl(url.pathname), `Noncanonical sitemap URL: ${value}`);
    assert.ok(!url.search && !url.hash, `Filtered URL in sitemap: ${value}`);
  }
  return urls;
}
export function assertIndexableHtml(html, url, headers = new Headers()) {
  assert.ok(!/noindex|none/i.test(headers.get('x-robots-tag') ?? ''), `Blocked by response header: ${url}`);
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  assert.ok(!tags.some(tag => /^(robots|googlebot)$/i.test(tag.name ?? '') && /noindex|none/i.test(tag.content ?? '')), `Blocked by robots meta: ${url}`);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).filter(tag => tag.rel === 'canonical');
  assert.deepEqual(canonical.map(tag => tag.href), [url], `Canonical mismatch: ${url}`);
  assert.match(html, /<title>[^<]+<\/title>/i, `Missing title: ${url}`);
  assert.match(html, /<h1\b[^>]*>[^]*?<\/h1>/i, `Missing readable heading: ${url}`);
  assert.ok(tags.some(tag => tag.name === 'description' && tag.content?.trim()), `Missing description: ${url}`);
  assert.ok(!/<div id="root">\s*<\/div>/.test(html), `Empty SPA fallback: ${url}`);
}
export async function expectedPublicUrls({ dataDir = path.join(root, 'data'), appDir = path.join(root, 'app/src') } = {}) {
  const [index, primers] = await Promise.all([
    readFile(path.join(dataDir, 'omnidex/index.json'), 'utf8').then(JSON.parse),
    readFile(path.join(appDir, 'features/official-products/primers/guides.json'), 'utf8').then(JSON.parse),
  ]);
  return [...new Set(['/', ...PUBLIC_PAGE_ROUTES.map(([route]) => route), ...index.seasons.map(season => `/seasons/${season.slug}`), ...primers.map(guide => `/official-decks/${guide.slug}/primer`)].map(canonicalSiteUrl))];
}
export async function checkBuiltIndexing({ outDir = path.join(root, 'app/dist'), publicUrls } = {}) {
  const urls = sitemapUrls(await readFile(path.join(outDir, 'sitemap.xml'), 'utf8'));
  for (const required of [...STATIC_SITEMAP_ROUTES.map(canonicalSiteUrl), ...(publicUrls ?? await expectedPublicUrls())]) assert.ok(urls.includes(required), `Public page missing from sitemap: ${required}`);
  for (const url of urls) {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const file = path.resolve(outDir, `.${pathname}`, 'index.html');
    assert.ok(file.startsWith(path.resolve(outDir) + path.sep), `Unsafe entry path: ${url}`);
    const html = await readFile(file, 'utf8').catch(error => { throw new Error(`Sitemap target has no generated document: ${url}`, { cause: error }); });
    assertIndexableHtml(html, url);
  }
  console.log(`Indexing documents verified: ${urls.length} canonical, readable sitemap targets`);
  return urls.length;
}
export async function smokeIndexing({ origin = 'https://fanofin.site', fetchImpl = fetch, publicUrls, allStatuses = false } = {}) {
  const get = async canonical => {
    const response = await fetchImpl(new URL(new URL(canonical).pathname, origin), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    assert.equal(response.status, 200, `${canonical}: HTTP ${response.status}`);
    return response;
  };
  const main = sitemapUrls(await (await get('https://fanofin.site/sitemap.xml')).text());
  const community = sitemapUrls(await (await get('https://fanofin.site/decks/sitemap.xml')).text());
  const robots = await (await get('https://fanofin.site/robots.txt')).text();
  for (const route of ['/sitemap.xml', '/decks/sitemap.xml']) assert.ok(robots.includes(`Sitemap: https://fanofin.site${route}`), `Missing robots sitemap declaration: ${route}`);
  // The wildcard policy must remain crawlable; explicit AI crawler groups are independent.
  assert.match(robots, /User-agent:\s*\*\s*\nAllow:\s*\//i, 'Search crawling is not allowed');
  const required = publicUrls ?? await expectedPublicUrls();
  for (const url of [...STATIC_SITEMAP_ROUTES.map(canonicalSiteUrl), ...required]) assert.ok(main.includes(url), `Missing live public URL: ${url}`);
  const samples = [...new Set([...required, ...community, ...['cards/', 'artists/', 'champions/', 'archetypes/', 'events/', 'timelines/', 'decks/'].flatMap(prefix => main.filter(url => new URL(url).pathname.startsWith('/' + prefix)).slice(-1))])];
  for (let offset = 0; offset < samples.length; offset += 4) await Promise.all(samples.slice(offset, offset + 4).map(async url => {
    const response = await get(url);
    assertIndexableHtml(await response.text(), url, response.headers);
  }));
  if (allStatuses) {
    const remaining = [...new Set([...main, ...community])].filter(url => !samples.includes(url));
    for (let offset = 0; offset < remaining.length; offset += 12) await Promise.all(remaining.slice(offset, offset + 12).map(async url => {
      const response = await fetchImpl(new URL(new URL(url).pathname, origin), { method: 'HEAD', signal: AbortSignal.timeout(30000), cache: 'no-store' });
      assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
      assert.ok(!/noindex|none/i.test(response.headers.get('x-robots-tag') ?? ''), `Blocked by response header: ${url}`);
      if (response.url) assert.equal(new URL(response.url).pathname, new URL(url).pathname, `Unexpected redirect: ${url}`);
    }));
    console.log(`Live HTTP/indexing headers verified for all ${new Set([...main, ...community]).size} sitemap URLs`);
  }
  console.log(`Live indexing smoke passed: ${main.length} main URLs, ${community.length} community decks, ${samples.length} checked documents`);
  return { main: main.length, community: community.length, checked: samples.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--live')) await smokeIndexing({ allStatuses: process.argv.includes('--all') });
  else await checkBuiltIndexing();
}
