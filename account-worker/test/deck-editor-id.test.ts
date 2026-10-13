import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture } from "./helpers/database";
import { saveDeck, getDeck, getPublicDeck, publishDeck, updateDeckMetadata } from "../src/decks";
import { parseSaveInput } from "../src/deck-input";
import type { AuthUser } from "../src/auth";

test("shared IDs resolve only the owner's editor and retain legacy links and privacy", async () => {
  const { db, env } = databaseFixture();
  try {
    db.exec("INSERT INTO users(id,google_subject,email,display_name,created_at,updated_at) VALUES('owner','owner','owner@test','Owner','now','now')");
    const owner = { id: "owner" } as AuthUser;
    const input = parseSaveInput({ title: "My deck", decklist: { main: [{ card: "Card", quantity: 1 }], material: [], sideboard: [] }, source: { provider: "manual", externalDeckId: "test", label: "Manual" } });
    const saved = await saveDeck(env, owner, input);
    const legacy = (await getDeck(env, owner, saved.id))!;
    const slug = legacy.publicSlug!;
    assert.deepEqual(await getDeck(env, owner, slug), legacy);
    assert.equal(await getDeck(env, { id: "other" } as AuthUser, slug), null);
    assert.equal(await getDeck(env, owner, "f".repeat(32)), null);
    await updateDeckMetadata(env, owner, legacy.id, { title: "Updated deck" });
    assert.equal((await getDeck(env, owner, slug))!.title, "Updated deck");
    assert.equal((await getPublicDeck(env, slug))!.title, "Updated deck");
    await publishDeck(env, owner, saved.id, { visibility: "private" });
    assert.equal(await getPublicDeck(env, slug), null);
    assert.equal((await getDeck(env, owner, slug))!.id, saved.id);
    await publishDeck(env, owner, saved.id, { visibility: "unlisted" });
    assert.equal((await getPublicDeck(env, slug))!.publicSlug, slug);
  } finally { db.close(); }
});
