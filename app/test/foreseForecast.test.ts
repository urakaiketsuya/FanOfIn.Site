import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { computeForeseForecast, isForeseTarget, type Card } from "@gatcg/shared";
import { allenResonators } from "./fixtures/allenResonators";
const catalog = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards as Card[];
const cards = new Map(catalog.map(c => [c.name, c]));
const line = (name: string, quantity: number) => ({name, quantity});
function choose(n: number, k: number) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n-i+1)/i; return r; }

test("Allen example: Forese hits only 14 eligible Resonators and has 22 trigger cards", () => {
 const result = computeForeseForecast(allenResonators.main, cards, 10);
 assert.equal(result.foreseCopies, 4);
 assert.equal(result.eligibleCopies, 14);
 assert.equal(result.songCopies, 22);
 assert.deepEqual(result.targets.map(t => t.name).sort(), ["Musical Curator", "Performance Enthusiast", "Fanclub Leader", "Tribute Singer"].sort());
 const exactAccess = 1 - choose(56,10)/choose(60,10) - choose(38,10)/choose(60,10) + choose(34,10)/choose(60,10);
 assert.ok(Math.abs(result.accessChance - exactAccess) < 1e-10);
 assert.ok(result.deploymentChance > 0 && result.deploymentChance < result.accessChance);
});
test("eligible means non-advanced Resonator ally with reserve cost at most three", () => {
 const target = cards.get("Fanclub Leader")!;
 assert.ok(isForeseTarget(target));
 assert.ok(!isForeseTarget({...target, cost_reserve: 4}));
 assert.ok(!isForeseTarget({...target, elements: ["WIND", "TERA"]}));
 assert.ok(!isForeseTarget({...target, types: ["ACTION"]}));
 assert.ok(!isForeseTarget({...target, subtypes: ["HUMAN"]}));
});
test("first-trigger joint probability matches an independent three-card closed form", () => {
 const result = computeForeseForecast([line("Forese, Fervid Cantor",1), line("Steady Verse",1), line("Fanclub Leader",1)],cards,2);
 assert.ok(Math.abs(result.accessChance - 1/choose(3,2)) < 1e-12);
 assert.ok(Math.abs(result.deploymentChance - 1/choose(3,2)*1) < 1e-12);
});
test("no source, no activation, no targets and exhausted decks cannot deploy", () => {
 for(const lines of [[], [line("Forese, Fervid Cantor",4)], [line("Forese, Fervid Cantor",4),line("Steady Verse",4)]]) assert.equal(computeForeseForecast(lines,cards,10).deploymentChance,0);
 assert.equal(computeForeseForecast(allenResonators.main,cards,60).deploymentChance,0);
});
test("missing catalog and overlapping future categories are unavailable rather than false confidence", () => {
 assert.ok(computeForeseForecast([line("Unknown",1)],cards,10).unavailable);
 const changed = new Map(cards); changed.set("Fanclub Leader", {...cards.get("Fanclub Leader")!,subtypes:["RESONATOR","MELODY"]});
 assert.ok(computeForeseForecast(allenResonators.main,changed,10).unavailable);
});
