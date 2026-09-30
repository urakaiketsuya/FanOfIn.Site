import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture } from "./helpers/database";
import { parseSaveInput } from "../src/deck-input";
import { saveDeck, getDeck, listDecks, updateDeckDecklist, createDeckVersion, updateDeckMetadata } from "../src/decks";
import { getOwnedHistory, getOwnedVersion } from "../src/deck-queries";
import { serviceHealth } from "../src/health";
import type { AuthUser } from "../src/auth";
async function fixture() {
  const f = databaseFixture();
  f.db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('a','a','a@test','A','now','now'),('b','b','b@test','B','now','now')");
  const user = { id: "a" } as AuthUser;
  const input = parseSaveInput({ title: "Deck", format: "STANDARD", decklist: { main: [{ card: "First", quantity: 4 }], material: [], sideboard: [] }, source: { provider: "manual", externalDeckId: "one", label: "Manual" } });
  const { id } = await saveDeck(f.env, user, input);
  const deck = (await getDeck(f.env, user, id))!;
  const command = { decklist: { ...input.decklist, main: [{ card: "Second", quantity: 4 }] }, format: "STANDARD", maybeboard: [{ card: "Maybe", quantity: 2 }], expectedRevision: deck.revision, requestId: crypto.randomUUID() };
  return { ...f, user, input, id, deck, command };
}
for (const mode of ["update", "version"] as const) {
  test(`${mode}: atomic maybeboard save, response replay and changed-payload rejection`, async () => {
    const f = await fixture(); try {
      const save = mode === "update" ? updateDeckDecklist : createDeckVersion;
      const result = await save(f.env, f.user, f.id, f.command);
      const deck = (await getDeck(f.env, f.user, f.id))!;
      assert.deepEqual(deck.decklist, f.command.decklist);
      assert.deepEqual(deck.maybeboard, f.command.maybeboard);
      assert.equal(deck.revision, f.deck.revision + 1);
      assert.deepEqual(await save(f.env, f.user, f.id, f.command), result);
      assert.equal(deck.versions.length, mode === "update" ? 1 : 2);
      await assert.rejects(save(f.env, f.user, f.id, { ...f.command, maybeboard: [] }), /different save/);
    } finally { f.db.close(); }
  });
  for (const [table, action] of [["canonical_builds", "INSERT"], ["deck_versions", mode === "update" ? "UPDATE" : "INSERT"], ["user_decks", "UPDATE"], ["saved_decks", "UPDATE"]]) {
    test(`${mode}: rollback after ${table} failure includes receipt and canonical build`, async () => {
      const f = await fixture(); try {
        f.db.exec(`CREATE TRIGGER fail_save BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT, 'injected'); END`);
        const save = mode === "update" ? updateDeckDecklist : createDeckVersion;
        await assert.rejects(save(f.env, f.user, f.id, f.command), /injected/);
        assert.deepEqual(await getDeck(f.env, f.user, f.id), f.deck);
        assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_save_receipts").get()!.n, 0);
        assert.equal(f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n, 1);
        f.db.exec("DROP TRIGGER fail_save");
        await save(f.env, f.user, f.id, f.command);
      } finally { f.db.close(); }
    });
  }
}
test("transaction guard rejects an edit interleaved after the read and protects ownership", async () => {
  const f = await fixture(); try {
    f.beforeBatch(() => f.db.prepare("UPDATE user_decks SET title = 'Other tab' WHERE id = ?").run(f.id));
    await assert.rejects(updateDeckDecklist(f.env, f.user, f.id, f.command), /changed elsewhere/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_save_receipts").get()!.n, 0);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n, 1);
    const other = { id: "b" } as AuthUser;
    await assert.rejects(updateDeckDecklist(f.env, other, f.id, f.command), /not found/);
    await assert.rejects(getOwnedVersion(f.env, other, f.id, f.deck.currentVersionId), /not found/);
    assert.deepEqual((await getOwnedHistory(f.env, other, f.id)).versions, []);
  } finally { f.db.close(); }
});
test("simultaneous retries create one version; competing commands have one winner", async () => {
  const f = await fixture(); try {
    const results = await Promise.all([createDeckVersion(f.env, f.user, f.id, f.command), createDeckVersion(f.env, f.user, f.id, f.command)]);
    assert.deepEqual(results[0], results[1]);
    const command = { ...f.command, expectedRevision: results[0].revision, decklist: { ...f.command.decklist, sideboard: [{ card: "Side", quantity: 1 }] } };
    const competing = await Promise.allSettled([createDeckVersion(f.env, f.user, f.id, { ...command, requestId: crypto.randomUUID() }), createDeckVersion(f.env, f.user, f.id, { ...command, requestId: crypto.randomUUID() })]);
    assert.equal(competing.filter(r => r.status === "fulfilled").length, 1);
    assert.equal((await getDeck(f.env, f.user, f.id))!.versions.length, 3);
  } finally { f.db.close(); }
});
test("metadata changes invalidate stale deck saves", async () => {
  const f = await fixture(); try {
    await updateDeckMetadata(f.env, f.user, f.id, { maybeboard: [] });
    await assert.rejects(updateDeckDecklist(f.env, f.user, f.id, f.command), /changed elsewhere/);
  } finally { f.db.close(); }
});
test("bounded history omits old decklists, supports cursors and loads selected snapshots", async () => {
  const f = await fixture(); try {
    for (let n = 2; n <= 25; n++) f.db.prepare("INSERT INTO deck_versions(id,deck_id,version_number,canonical_build_id,created_at) SELECT ?, ?, ?, canonical_build_id, 'now' FROM deck_versions WHERE id = ?").run(`version${n}`, f.id, n, f.deck.currentVersionId);
    f.db.prepare("UPDATE user_decks SET current_version_id = 'version25' WHERE id = ?").run(f.id);
    const detail = (await getDeck(f.env, f.user, f.id))!;
    assert.equal(detail.versionCount, 25); assert.equal(detail.versions.length, 20);
    assert.equal(detail.versions.filter(v => v.decklist).length, 2);
    const older = await getOwnedHistory(f.env, f.user, f.id, detail.nextVersionBefore!);
    assert.equal(older.versions.length, 5); assert.equal(older.nextBefore, null);
    assert.ok((await getOwnedVersion(f.env, f.user, f.id, older.versions[0].id)).decklist);
    assert.equal((await serviceHealth(f.env)).schema.ready, true);
  } finally { f.db.close(); }
});
test("deck quota is enforced when another insert wins after preflight", async () => {
  const f = await fixture(); try {
    const fill = (count: number) => { for (let n = 0; n < count; n++) f.db.prepare("INSERT INTO saved_decks(id,user_id,identity_hash,title,format,decklist_json,created_at,updated_at) VALUES(?, 'a', ?, 'Deck', 'STANDARD', '{}', 'now', 'now')").run(`fill${n}`, `hash${n}`); };
    fill(248);
    f.beforeBatch(() => f.db.exec("INSERT INTO saved_decks(id,user_id,identity_hash,title,format,decklist_json,created_at,updated_at) VALUES('winner','a','winner','Deck','STANDARD','{}','now','now')"));
    await assert.rejects(saveDeck(f.env, f.user, { ...f.input, decklist: f.command.decklist }), /limit of 250/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM saved_decks").get()!.n, 250);
    await saveDeck(f.env, f.user, f.input); // Upserts at the quota still work.
  } finally { f.db.close(); }
});
test("source quota races roll back imports while existing source updates remain legal", async () => {
  const f = await fixture(); try {
    const add = (n: number) => f.db.prepare("INSERT INTO saved_deck_sources(id,saved_deck_id,provider,external_deck_id,label,metadata_json,sideboard_json,imported_at) VALUES(?,?,'manual',?,'Source','{}','[]','now')").run(`source${n}`, f.id, `external${n}`);
    for (let n = 0; n < 48; n++) add(n);
    f.beforeBatch(() => { add(48); });
    await assert.rejects(saveDeck(f.env, f.user, { ...f.input, source: { ...f.input.source, externalDeckId: "new" } }), /limit of 50/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM saved_deck_sources").get()!.n, 50);
    await saveDeck(f.env, f.user, f.input);
  } finally { f.db.close(); }
});
test("version cap and owned identity conflicts leave no orphan builds or receipts", async () => {
  const f = await fixture(); try {
    const other = await saveDeck(f.env, f.user, { ...f.input, decklist: f.command.decklist });
    await assert.rejects(createDeckVersion(f.env, f.user, f.id, f.command), /already exists/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_save_receipts").get()!.n, 0);
    f.db.prepare("DELETE FROM user_decks WHERE id = ?").run(other.id);
    f.db.prepare("DELETE FROM saved_decks WHERE id = ?").run(other.id);
    for (let n = 2; n <= 200; n++) f.db.prepare("INSERT INTO deck_versions(id,deck_id,version_number,canonical_build_id,created_at) SELECT ?, ?, ?, canonical_build_id, 'now' FROM deck_versions WHERE id = ?").run(`cap${n}`, f.id, n, f.deck.currentVersionId);
    const beforeBuilds = f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n;
    await assert.rejects(createDeckVersion(f.env, f.user, f.id, { ...f.command, decklist: { ...f.command.decklist, main: [{ card: "Third", quantity: 1 }] } }), /limit of 200/);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM canonical_builds").get()!.n, beforeBuilds);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM deck_save_receipts").get()!.n, 0);
  } finally { f.db.close(); }
});
test("metadata title mirrors roll back together", async () => {
  const f = await fixture(); try {
    f.db.exec("CREATE TRIGGER fail_title BEFORE UPDATE ON saved_decks BEGIN SELECT RAISE(ABORT, 'title_failure'); END");
    await assert.rejects(updateDeckMetadata(f.env, f.user, f.id, { title: "New title" }), /title_failure/);
    assert.deepEqual(await getDeck(f.env, f.user, f.id), f.deck);
  } finally { f.db.close(); }
});
test("legacy detail responses retain complete history", async () => {
  const f = await fixture(); try {
    for (let n = 2; n <= 25; n++) f.db.prepare("INSERT INTO deck_versions(id,deck_id,version_number,canonical_build_id,created_at) SELECT ?, ?, ?, canonical_build_id, 'now' FROM deck_versions WHERE id = ?").run(`legacy${n}`, f.id, n, f.deck.currentVersionId);
    const detail = (await getDeck(f.env, f.user, f.id, false))!;
    assert.equal(detail.versions.length, 25);
    assert.ok(detail.versions.every(version => version.decklist));
    assert.equal(detail.nextVersionBefore, null);
  } finally { f.db.close(); }
});

test("library and detail use the same current sideboard after an edit", async () => {
  const f = await fixture(); try {
    const decklist = { ...f.command.decklist, sideboard: [{ card: "New sideboard", quantity: 2 }] };
    await updateDeckDecklist(f.env, f.user, f.id, { ...f.command, decklist });
    assert.deepEqual((await listDecks(f.env, f.user))[0].decklist, decklist);
    assert.deepEqual(await listDecks(f.env, { id: "b" } as AuthUser), []);
  } finally { f.db.close(); }
});
