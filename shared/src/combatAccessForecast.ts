import type { Card } from "./api-types.js";
import { applyAllyAttackBoosts, type CombatAlly } from "./allyAttackBoosts.js";
import { FORESE_NAME } from "./foreseForecast.js";
import { resolveForeseEntryChain } from "./foreseEntryChain.js";
import { musicboxReplayCandidates, type MusicboxReplayState } from "./musicboxReplay.js";
type Line = { name: string; quantity: number };
export interface CombatPowerRange { low: number; median: number; high: number }
export interface CombatAccessForecast {
  printedRange: CombatPowerRange;
  boostedRange: CombatPowerRange;
  boostAccessChance: number;
  seen: number;
  printedPower: number;
  boostedPower: number;
  foreseDeploymentChance: number;
  foreseAddedPower: number;
  musicboxAddedPower: number;
  sources: { name: string; addedPower: number }[];
  unmodeled: string[];
  unavailable: boolean;
}
function toLines(names: string[]): Line[] {
  const counts = new Map<string, number>();
  for (const name of names) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, quantity]) => ({ name, quantity }));
}
/** Deterministic sampling of card access, not a turn/affordability simulator.
 * Forese's first song can put one eligible revealed ally into play. The source
 * rests and is excluded from the attack; a newly found source misses that song's
 * activation trigger. Curator/Singer may find one follow-up song. Repeat
 * Forese activations requiring a wake are omitted. Musicbox can replay one hand
 * activation when explicitly supplied with readiness and a remaining budget. */
export function computeCombatAccessForecast(main: Line[], material: Line[], cards: Map<string, Card>, cardsSeen: number, samples = 1024, musicbox?: MusicboxReplayState): CombatAccessForecast {
  const deck = main.flatMap(l => Array.from({length: Math.max(0, Math.floor(l.quantity))}, () => l.name));
  while (deck.length < 60) deck.push("");
  const seen = Math.max(0, Math.min(deck.length, Math.floor(cardsSeen)));
  const result: CombatAccessForecast = { boostAccessChance: 0, printedRange: { low: 0, median: 0, high: 0 }, boostedRange: { low: 0, median: 0, high: 0 }, seen, printedPower: 0, boostedPower: 0, foreseDeploymentChance: 0, foreseAddedPower: 0, musicboxAddedPower: 0, sources: [], unmodeled: [], unavailable: [...main, ...material].some(l => l.quantity > 0 && !cards.has(l.name)) };
  if (result.unavailable || samples < 1) return result;
  const evidence = new Map<string, number>(), unmodeled = new Set<string>();
  const printedSamples: number[] = [], boostedSamples: number[] = [];
  let seed = 0x4f1ab27;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let trial = 0; trial < samples; trial++) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const drawn = shuffled.slice(0, seen);
    const lines = [...toLines(drawn), ...material];
    const handActivations = [...drawn];
    const attackers: CombatAlly[] = [];
    const unique = new Set<string>();
    for (const line of lines) {
      const card = cards.get(line.name);
      if (!card?.types.includes("ALLY") || card.power === null) continue;
      if (card.types.includes("UNIQUE") && unique.has(card.name)) continue;
      unique.add(card.name);
      for (let i = 0; i < (card.types.includes("UNIQUE") ? 1 : line.quantity); i++) attackers.push({ name: card.name, power: card.power, unblockable: false });
    }
    const printed = attackers.reduce((sum, a) => sum + a.power, 0);
    printedSamples.push(printed);
    result.printedPower += printed;
    const forese = attackers.findIndex(a => a.name === FORESE_NAME);
    const song = drawn.some(name => cards.get(name)?.subtypes.some(s => s === "HARMONY" || s === "MELODY"));
    if (forese >= 0 && song) attackers.splice(forese, 1);
    let arrival: number | undefined;
    if (forese >= 0 && song) {
      const level = Math.max(0, ...material.map(line => cards.get(line.name)?.level ?? 0));
      const { ally: hit, song: followupSong } = resolveForeseEntryChain(shuffled.slice(seen), cards, level, unique, random);
      if (followupSong) {
        lines.push({ name: followupSong, quantity: 1 });
        if (hit === "Musical Curator") handActivations.push(followupSong);
      }
      if (hit) {
        arrival = attackers.length;
        const card = cards.get(hit)!;
        attackers.push({name: hit, power: card.power ?? 0, unblockable: false});
        lines.push({name: hit, quantity: 1});
        result.foreseDeploymentChance++;
      }
    }
    let boosted = applyAllyAttackBoosts(attackers, lines, cards, arrival);
    const totalPower = (value: typeof boosted) => value.attackers.reduce((sum, a) => sum + a.power, 0);
    const beforeReplay = totalPower(boosted);
    // Choose at most one affordable replay by its supported attack contribution.
    // Recompute from the same board so once-only counters cannot stack twice.
    for (const name of musicboxReplayCandidates(handActivations, material, cards, musicbox)) {
      const candidate = applyAllyAttackBoosts(attackers, [...lines, { name, quantity: 1 }], cards, arrival);
      if (totalPower(candidate) > totalPower(boosted)) boosted = candidate;
    }
    result.musicboxAddedPower += totalPower(boosted) - beforeReplay;
    if (arrival !== undefined) result.foreseAddedPower += boosted.attackers[arrival].power;
    if (boosted.evidence.some(item => item.status === 'modeled' && item.addedPower > 0)) result.boostAccessChance += 1 / samples;
    const power = totalPower(boosted);
    boostedSamples.push(power);
    result.boostedPower += power;
    for (const item of boosted.evidence) {
      if (item.status === "modeled") evidence.set(item.name, (evidence.get(item.name) ?? 0) + item.addedPower);
      if (item.status === "review") unmodeled.add(item.name);
    }
  }
  const range = (values: number[]): CombatPowerRange => {
    values.sort((a, b) => a - b);
    const at = (p: number) => values[Math.max(0, Math.ceil(p * values.length) - 1)] ?? 0;
    return { low: at(0.1), median: at(0.5), high: at(0.9) };
  };
  result.printedRange = range(printedSamples);
  result.boostedRange = range(boostedSamples);
  result.printedPower /= samples;
  result.boostedPower /= samples;
  result.foreseDeploymentChance /= samples;
  result.foreseAddedPower /= samples;
  result.musicboxAddedPower /= samples;
  result.sources = [...evidence].map(([name, addedPower]) => ({name, addedPower: addedPower / samples}));
  result.unmodeled = [...unmodeled].sort();
  return result;
}
