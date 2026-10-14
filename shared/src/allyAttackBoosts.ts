import type { Card } from "./api-types.js";

export interface CombatAlly { name: string; power: number; unblockable: boolean }
export interface AttackBoostEvidence {
  name: string;
  copies: number;
  addedPower: number;
  status: "modeled" | "inactive" | "review";
  detail: string;
}
interface BoostRule {
  power: number;
  other?: boolean;
  subtypes?: string[];
  allSubtypes?: string[];
  element?: string;
  type?: string;
  classBonus?: boolean;
  level?: number;
  targets?: number;
  floatingMemory?: boolean;
  melodyTrigger?: boolean;
  selfOnce?: boolean;
}
// Explicit templates checked against data/card-catalog.json. Cost discounts do not
// impose their Class Bonus on a separate, unconditional power clause.
const RULES: Record<string, BoostRule> = {
  "Fanclub Leader": { power: 1, subtypes: ["RESONATOR"], melodyTrigger: true },
  "Performance Enthusiast": { power: 1, selfOnce: true },
  "Breath's Coloratura": { power: 1, subtypes: ["HUMAN"] },
  "Banner Knight": { power: 1, other: true, classBonus: true, level: 2 },
  "Phalanx Captain": { power: 1, other: true, subtypes: ["HUMAN"] },
  "Courtside Beastkeeper": { power: 1, subtypes: ["BEAST"], classBonus: true },
  "Lumen Borealis": { power: 1, subtypes: ["ANIMAL"], classBonus: true },
  "Scholarly Nettle": { power: 1, other: true, floatingMemory: true, classBonus: true },
  "Exalted Dorumegian Throne": { power: 1 },
  "Greater Boon of Kanaloa": { power: 1, element: "WATER", level: 2 },
  "Tower of Dis": { power: 1, allSubtypes: ["DISCORP", "AUTOMATON"] },
  "Strategic Warfare": { power: 1 },
  "Aqueous Enchanting": { power: 1 },
  "Attune with the Winds": { power: 1 },
  "Command the Hunt": { power: 2 },
  "Winds of Retribution": { power: 2 },
  "Song of Nurturing": { power: 1, classBonus: true },
  "Herd of the Hearth": { power: 1, subtypes: ["ANIMAL", "BEAST"] },
  "Grim Foreboding": { power: 1, type: "PHANTASIA" },
  "Bolstering Tempest": { power: 3, subtypes: ["HUMAN"] },
  "Reinforcing Air": { power: 2, subtypes: ["HUMAN"], targets: 2 },
  "Trusty Steed": { power: 2, other: true, targets: 1 },
  "Wuthering Sforzando": { power: 6, targets: 1 },
  "Scorching Strafe": { power: 2, targets: 1 },
  "Flamebreak Chorus": { power: 2, targets: 1 },
  "Usurp the Winds": { power: 1, targets: 1 },
  "Training Session": { power: 1, targets: 1 },
  "Belted Tune": { power: 1, targets: 1 },
  "CookTech Knife": { power: 1, targets: 1 },
  "Blood Dragon's Pact": { power: 4, targets: 1 },
};

function hasBoostSignal(card: Card): boolean {
  // Reminder text alone (e.g. Retort) must not become an attacking-power buff.
  const text = (card.effect ?? "").replace(/\*?\([^)]*\)\*?/g, "").replace(/\*/g, "");
  return /\+\s*(?:\d+|LV|X)\s*\[POWER\]|put\b[^.]*\bbuff\b[^.]*counter/i.test(text);
}

/** One all-allies attack scenario. Supported sources resolve once per copy, with
 * unique persistent sources capped at one. This is not draw/turn availability. */
