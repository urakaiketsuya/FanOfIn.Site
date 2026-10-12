import { env } from 'cloudflare:workers';
import { beforeEach, expect, test } from 'vitest';
import { catalogFeed } from '../src/catalog';
import { buildCatalogSnapshot } from '../../pipeline/src/public-api/catalogSnapshot';
const db = (env as unknown as { PUBLIC_DB: D1Database }).PUBLIC_DB;
const token = 'private-test-token-'.repeat(3);
const snapshot = buildCatalogSnapshot({ generatedAt: '2026-10-10T00:00:00Z', cards: [{ uuid: 'card', name: 'Card', slug: 'card', editions: [{ uuid: 'edition', collector_number: '001', set: { id: 'set', name: 'Set', prefix: 'SET', language: 'EN' } }] }] });
function request(path = '/v1/catalog/meta', headers: Record<string,string> = { Authorization: `Bearer ${token}` }, method = 'GET', secret: string | undefined = token) {
  return catalogFeed(new Request('https://example.com' + path, { headers, method }), { PUBLIC_DB: db, TRADEBINDER_CATALOG_TOKEN: secret });
}
beforeEach(async () => {
  await db.batch(['DELETE FROM catalog_active', 'DELETE FROM catalog_chunks', 'DELETE FROM catalog_snapshots'].map(sql => db.prepare(sql)));
  await db.exec(snapshot.initialize);
  for (const sql of snapshot.writes) await db.exec(sql);
  await db.exec(snapshot.activate);
});
test('authentication precedes conditional requests and HEAD; no CORS exposure', async () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    const response = await request('/v1/catalog/meta', { 'If-None-Match': `"${snapshot.metadata.version}"` }, method);
    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  }
  expect((await request('/v1/catalog/meta', {}, 'GET', '')).status).toBe(401);
  expect((await request('/v1/catalog/meta', { Authorization: 'Bearer wrong' })).status).toBe(401);
});
test('authenticated versioned download and conditional metadata work', async () => {
  const meta = await request(); expect(await meta.json()).toEqual(snapshot.metadata);
  expect(meta.headers.get('Cache-Control')).toBe('private, no-store');
  const unchanged = await request('/v1/catalog/meta', { Authorization: `Bearer ${token}`, 'If-None-Match': meta.headers.get('ETag')! });
  expect(unchanged.status).toBe(304);
  const download = await request('/v1/catalog/snapshots/' + snapshot.metadata.version);
  expect(download.status).toBe(200);
  expect((await download.arrayBuffer()).byteLength).toBe(snapshot.metadata.bytes);
});
test('missing or corrupt chunks fail closed', async () => {
  await db.exec('DELETE FROM catalog_chunks');
  expect((await request('/v1/catalog/snapshots/' + snapshot.metadata.version)).status).toBe(503);
});
test('incomplete publication cannot replace active snapshot; retry is idempotent', async () => {
  const other = buildCatalogSnapshot({ generatedAt: '2026-10-11T00:00:00Z', cards: [{ uuid: 'other', name: 'Other', slug: 'other', editions: [{ uuid: 'other', collector_number: '002', set: { id: 'set', name: 'Set', prefix: 'SET', language: 'EN' } }] }] });
  await db.exec(other.initialize); await db.exec(other.activate);
  expect((await (await request()).json() as any).version).toBe(snapshot.metadata.version);
  for (let retry = 0; retry < 2; retry++) {
    await db.exec(other.initialize);
    for (const sql of other.writes) await db.exec(sql);
    await db.exec(other.activate);
  }
  expect((await (await request()).json() as any).version).toBe(other.metadata.version);
  expect((await request('/v1/catalog/snapshots/' + snapshot.metadata.version)).status).toBe(200);
});
