import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import type { AuthUser, Env } from "../src/auth";
import { discoverDecks, discoverProfiles } from "../src/discovery";
import { getPublicDeck } from "../src/decks";
import { copyPublishedDeck, listBookmarks, setDeckBookmark } from "../src/deck-social";

test("starter seeds are idempotent, labeled, ranked after users, and safely retired", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const migrations = new URL("../migrations/", import.meta.url);
    for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, migrations), "utf8"));
    const seed = readFileSync(new URL("../seeds/starter-library.sql", import.meta.url), "utf8");
    db.exec(seed); db.exec(seed);
    assert.equal(db.prepare("SELECT count(*) AS n FROM user_decks WHERE is_seed = 1").get()!.n, 60);
    assert.equal(db.prepare("SELECT count(DISTINCT identity_hash) AS n FROM saved_decks").get()!.n, 60);
    assert.equal(db.prepare("SELECT count(*) AS n FROM auth_identities").get()!.n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM starter_library_sources").get()!.n, 60);
    const env = { ACCOUNT_DB: { prepare(sql: string) {
      const statement = db.prepare(sql);
      let args: any[] = [];
      const wrapper = {
        bind(...values: any[]) { args = values; return wrapper; },
        async first() { return statement.get(...args) ?? null; },
        async all() { return { results: statement.all(...args) }; },
        async run() { return statement.run(...args); },
      };
      return wrapper;
    } } } as unknown as Env;
    const page = await discoverDecks(env, new URLSearchParams());
    assert.equal(page.decks.length, 24);
    assert.equal(page.nextPage, 2);
    assert.ok(page.decks.every((d) => d.isSeed && d.likeCount === 0));
    const publicDeck = (await getPublicDeck(env, page.decks[0].publicSlug))!;
    assert.equal(publicDeck.isSeed, true);
    assert.ok(!JSON.stringify(publicDeck).includes("sourceUrl"));
    assert.deepEqual(await discoverProfiles(env, new URLSearchParams({ q: "Fan of Insight" })), { profiles: [] });
    db.exec("INSERT INTO users (id, google_subject, email, display_name, profile_slug, created_at, updated_at) VALUES ('real-user', 'real-user', 'test@example.invalid', 'Test player', '111111111111111111111111', 'now', 'now')");
    const user = { id: "real-user" } as AuthUser;
    const copied = await copyPublishedDeck(env, user, publicDeck.publicSlug);
    assert.equal(copied.created, true);
    assert.equal((await copyPublishedDeck(env, user, publicDeck.publicSlug)).created, false);
    const copy = db.prepare("SELECT is_seed, public_slug FROM user_decks WHERE id = ?").get(copied.id)!;
    assert.equal(copy.is_seed, 0);
    assert.equal((await discoverDecks(env, new URLSearchParams())).decks[0].publicSlug, copy.public_slug);
    await setDeckBookmark(env, user, publicDeck.publicSlug, true);
    assert.equal((await listBookmarks(env, user))[0].isSeed, true);
    db.exec("UPDATE user_decks SET seed_discoverable = 0 WHERE is_seed = 1");
    const retired = await discoverDecks(env, new URLSearchParams());
    assert.equal(retired.decks.length, 1);
    assert.equal(retired.nextPage, null);
    assert.ok(await getPublicDeck(env, publicDeck.publicSlug));
    assert.ok(await getPublicDeck(env, String(copy.public_slug)));
    assert.equal((await listBookmarks(env, user)).length, 1);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally { db.close(); }
});
