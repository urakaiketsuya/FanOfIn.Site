import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { computeCombatAccessForecast, computeForeseForecast, type Card } from "@gatcg/shared";
import { allenResonators } from "./fixtures/allenResonators";
const catalog = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards as Card[];
const cards = new Map(catalog.map(c => [c.name,c]));
test("Allen access forecast includes anthem power and one Forese deployment", () => {
 const r = computeCombatAccessForecast(allenResonators.main,allenResonators.material,cards,10);
 assert.ok(r.boostedPower > r.printedPower);
 assert.ok(r.foreseAddedPower > 0);
 assert.ok(r.sources.some(s => s.name === "Fanclub Leader"));
 assert.ok(Math.abs(r.foreseDeploymentChance-computeForeseForecast(allenResonators.main,cards,10).deploymentChance)<0.05);
 assert.deepEqual(r,computeCombatAccessForecast(allenResonators.main,allenResonators.material,cards,10));
});
test("no access means no attack power; missing catalog fails visibly", () => {
 const r = computeCombatAccessForecast(allenResonators.main,allenResonators.material,cards,0,32);
 assert.equal(r.boostedPower,0);
 assert.equal(r.foreseAddedPower,0);
 assert.ok(computeCombatAccessForecast(allenResonators.main,[],new Map(),10).unavailable);
});
test("Forese puts one undrawn ally onto the field, not all copies", () => {
 const main=[{name:"Forese, Fervid Cantor",quantity:4},{name:"Steady Verse",quantity:4},{name:"Fanclub Leader",quantity:52}];
 const r=computeCombatAccessForecast(main,[],cards,7,256);
 assert.ok(r.foreseDeploymentChance <= 1);
 assert.ok(r.foreseAddedPower > 0);
});

test("rested Forese cannot attack or absorb a targeted combat boost", () => {
 const r=computeCombatAccessForecast([{name:"Forese, Fervid Cantor",quantity:4},{name:"Attune with the Winds",quantity:1},{name:"Fanclub Leader",quantity:1},{name:"Wuthering Sforzando",quantity:1}],[],cards,60,1);
 // Leader: printed 1 + two song triggers + one Attune counter + Sforzando 6.
 assert.equal(r.printedPower,1);
 assert.equal(r.boostedPower,10);
 assert.equal(r.foreseDeploymentChance,0);
});

test("Musicbox adds one paid replay without another Forese deployment", () => {
 const main = [{name:"Fanclub Leader",quantity:1},{name:"Breath's Coloratura",quantity:1},{name:"Forese, Fervid Cantor",quantity:1}];
 const material = [{name:"Clockwork Musicbox",quantity:1},{name:"Allen, Beast Beckoner",quantity:1}];
 const baseline = computeCombatAccessForecast(main,material,cards,60,1);
 const replay = computeCombatAccessForecast(main,material,cards,60,1,{ready:true,reserve:10});
 assert.equal(baseline.musicboxAddedPower,0);
 assert.equal(replay.musicboxAddedPower,2); // Leader activation and Coloratura counter.
 assert.equal(replay.boostedPower,baseline.boostedPower+2);
 assert.equal(replay.foreseDeploymentChance,baseline.foreseDeploymentChance);
 assert.equal(computeCombatAccessForecast(main,material,cards,60,1,{ready:false,reserve:10}).boostedPower,baseline.boostedPower);
});

test("Musicbox chooses one best replay and does not repeat Enthusiast's initial counter", () => {
 const main = [{name:"Fanclub Leader",quantity:1},{name:"Performance Enthusiast",quantity:1},{name:"Breath's Coloratura",quantity:1},{name:"Wuthering Sforzando",quantity:1}];
 const material = [{name:"Clockwork Musicbox",quantity:1},{name:"Allen, Beast Beckoner",quantity:1}];
 const replay = computeCombatAccessForecast(main,material,cards,60,1,{ready:true,reserve:10});
 assert.equal(replay.musicboxAddedPower,8); // Sforzando +6 and Leader +1 per Resonator.
 assert.equal(replay.sources.find(s=>s.name === "Performance Enthusiast")?.addedPower,1);
});

test('Slime ranges include supported effects without changing the printed baseline', () => {
 const main = [{ name: 'Limitless Slime', quantity: 4 }, { name: 'Slimeshield', quantity: 3 }];
 const material = [{ name: 'Silvie, Slime Sovereign', quantity: 1 }];
 const full = computeCombatAccessForecast(main, material, cards, 60, 1);
 assert.deepEqual(full.printedRange, { low: 4, median: 4, high: 4 });
 assert.deepEqual(full.boostedRange, { low: 15, median: 15, high: 15 });
 const none = computeCombatAccessForecast(main, material, cards, 0, 32);
 assert.deepEqual(none.boostedRange, { low: 0, median: 0, high: 0 });
 const sampled = computeCombatAccessForecast(main, material, cards, 10);
 assert.ok(sampled.printedRange.low <= sampled.printedRange.median && sampled.printedRange.median <= sampled.printedRange.high);
 assert.ok(sampled.boostedPower > sampled.printedPower);
 assert.ok(!sampled.unmodeled.includes('Limitless Slime'));
});
