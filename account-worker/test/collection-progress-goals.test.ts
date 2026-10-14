import { serviceHealth } from "../src/health";
import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture } from "./helpers/database";
import { listCollectionProgressGoals, saveCollectionProgressGoals } from "../src/collection-progress-goals";
import type { AuthUser } from "../src/auth";
function fixture() {
  const f = databaseFixture();
  f.db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@example.test','A','now','now'),('b','b','b@example.test','B','now','now')");
  return { ...f, a: { id: "a" } as AuthUser, b: { id: "b" } as AuthUser };
}
const one = { kind: "set", id: "ALC", target: "single" };
const two = { kind: "keyword", id: "Stealth", target: "playset" };
test("goal commands isolate accounts, preserve other device goals and retry without duplicates", async () => {
  const f = fixture();
  try {
    const input = { expectedUserId: "a", goals: [one], pinned: true };
    await Promise.all([saveCollectionProgressGoals(f.env, f.a, input), saveCollectionProgressGoals(f.env, f.a, { ...input, goals: [two] })]);
    await saveCollectionProgressGoals(f.env, f.a, input);
    assert.equal((await listCollectionProgressGoals(f.env, f.a)).goals.length, 2);
    assert.deepEqual((await listCollectionProgressGoals(f.env, f.b)).goals, []);
    await assert.rejects(saveCollectionProgressGoals(f.env, f.b, input), /Account changed/);
    await saveCollectionProgressGoals(f.env, f.a, { ...input, pinned: false });
    await saveCollectionProgressGoals(f.env, f.a, { ...input, pinned: false });
    assert.deepEqual((await listCollectionProgressGoals(f.env, f.a)).goals, [two]);
    f.db.exec("DELETE FROM users WHERE id = 'a'");
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM collection_progress_goals").get()!.n, 0);
  } finally { f.db.close(); }
});
test("imports roll back completely on failure and retry atomically", async () => {
  const f = fixture();
  try {
    f.db.exec("CREATE TRIGGER fail_goal BEFORE INSERT ON collection_progress_goals WHEN NEW.goal_json LIKE '%Stealth%' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    const input = { expectedUserId: "a", goals: [one, two], pinned: true };
    await assert.rejects(saveCollectionProgressGoals(f.env, f.a, input), /test failure/);
    assert.deepEqual((await listCollectionProgressGoals(f.env, f.a)).goals, []);
    f.db.exec("DROP TRIGGER fail_goal");
    await saveCollectionProgressGoals(f.env, f.a, input);
    await saveCollectionProgressGoals(f.env, f.a, input);
    assert.equal((await listCollectionProgressGoals(f.env, f.a)).goals.length, 2);
    for (const goals of [[], [null], [{ ...one, kind: "artist" }], Array(101).fill(one)]) {
      await assert.rejects(saveCollectionProgressGoals(f.env, f.a, { ...input, goals }), /Invalid collection/);
    }
    assert.equal((await listCollectionProgressGoals(f.env, f.a)).goals.length, 2);
  } finally { f.db.close(); }
});

test("health requires the goal migration", async () => {
  const f = fixture();
  try {
    assert.equal((await serviceHealth(f.env)).success, true);
    f.db.exec("DROP TABLE collection_progress_goals");
    assert.equal((await serviceHealth(f.env)).success, false);
  } finally { f.db.close(); }
});
