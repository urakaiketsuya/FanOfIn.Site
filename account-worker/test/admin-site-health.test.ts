import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseFixture } from './helpers/database';
import { adminSiteHealth } from '../src/admin-site-health';
import { metricOperation, recordOperation } from '../src/operation-metrics';

test('operation routes are allowlisted and never include private identifiers', () => {
  assert.equal(metricOperation('PATCH', '/v1/me/decks/private-id'), 'deck-save');
  assert.equal(metricOperation('POST', '/v1/me/decks/id/versions/v/restore'), 'deck-save');
  assert.equal(metricOperation('POST', '/v1/me/collection/transactions/id/undo'), 'collection');
  assert.equal(metricOperation('POST', '/v1/me/imports/preview'), 'deck-import');
  assert.equal(metricOperation('GET', '/v1/me/decks'), null);
  assert.equal(metricOperation('POST', '/v1/auth/password/login'), null);
  assert.equal(metricOperation('POST', '/v1/me/decks/id/unrecognized'), null);
});

test('site aggregates deduplicate users, exclude seeds/future activity, and tolerate unavailable sources', async () => {
  const { db, env } = databaseFixture();
  const now = new Date('2026-11-18T12:00:00.000Z');
  try {
    for (const [id, created] of [['a', '2026-11-11T12:00:00.000Z'], ['b', '2026-10-19T12:00:00.000Z'], ['c', '2026-01-01T00:00:00.000Z']]) {
      db.prepare('INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,id,id+'@test',id,created,created);
    }
    const insertDeck = db.prepare("INSERT INTO user_decks(id,owner_user_id,title,format,created_at,updated_at,is_seed) VALUES(?,?,'Deck','STANDARD',?,?,?)");
    insertDeck.run('one','a',now.toISOString(),now.toISOString(),0);
    insertDeck.run('two','a',now.toISOString(),now.toISOString(),0);
    insertDeck.run('seed','c',now.toISOString(),now.toISOString(),1);
    insertDeck.run('future','c','2026-11-19T00:00:00.000Z','2026-11-19T00:00:00.000Z',0);
    db.prepare("INSERT INTO collection_transactions(id,user_id,source,changes_json,created_at) VALUES('tx','a','manual','[]',?)").run(now.toISOString());
    db.prepare("INSERT INTO analysis_profiles(user_id,deck_fingerprint,revision,profile_json,updated_at) VALUES('b','fp',1,'{}','2026-10-19T12:00:00.000Z')").run();
    const health = await adminSiteHealth(env, now);
    assert.equal(health.active7Days, 1);
    assert.equal(health.active30Days, 2);
    assert.equal(health.newUsers7Days, 1);
    assert.equal(health.newUsers30Days, 2);
    assert.equal(health.deckCreators30Days, 1);
    assert.equal(health.features.find(f => f.key === 'decks')?.users, 1);
    assert.equal(health.features.find(f => f.key === 'collection')?.users, 1);
    assert.ok(health.freshness.every(source => source.updatedAt === null));
    assert.deepEqual(health.operations?.rows, []);

    await Promise.all([recordOperation(env,'deck-save',200,now),recordOperation(env,'deck-save',409,now),recordOperation(env,'deck-save',500,now)]);
    await recordOperation(env,'deck-save',500,new Date('2026-10-19T00:00:00Z'));
    const tracked = await adminSiteHealth(env,now);
    assert.deepEqual(JSON.parse(JSON.stringify(tracked.operations?.rows)), [{operation:'deck-save',requests:3,rejected:1,errors:1}]);
    db.exec("CREATE TRIGGER fail_metric BEFORE UPDATE ON admin_operation_metrics BEGIN SELECT RAISE(ABORT,'injected_failure'); END");
    await assert.rejects(recordOperation(env,'deck-save',500,now), /injected_failure/);
    db.exec('DROP TRIGGER fail_metric');
    await recordOperation(env,'deck-save',500,now);
    assert.equal((await adminSiteHealth(env,now)).operations?.rows[0].requests,4);
    db.exec('DROP TABLE admin_operation_metrics');
    assert.equal((await adminSiteHealth(env,now)).operations,null);
  } finally { db.close(); }
});

test('published freshness validates timestamps and does not invent dates', async (t) => {
  const { db, env } = databaseFixture();
  env.ASSET_BASE_URL = 'https://assets.example.test';
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    'prices': '2026-11-17T12:00:00Z', 'analysis-cards': 'invalid',
    'simulator-summary': '2027-01-01T00:00:00Z',
  })));
  try {
    const result = await adminSiteHealth(env, new Date('2026-11-18T12:00:00Z'));
    assert.equal(result.freshness.find(row => row.key === 'prices')?.updatedAt, '2026-11-17T12:00:00.000Z');
    assert.ok(result.freshness.filter(row => row.key !== 'prices').every(row => row.updatedAt === null));
  } finally { db.close(); }
});

test('HTTP failures are counted after authentication and counter failure does not change the response', async () => {
  const { default: worker } = await import('../src/index');
  const { db, env } = databaseFixture();
  Object.assign(env, { ALLOWED_ORIGINS:'http://localhost:5173', WRITE_RATE_LIMITER:{limit:async()=>({success:true})} });
  try {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@test','A',?,?)").run(now,now);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('token'))), byte=>byte.toString(16).padStart(2,'0')).join('');
    db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES('s','a',?,?,?,?)").run(hash,new Date(Date.now()+60000).toISOString(),now,now);
    const request = (signedIn: boolean) => worker.fetch(new Request('http://localhost/v1/me/collection', {
      method:'POST', headers:{Origin:'http://localhost:5173',...(signedIn?{Cookie:'fanofin_session=token'}:{})}, body:'{}',
    }),env);
    assert.equal((await request(false)).status,401);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_operation_metrics').get()!.n,0);
    assert.equal((await request(true)).status,400);
    assert.equal(db.prepare('SELECT rejected FROM admin_operation_metrics').get()!.rejected,1);
    db.exec('DROP TABLE admin_operation_metrics');
    assert.equal((await request(true)).status,400);
  } finally { db.close(); }
});
