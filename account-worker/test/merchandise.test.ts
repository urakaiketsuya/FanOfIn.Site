import assert from "node:assert/strict";
import test from "node:test";
import { merchandiseItems, merchandiseProgress, parseMerchandiseQuantities } from "@gatcg/shared";
import { databaseFixture } from "./helpers/database";
import { listMerchandise, saveMerchandise } from "../src/merchandise";
import { serviceHealth } from "../src/health";
import type { AuthUser } from "../src/auth";
const id = merchandiseItems[0].id;
const other = merchandiseItems[1].id;
function fixture() {
  const f = databaseFixture();
  f.db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@test','A','now','now'),('b','b','b@test','B','now','now')");
  return { ...f, user: { id: "a" } as AuthUser };
}
const input = { expectedUserId: "a", expectedRevision: 0, requestId: "request-one-000000", quantities: { [id]: 2, [other]: 1 } };
test("atomic resource, duplicate retries, account isolation and conflicting creation", async () => {
  const f = fixture();
  try {
    assert.deepEqual(await listMerchandise(f.env, f.user), { userId: "a", revision: 0, quantities: {} });
    const [a, b] = await Promise.all([saveMerchandise(f.env, f.user, input), saveMerchandise(f.env, f.user, input)]);
    assert.deepEqual(a, b); assert.equal(a.revision, 1);
    await assert.rejects(saveMerchandise(f.env, f.user, { ...input, requestId: "different-request-000" }), /changed elsewhere/);
    await assert.rejects(saveMerchandise(f.env, f.user, { ...input, quantities: { [id]: 3 } }), /changed elsewhere/);
    await assert.rejects(saveMerchandise(f.env, { id: "b" } as AuthUser, input), /Account changed/);
    assert.deepEqual((await listMerchandise(f.env, { id: "b" } as AuthUser)).quantities, {});
    const next = { ...input, expectedRevision: 1, requestId: "second-request-0000", quantities: { [id]: 0 } };
    const updated = await saveMerchandise(f.env, f.user, next);
    assert.equal(updated.revision, 2); assert.deepEqual(updated.quantities, {});
    await assert.rejects(saveMerchandise(f.env, f.user, input), /changed elsewhere/);
    assert.deepEqual(await saveMerchandise(f.env, f.user, next), updated);
    f.db.exec("DELETE FROM users WHERE id='a'");
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM merchandise_collections").get()!.n, 0);
  } finally { f.db.close(); }
});
test("failed insert and update leave no partial quantities; retry succeeds", async () => {
  const f = fixture();
  try {
    f.db.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON merchandise_collections BEGIN SELECT RAISE(ABORT,'injected failure'); END");
    await assert.rejects(saveMerchandise(f.env, f.user, input), /injected failure/);
    assert.equal((await listMerchandise(f.env, f.user)).revision, 0);
    f.db.exec("DROP TRIGGER fail_insert");
    const before = await saveMerchandise(f.env, f.user, input);
    const next = { ...input, expectedRevision: 1, requestId: "next-request-00000", quantities: { [id]: 10 } };
    f.db.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON merchandise_collections BEGIN SELECT RAISE(ABORT,'injected failure'); END");
    await assert.rejects(saveMerchandise(f.env, f.user, next), /injected failure/);
    assert.deepEqual(await listMerchandise(f.env, f.user), before);
    f.db.exec("DROP TRIGGER fail_update");
    assert.equal((await saveMerchandise(f.env, f.user, next)).quantities[id], 10);
  } finally { f.db.close(); }
});
test("invalid catalog IDs and quantities never mutate; progress counts distinct items", async () => {
  const f = fixture();
  try {
    for (const quantities of [null, [], { unknown: 1 }, { [id]: -1 }, { [id]: 1.5 }, { [id]: 1000 }, { [id]: "2" }]) {
      assert.throws(() => parseMerchandiseQuantities(quantities), /Invalid/);
      await assert.rejects(saveMerchandise(f.env, f.user, { ...input, quantities }), /Invalid/);
    }
    assert.equal((await listMerchandise(f.env, f.user)).revision, 0);
    assert.equal(new Set(merchandiseItems.map(item => item.id)).size, 56);
    assert.deepEqual(merchandiseProgress([id, id, other, "unknown"], { [id]: 4 }), { owned: 1, total: 2 });
    assert.equal((await serviceHealth(f.env)).success, true);
    f.db.exec("DROP TABLE merchandise_collections");
    assert.equal((await serviceHealth(f.env)).success, false);
  } finally { f.db.close(); }
});
