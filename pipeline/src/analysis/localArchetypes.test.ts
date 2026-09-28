import test from "node:test";
import assert from "node:assert/strict";
import type { ArchetypeCluster } from "@gatcg/shared";
import { emptyStore, fromBuild, needsReview, parseStore } from "../../../app/src/features/archetypes/localArchetypes.js";
const build = { id: "stable", name: "Build", namingCards: ["B", "A"], deckIds: ["1:2"] } as ArchetypeCluster;
test("local curation preserves ordered cards and detects changed or missing sources", () => {
  const entry = fromBuild(build);
  assert.deepEqual(entry.namingCards, ["B", "A"]);
  assert.equal(needsReview(entry, [build]), false);
  assert.equal(needsReview(entry, [{ ...build, deckIds: ["1:2", "2:3"] }]), true);
  assert.equal(needsReview(entry, []), true);
  const store = { ...emptyStore(), entries: [entry], drafts: [{ ...entry, name: "Draft" }] };
  assert.deepEqual(parseStore(JSON.stringify(store)), store);
});
test("invalid imports and duplicate IDs are rejected", () => {
  assert.throws(() => parseStore('{"version":2}'));
  assert.throws(() => parseStore(JSON.stringify({ ...emptyStore(), entries: [fromBuild(build), fromBuild(build)] })));
  assert.throws(() => parseStore(JSON.stringify({ ...emptyStore(), drafts: [{}] })));
});
