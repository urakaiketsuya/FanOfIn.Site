import assert from 'node:assert/strict';
import { collectionEngagement } from '../../src/admin-collection-metrics';
import type { Env } from '../../src/auth';

export async function adminCollectionMetricsChecks(env: Env) {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const empty = await collectionEngagement(env, 0, 0, now);
  assert.equal(empty.adoptionPercent, null);
  assert.equal(empty.active7Days, 0);
  assert.equal(empty.active30Days, 0);
  assert.equal(empty.weeks.length, 8);
  assert.equal(empty.weeks[0].start, '2026-09-28');
  assert.equal(empty.weeks[7].start, '2026-11-16');
  assert.ok(empty.weeks.every(week => week.firstCollectors === 0));

  for (const id of ['old', 'seven', 'thirty', 'outside', 'future', 'undo']) {
    await env.ACCOUNT_DB.prepare(`INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at)
      VALUES (?, ?, ?, 'Metrics fixture', ?, ?)`)
      .bind('metric-' + id, 'metric-' + id, id + '@metrics.test', now.toISOString(), now.toISOString()).run();
  }
  const insert = async (id: string, user: string, created: string, undone: string | null = null) =>
    env.ACCOUNT_DB.prepare(`INSERT INTO collection_transactions(id,user_id,source,changes_json,created_at,undone_at)
      VALUES (?, ?, 'manual', '[]', ?, ?)`).bind('metric-' + id, 'metric-' + user, created, undone).run();
  await insert('old', 'old', '2026-01-01T00:00:00.000Z');
  await insert('return', 'old', '2026-11-18T11:00:00.000Z');
  await insert('duplicate', 'old', '2026-11-18T11:01:00.000Z');
  await insert('seven', 'seven', '2026-11-11T12:00:00.000Z');
  await insert('thirty', 'thirty', '2026-10-19T12:00:00.000Z');
  await insert('outside', 'outside', '2026-10-19T11:59:59.999Z');
  await insert('future', 'future', '2026-11-18T12:00:00.001Z');
  await insert('undo', 'undo', '2026-09-28T00:00:00.000Z', '2026-11-18T12:00:00.000Z');
  const result = await collectionEngagement(env, 8, 3, now);
  assert.equal(result.active7Days, 3, 'Inclusive boundary, returning user and undo; distinct accounts');
  assert.equal(result.active30Days, 4, 'Exclude before cutoff and future events');
  assert.equal(result.adoptionPercent, 37.5);
  assert.equal(result.asOf, now.toISOString());
  assert.deepEqual(result.weeks.map(week => week.firstCollectors), [1, 0, 0, 2, 0, 0, 1, 0],
    'First saves only, chronological UTC weeks, undone saves retained, zero-filled');
  await env.ACCOUNT_DB.prepare("DELETE FROM users WHERE id LIKE 'metric-%'").run();
  assert.equal((await collectionEngagement(env, 1, 0, now)).active30Days, 0, 'Deleted accounts excluded');
  console.log('Collection metrics: activity boundaries, deduplication, undo, first saves, empty weeks and adoption passed.');
}
