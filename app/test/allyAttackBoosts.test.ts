import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { applyAllyAttackBoosts, type Card } from "@gatcg/shared";
import { computeBreakthroughDamage } from "../src/lib/breakthroughDamage";
const catalog = JSON.parse(readFileSync(new URL("../../data/card-catalog.json", import.meta.url), "utf8")).cards as Card[];
const cards = new Map(catalog.map(c => [c.name, c]));
const line = (name: string, quantity = 1) => ({ name, quantity });
const ally = (name: string) => ({ name, power: cards.get(name)!.power!, unblockable: false });
const warrior = catalog.find(c => c.types.includes("CHAMPION") && c.classes.includes("WARRIOR") && c.level === 2)!;

test("Banner Knight stacks per copy, excludes itself and requires class and level", () => {
 const attackers = [ally("Banner Knight"), ally("Banner Knight"), ally("Trusty Steed")];
 const lines = [line("Banner Knight", 2), line(warrior.name)];
 const result = applyAllyAttackBoosts(attackers, lines, cards);
 assert.deepEqual(result.attackers.map(a => a.power), [2, 2, 3]);
 assert.equal(result.evidence[0].addedPower, 4);
 assert.deepEqual(attackers.map(a => a.power), [1, 1, 1]);
 assert.equal(applyAllyAttackBoosts(attackers, [line("Banner Knight", 2)], cards).evidence[0].status, "inactive");
 const wrongClass = catalog.find(c => c.types.includes("CHAMPION") && c.level === 2 && !c.classes.includes("WARRIOR"))!;
 assert.equal(applyAllyAttackBoosts(attackers, [line("Banner Knight"), line(wrongClass.name)], cards).evidence[0].status, "inactive");
});
test("Phalanx Captain buffs only other Humans without requiring its cost-discount class bonus", () => {
 const result = applyAllyAttackBoosts([ally("Phalanx Captain"), ally("Banner Knight"), ally("Trusty Steed")], [line("Phalanx Captain")], cards);
 assert.deepEqual(result.attackers.map(a => a.power), [1, 2, 1]);
});
test("single-target effects do not multiply across the board or target their own source", () => {
 const result = applyAllyAttackBoosts([ally("Trusty Steed"), ally("Banner Knight"), ally("Phalanx Captain")], [line("Trusty Steed")], cards);
 assert.equal(result.evidence[0].addedPower, 2);
 assert.equal(result.attackers[0].power, 1);
 assert.equal(applyAllyAttackBoosts([ally("Trusty Steed")], [line("Trusty Steed")], cards).evidence[0].addedPower, 0);
});
test("multi-target Human buffs respect target count and subtype", () => {
 const result = applyAllyAttackBoosts([ally("Banner Knight"), ally("Phalanx Captain"), ally("Courtside Beastkeeper"), ally("Trusty Steed")], [line("Reinforcing Air")], cards);
 assert.equal(result.evidence[0].addedPower, 4);
 assert.equal(result.attackers[3].power, 1);
});
test("unique persistent anthems apply once even with duplicate lines", () => {
 const result = applyAllyAttackBoosts([ally("Trusty Steed")], [line("Exalted Dorumegian Throne"), line("Exalted Dorumegian Throne")], cards);
 assert.equal(result.attackers[0].power, 2);
 assert.equal(result.evidence[0].copies, 1);
});
test("boosted power is intercepted afresh; printed baseline remains unchanged", () => {
 const defender = catalog.find(c => c.types.includes("ALLY") && /intercept/i.test(c.effect ?? ""))!;
 const result = computeBreakthroughDamage([line("Banner Knight", 2), line(warrior.name), line("Strategic Warfare")], [line(defender.name)], cards);
 assert.equal(result.totalAttackPower, 2);
 assert.equal(result.breakthroughTotal, 1);
 assert.equal(result.boosted!.totalAttackPower, 6);
 assert.equal(result.boosted!.breakthroughTotal, 3);
 assert.equal(result.boosted!.interceptedPower, 3);
});
test("unknown and conditional effects stay visible without inventing power", () => {
 const result = applyAllyAttackBoosts([ally("Arthur, Young Heir")], [line("Arthur, Young Heir"), line("Crystallized Anthem")], cards);
 assert.ok(result.evidence.every(e => e.status === "review"));
 assert.equal(result.evidence.length, 2);
 assert.equal(result.attackers[0].power, 2);
});
test("life-only buffs and Retort reminder text are not attacking-power sources", () => {
 const result = applyAllyAttackBoosts([], [line("Sinfonia of Hope"), line("Brash Defender")], cards);
 assert.equal(result.evidence.length, 0);
});
test("empty boards, unsupported catalog entries and zero quantities add no power", () => {
 assert.equal(applyAllyAttackBoosts([], [line("Strategic Warfare")], cards).evidence[0].addedPower, 0);
 assert.deepEqual(applyAllyAttackBoosts([], [line("Missing"), line("Strategic Warfare", 0)], cards), { attackers: [], evidence: [] });
});

test("Fanclub Leader scales each Resonator with each Melody/Harmony activation; Enthusiast caps its counter", () => {
 const attackers = [ally("Fanclub Leader"), ally("Fanclub Leader"), ally("Performance Enthusiast"), ally("Forese, Fervid Cantor")];
 const result = applyAllyAttackBoosts(attackers, [line("Fanclub Leader", 2), line("Performance Enthusiast"), line("Steady Verse", 3)], cards);
 assert.deepEqual(result.attackers.map(a => a.power), [7, 7, 8, 0]);
 assert.equal(result.evidence.find(e => e.name === "Fanclub Leader")!.addedPower, 18);
 assert.equal(result.evidence.find(e => e.name === "Performance Enthusiast")!.addedPower, 1);
});
test("Breath's Coloratura is not class-gated and affects only Humans", () => {
 const result = applyAllyAttackBoosts([ally("Fanclub Leader"), ally("Trusty Steed")], [line("Breath's Coloratura")], cards);
 assert.deepEqual(result.attackers.map(a => a.power), [2, 1]);
});

test("a Forese-deployed trigger source misses the activation that put it in play", () => {
 const leader = [ally("Fanclub Leader")];
 assert.equal(applyAllyAttackBoosts(leader,[line("Fanclub Leader"),line("Steady Verse")],cards,0).attackers[0].power,1);
 assert.equal(applyAllyAttackBoosts(leader,[line("Fanclub Leader"),line("Steady Verse",2)],cards,0).attackers[0].power,2);
 const enthusiast = [ally("Performance Enthusiast")];
 assert.equal(applyAllyAttackBoosts(enthusiast,[line("Performance Enthusiast"),line("Steady Verse")],cards,0).attackers[0].power,1);
});
