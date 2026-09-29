import assert from 'node:assert/strict';
const origin = process.env.RELEASE_URL ?? 'https://fanofin.site';
async function get(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response;
}
const html = await (await get('/')).text();
assert.ok(html.includes('id="root"'), 'SPA entry missing');
const asset = html.match(/src="([^"]+\.js)"/)?.[1];
assert.ok(asset, 'SPA JavaScript entry missing');
await get(asset);
const release = await (await get('/release.json')).json();
assert.match(release.revision, /^[a-f0-9]{40}$/);
assert.ok(Number.isFinite(Date.parse(release.builtAt)), 'Invalid build timestamp');
assert.equal(release.dirty, false, 'Release was built with uncommitted changes');
if (process.env.EXPECTED_REVISION) assert.equal(release.revision, process.env.EXPECTED_REVISION, 'Production revision differs from candidate');
const manifest = await (await get('/data/manifest.json')).json();
for (const name of ['archetype-taxonomy', 'reference-archetypes', 'curated-strategies']) {
  const artifact = await (await get(`/data/analysis/${name}.json`)).json();
  assert.equal(artifact.generatedAt, manifest[`analysis-${name}`], `Stale manifest: ${name}`);
}
const health = await fetch('https://accounts.fanofin.site/api/health', { headers: { Origin: 'https://fanofin.site' }, signal: AbortSignal.timeout(30000) });
assert.ok(health.ok, `Account health: HTTP ${health.status}`);
const payload = await health.json();
assert.equal(payload.success, true);
assert.equal(payload.schema?.ready, true);
console.log(`Release smoke checks passed: ${release.revision}`);
