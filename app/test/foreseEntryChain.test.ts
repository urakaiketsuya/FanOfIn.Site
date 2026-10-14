import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { Card } from "@gatcg/shared";
import { resolveForeseEntryChain } from "../../shared/src/foreseEntryChain";
const catalog = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards as Card[];
const cards = new Map(catalog.map(c => [c.name, c]));
const resolve = (deck: string[], level = 1) => resolveForeseEntryChain(deck, cards, level, new Set(), () => 0.5);
const song = "Wuthering Sforzando";
test("Curator finds a song after deployment; Forese misses leave the top", () => {
 assert.deepEqual(resolve(["Musical Curator", song]), {ally:"Musical Curator", song});
 assert.equal(resolve([song, "Musical Curator", ...Array(12).fill("")]).song, undefined);
});
test("Singer requires level 1 and only searches five", () => {
 assert.equal(resolve(["Tribute Singer", song], 0).song, undefined);
 assert.equal(resolve(["Tribute Singer", song]).song, song);
 assert.equal(resolve(["Tribute Singer", ...Array(5).fill(""), song]).song, undefined);
});
test("Forese stops after five misses or one deployment", () => {
 assert.equal(resolve([...Array(5).fill(""), "Musical Curator", song]).ally, undefined);
 assert.deepEqual(resolve(["Fanclub Leader", "Musical Curator", song]), {ally:"Fanclub Leader"});
});
test("Singer rejects advanced songs", () => {
 const advanced = catalog.find(c => c.subtypes.some(s => s === "MELODY" || s === "HARMONY") && c.elements.some(e => !["NORM","FIRE","WATER","WIND"].includes(e)));
 assert.ok(advanced);
 assert.equal(resolve(["Tribute Singer", advanced.name]).song, undefined);
});