export function applyAllyAttackBoosts(
  attackers: CombatAlly[],
  lines: { name: string; quantity: number }[],
  cards: Map<string, Card>,
  lateArrivalIndex?: number,
): { attackers: CombatAlly[]; evidence: AttackBoostEvidence[] } {
  const boosted = attackers.map(a => ({ ...a }));
  const counts = new Map<string, number>();
  for (const line of lines) if (line.quantity > 0) counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
  const champions = [...counts.keys()].map(n => cards.get(n)).filter((c): c is Card => !!c && c.types.includes("CHAMPION"));
  const champion = champions.sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
  const melodyActivations = [...counts].reduce((sum, [name, count]) => {
    const card = cards.get(name);
    return sum + (card?.subtypes.some(s => s === "MELODY" || s === "HARMONY") ? count : 0);
  }, 0);
  const evidence: AttackBoostEvidence[] = [];
  // Auras before single-target buffs makes the allocation deterministic.
  const sources = [...counts].sort(([a], [b]) => Number(!RULES[a]?.selfOnce) - Number(!RULES[b]?.selfOnce) || Number(!!RULES[a]?.targets) - Number(!!RULES[b]?.targets) || a.localeCompare(b));
  for (const [name, quantity] of sources) {
    const card = cards.get(name);
    if (!card) continue;
    const rule = RULES[name];
    if (!rule) {
      if (hasBoostSignal(card)) evidence.push({ name, copies: quantity, addedPower: 0, status: "review", detail: "Conditional or unsupported power effect · not counted" });
      continue;
    }
    const copies = card.types.includes("UNIQUE") ? 1 : quantity;
    if ((rule.classBonus && !champion?.classes.some(c => card.classes.includes(c))) || (rule.level && (champion?.level ?? 0) < rule.level)) {
      evidence.push({ name, copies, addedPower: 0, status: "inactive", detail: "Champion class or level requirement not met" });
      continue;
    }
    let addedPower = 0;
    const power = rule.power * (rule.melodyTrigger ? melodyActivations : rule.selfOnce ? Math.min(1, melodyActivations) : 1);
    const sourceIndices = boosted.flatMap((a, i) => a.name === name ? [i] : []);
    for (let copy = 0; copy < copies; copy++) {
      const targets = boosted.map((a, i) => ({ a, i, card: cards.get(a.name) })).filter(({ i, card: target }) => {
        if (rule.selfOnce && i !== sourceIndices[copy]) return false;
        if (!target || (rule.other && i === sourceIndices[copy])) return false;
        if (rule.subtypes && !rule.subtypes.some(s => target.subtypes.includes(s))) return false;
        if (rule.allSubtypes && !rule.allSubtypes.every(s => target.subtypes.includes(s))) return false;
        if (rule.type && !target.types.includes(rule.type)) return false;
        if (rule.element && !target.elements.includes(rule.element)) return false;
        if (rule.floatingMemory && !/floating memory/i.test(target.effect ?? "")) return false;
        return true;
      }).sort((a, b) => Number(b.a.unblockable) - Number(a.a.unblockable) || a.a.power - b.a.power || a.i - b.i);
      for (const { a } of targets.slice(0, rule.targets ?? targets.length)) { const sourceMissedTrigger = sourceIndices[copy] === lateArrivalIndex;
        const applied = sourceMissedTrigger && rule.melodyTrigger ? Math.max(0, power - rule.power)
          : sourceMissedTrigger && rule.selfOnce && melodyActivations <= 1 ? 0 : power;
        a.power += applied; addedPower += applied; }
    }
    evidence.push({ name, copies, addedPower, status: addedPower ? "modeled" : "inactive", detail: addedPower ? (rule.melodyTrigger ? `${melodyActivations} Melody/Harmony activations × eligible Resonators` : rule.selfOnce ? "One buff counter per ally" : rule.targets ? `Up to ${rule.targets} eligible ${rule.targets === 1 ? "ally" : "allies"} per copy` : "Each eligible ally") : (rule.melodyTrigger || rule.selfOnce) && !melodyActivations ? "No Melody/Harmony activation in this list" : "No eligible attacking allies" });
  }
  return { attackers: boosted, evidence };
}
