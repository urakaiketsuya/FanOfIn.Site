import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function smokeRelease({ origin = 'https://fanofin.site', expectedRevision, fetchImpl = fetch } = {}) {
  async function get(path) {
    const response = await fetchImpl(new URL(path, origin), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    assert.ok(response.ok, `${path}: HTTP ${response.status}`);
    return response;
  }
  const html = await (await get('/')).text();
  assert.ok(html.includes('id="root"'), 'SPA entry missing');
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset, 'SPA JavaScript entry missing');
  const assetResponse = await get(asset);
  assert.match(assetResponse.headers.get('content-type') ?? '', /(?:javascript|ecmascript)/i, 'SPA asset did not return JavaScript');
  const release = await (await get('/release.json')).json();
  assert.match(release.revision, /^[a-f0-9]{40}$/);
  assert.ok(typeof release.builtAt === 'string' && Number.isFinite(Date.parse(release.builtAt)), 'Invalid build timestamp');
  assert.equal(release.dirty, false, 'Release was built with uncommitted changes');
  if (expectedRevision) assert.equal(release.revision, expectedRevision, 'Production revision differs from candidate');
  const manifest = await (await get('/data/manifest.json')).json();
  for (const name of ['archetype-taxonomy', 'reference-archetypes', 'curated-strategies']) {
    const artifact = await (await get(`/data/analysis/${name}.json`)).json();
    assert.ok(typeof artifact.generatedAt === 'string' && Number.isFinite(Date.parse(artifact.generatedAt)), `Invalid artifact timestamp: ${name}`);
    assert.equal(artifact.generatedAt, manifest[`analysis-${name}`], `Stale manifest: ${name}`);
  }
  const health = await fetchImpl('https://accounts.fanofin.site/api/health', { headers: { Origin: 'https://fanofin.site' }, signal: AbortSignal.timeout(30000) });
  assert.ok(health.ok, `Account health: HTTP ${health.status}`);
  const payload = await health.json();
  assert.equal(payload.success, true, 'Account health unsuccessful');
  assert.equal(payload.schema?.ready, true, 'Account schema not ready');
  return release.revision;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const revision = await smokeRelease({ origin: process.env.RELEASE_URL, expectedRevision: process.env.EXPECTED_REVISION });
  console.log(`Release smoke checks passed: ${revision}`);
}
