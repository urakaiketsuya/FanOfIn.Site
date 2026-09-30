import assert from "node:assert/strict";
import test from "node:test";
import { containsBlockedLanguage } from "@gatcg/shared";
import { updateDeckMetadata, publishDeck, createDeckVersion } from "../src/decks";
import { createComment, editComment } from "../src/comments";
import { parseTagProposal } from "../src/card-tags";
import type { AuthUser, Env } from "../src/auth";

const user = { id: "a" } as AuthUser;
const noDatabase = {} as Env;
const blocked = { code: "blocked_language", status: 400 };

test("loose filter catches whole words, common variants, and basic obfuscation", () => {
  for (const text of ["FUCK", "fucking deck", "that's bullshit!", "Sh1t", "f.u.c.k", "ｆｕｃｋ", "sh\u200bit", "**shit**,bad", "shit/deck"]) {
    assert.equal(containsBlockedLanguage(text), true, text);
  }
  for (const text of ["Assassin", "Scunthorpe", "classical", "Dickinson", "hell", "damn", "crap", "分析", "shitake", "A **strong** opening\nUse [cards](https://example.test/cards)."]) {
    assert.equal(containsBlockedLanguage(text), false, text);
  }
});

test("metadata rejects blocked prose and tags before any database mutation", async () => {
  for (const field of ["title", "description", "primerMarkdown"]) {
    await assert.rejects(updateDeckMetadata(noDatabase, user, "deck", { [field]: "fucking deck" }), blocked);
  }
  await assert.rejects(updateDeckMetadata(noDatabase, user, "deck", { tags: ["bullshit"] }), blocked);
  await assert.rejects(createDeckVersion(noDatabase, user, "deck", {
    decklist: { main: [], material: [], sideboard: [] }, format: "STANDARD", changeNote: "shit",
  }), blocked);
});

test("new comments and edits enforce the same policy before writes", async () => {
  await assert.rejects(createComment(noDatabase, user, { kind: "community", id: "a" }, { body: "shit" }), blocked);
  await assert.rejects(editComment(noDatabase, user, "comment", { body: "shit" }), blocked);
});

test("tag proposals check both names and explanations", () => {
  const input = { id: crypto.randomUUID(), tag: "Lorraine", action: "add", reason: "Artwork depicts Lorraine.", targets: [{ cardUuid: "card", editionUuid: "edition" }] };
  for (const field of ["tag", "reason"]) assert.throws(() => parseTagProposal({ ...input, [field]: "bullshit" }), blocked);
  assert.equal(parseTagProposal(input).reason, input.reason);
});

test("publishing validates legacy text but still permits making it private", async () => {
  for (const field of ["title", "description", "primer_markdown", "tags_json"]) {
    let writes = 0;
    const row = { public_slug: "a", current_version_id: "v", title: "Deck", description: "", primer_markdown: "", tags_json: "[]", [field]: field === "tags_json" ? '["shit"]' : "shit" };
    const env = { ACCOUNT_DB: { prepare() { return { bind() { return this; }, async first() { return row; }, async run() { writes++; return {}; } }; } } } as unknown as Env;
    for (const visibility of ["public", "unlisted"]) {
      await assert.rejects(publishDeck(env, user, "deck", { visibility }), blocked);
    }
    assert.equal(writes, 0);
    await publishDeck(env, user, "deck", { visibility: "private" });
    assert.equal(writes, 1);
  }
});
