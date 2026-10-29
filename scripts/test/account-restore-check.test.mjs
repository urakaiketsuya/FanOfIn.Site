import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { restoreChecks } from '../account-restore-check.mjs';

function fixture() {
  const db = new DatabaseSync(':memory:');
  const directory = new URL('../../account-worker/migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, directory), 'utf8'));
  return db;
}
const checks = restoreChecks();
const verify = db => checks.flatMap(sql => db.prepare(sql).all()).every(row => row.orphan_count === 0);

test('current migration schema passes all recovery checks', () => {
  const db = fixture();
  try { assert.equal(verify(db), true); } finally { db.close(); }
});
for (const table of ['profile_showcases', 'collection_progress_goals', 'merchandise_collections', 'trade_card_reservations']) {
  test(`missing ${table} fails recovery`, () => {
    const db = fixture();
    try {
      db.exec(`DROP ${table === 'trade_card_reservations' ? 'VIEW' : 'TABLE'} ${table}`);
      assert.throws(() => verify(db), /no such table/);
    } finally { db.close(); }
  });
}
test('missing current column fails recovery even with quoted identifiers', () => {
  const db = fixture();
  try {
    db.exec('ALTER TABLE merchandise_collections DROP COLUMN quantities_json');
    assert.throws(() => verify(db), /no such column/);
  } finally { db.close(); }
});
test('orphan in a newer feature fails recovery without returning private data', () => {
  const db = fixture();
  try {
    db.exec("PRAGMA foreign_keys=OFF; INSERT INTO collection_progress_goals(user_id, goal_key, goal_json) VALUES ('missing', 'test', '{}')");
    assert.equal(verify(db), false);
  } finally { db.close(); }
});
