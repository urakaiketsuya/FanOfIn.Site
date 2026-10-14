import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { Card } from "@gatcg/shared";
import { musicboxReplayCandidates, MUSICBOX_NAME } from "../../shared/src/musicboxReplay";
const catalog = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards as Card[];
const cards = new Map(catalog.map(c => [c.name, c]));
const material = [{ name: MUSICBOX_NAME, quantity: 1 }, { name: "Allen, Beast Beckoner", quantity: 1 }];
const song = "Breath's Coloratura";
const cost = Number(cards.get(song)!.cost.value);
test("Musicbox requires readiness and the full printed replay cost", () => {
  assert.deepEqual(musicboxReplayCandidates([song], material, cards), []);
  assert.deepEqual(musicboxReplayCandidates([song], material, cards, {ready:false,reserve:cost}), []);
  assert.deepEqual(musicboxReplayCandidates([song], material, cards, {ready:true,reserve:cost-1}), []);
  assert.deepEqual(musicboxReplayCandidates([song,song], material, cards, {ready:true,reserve:cost}), [song]);
});
test("Musicbox needs material access, matching champion class and a hand activation", () => {
  const state = {ready:true,reserve:10};
  assert.deepEqual(musicboxReplayCandidates([song], [], cards, state), []);
  assert.deepEqual(musicboxReplayCandidates([song], [{name:MUSICBOX_NAME,quantity:1}], cards, state), []);
  assert.deepEqual(musicboxReplayCandidates([], material, cards, state), []);
  assert.deepEqual(musicboxReplayCandidates(["Fanclub Leader"], material, cards, state), []);
  assert.deepEqual(musicboxReplayCandidates([song], material.map(l=>({...l,quantity:0})), cards, state), []);
});
