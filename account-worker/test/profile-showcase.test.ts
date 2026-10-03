import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import type { AuthUser, Env } from "../src/auth";
import { getShowcase, parseShowcase, saveShowcase } from "../src/profile-showcase";
import { getPublicProfile, discoverProfiles } from "../src/discovery";

test("showcase validation bounds selections and rejects duplicates", () => {
  assert.throws(() => parseShowcase({ cardIds: ["x", "x"], deckSlugs: [], revision: 0 }));
  assert.throws(() => parseShowcase({ cardIds: [], deckSlugs: ["not-a-public-slug"], revision: 0 }));
  assert.throws(() => parseShowcase({ cardIds: [], deckSlugs: [], revision: -1 }));
});
test("showcases save atomically, survive failed writes, retry safely and respect public visibility", async () => {
  const db = new DatabaseSync(":memory:");
  const originalFetch = globalThis.fetch;
  try {
    const migrations = new URL("../migrations/", import.meta.url);
    for (const name of readdirSync(migrations).filter(name => name.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(name, migrations), "utf8"));
    db.exec(readFileSync(new URL("../seeds/starter-library.sql", import.meta.url), "utf8"));
    db.exec("INSERT INTO users(id,google_subject,email,display_name,profile_slug,profile_discoverable,created_at,updated_at) VALUES('showcase','showcase','showcase@test','Showcase','aaaaaaaaaaaaaaaaaaaaaaaa',1,'now','now')");
    const user = { id: "showcase" } as AuthUser;
    const env = { ASSET_BASE_URL: "https://example.test", ACCOUNT_DB: { prepare(sql: string) {
      const statement = db.prepare(sql); let args: any[] = [];
      const wrapper = { bind(...values: any[]) { args = values; return wrapper; }, async first() { return statement.get(...args) ?? null; }, async all() { return { results: statement.all(...args) }; } };
      return wrapper;
    } } } as unknown as Env;
    globalThis.fetch = async () => Response.json({ cards: [{ uuid: "known" }] });
    const slug = String(db.prepare("SELECT public_slug FROM user_decks LIMIT 1").get()!.public_slug);
    const input = { cardIds: ["known"], deckSlugs: [slug], revision: 0 };
    const saved = await saveShowcase(env, user, input);
    assert.equal(saved.revision, 1);
    assert.equal((await discoverProfiles(env, new URLSearchParams("q=Showcase"))).profiles.length, 1);
    assert.deepEqual(await saveShowcase(env, user, input), saved);
    await assert.rejects(saveShowcase(env, user, { ...input, cardIds: [] }), /changed elsewhere/);
    await assert.rejects(saveShowcase(env, user, { ...saved, cardIds: ["unknown"] }), /published catalog/);
    db.exec("CREATE TRIGGER fail_showcase BEFORE UPDATE ON profile_showcases BEGIN SELECT RAISE(ABORT, 'injected_failure'); END");
    await assert.rejects(saveShowcase(env, user, { ...saved, cardIds: [] }), /injected_failure/);
    assert.deepEqual(await getShowcase(env, user.id), saved);
    db.exec("DROP TRIGGER fail_showcase");
    assert.equal((await getPublicProfile(env, "a".repeat(24)))!.featuredDecks!.length, 1);
    db.prepare("UPDATE user_decks SET visibility = 'private' WHERE public_slug = ?").run(slug);
    assert.equal((await getPublicProfile(env, "a".repeat(24)))!.featuredDecks!.length, 0);
    await assert.rejects(saveShowcase(env, user, { ...saved, cardIds: [] }), /no longer public/);
    assert.deepEqual(await getShowcase(env, user.id), saved);
    db.exec("UPDATE users SET profile_discoverable = 0 WHERE id = 'showcase'");
    assert.equal(await getPublicProfile(env, "a".repeat(24)), null);
  } finally { globalThis.fetch = originalFetch; db.close(); }
});
