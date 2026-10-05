import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { taxonomyScenario } from "./fixtures/taxonomyScenario.js";
import { computeArchetypeTaxonomy } from "./archetypeTaxonomy.js";

test("taxonomy stages preserve complete pre-refactor output and ignore sideboards", () => {
  const expected = JSON.parse(readFileSync(new URL("./fixtures/taxonomyExpected.json", import.meta.url), "utf8"));
  const f = taxonomyScenario();
  const { generatedAt, reviewedRelationships, ...actual } = computeArchetypeTaxonomy(f.bundles, f.ctx, f.sightings, f.prices);
  assert.ok(generatedAt);
  assert.equal(reviewedRelationships?.length, 6);
  assert.ok(reviewedRelationships?.every(r => r.families.length === 0));
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  for (const bundle of f.bundles) if (Array.isArray(bundle.decklists)) for (const entry of bundle.decklists) entry.decklist.sideboard = [];
  const { generatedAt: ignored, reviewedRelationships: withoutSideboardRelationships, ...withoutSideboards } = computeArchetypeTaxonomy(f.bundles, f.ctx, f.sightings, f.prices);
  assert.deepEqual(JSON.parse(JSON.stringify(withoutSideboards)), expected);
  assert.deepEqual(withoutSideboardRelationships, reviewedRelationships);
});
