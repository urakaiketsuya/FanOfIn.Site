import type { Card } from "@gatcg/shared";
import {
  ambiguousFixedChampionDamage,
  fixedChampionDamageRange,
  hasUnquantifiedChampionDamage,
  isSymmetricChampionDamage,
  parseRecurringChampionDamage,
} from "./deckIdentity";

import { damageDistribution, type DamageGroup } from "./damageDistribution";

export interface AggressionForecastPoint {
  /** Present only when a complex joint state space requires bounded draw sampling. */
  sampleSize?: number;
  seen: number;
  expectedMin: number;
  expectedMax: number;
  /** Median printed damage available in the conservative model. */
  medianMin: number;
  /** Median printed damage available in the optimistic model. */
  medianMax: number;
  /** 10th percentile of the conservative model. Kept separately from the optimistic percentile
   * so the UI does not present two different models as one conventional confidence interval. */
  low: number;
  /** 90th percentile of the optimistic model. */
  high: number;
  chanceAtLeastFiveMin: number;
  chanceAtLeastFiveMax: number;
  chanceAtLeastTenMin: number;
  chanceAtLeastTenMax: number;
}

export interface DamageAuditEntry {
  name: string;
  quantity: number;
  section: "Main" | "Material";
  status: "modeled" | "partial" | "excluded" | "review";
  classification: string;
  reason: string;
}

export interface AggressionForecast {
  deckSize: number;
  detectedDamageCopies: number;
  fixedDamageCopies: number;
  variableDamageCopies: number;
  /** Copies whose damage scales with a subtype-sacrifice combo (e.g. Burst Asunder off Fractals) – folded into `expectedMax`/`high`/the "Max" chance columns as an optimistic estimate sized off this deck's own fodder count, never into the guaranteed `Min` side. */
  scalingDamageCopies: number;
  /** Copies with a fixed printed damage value that isn't guaranteed to reach the champion – either an ambiguous "target unit" clause (e.g. Blazing Throw) or one mode of a "Choose one" modal card (e.g. Vermilion Decree). Folded into the Max side only, same as `scalingDamageCopies`. */
  ambiguousDamageCopies: number;
  /** Copies participating in the Diao Chan phantasia package: Full Bloom, Flowerbud generators,
   * and phantasias Scepter of Awakening can animate. Their conditional output is ceiling-only
   * except Full Bloom's own four-Flowerbud On Enter sequence. */
  awakeningBloomComboCopies: number;
  /** Of `fixedDamageCopies`, how many also hit the deck's own champion (e.g. Embercrypt Burn's "each champion") – informational only, doesn't change any guaranteed value. */
  symmetricDamageCopies: number;
  /** Potential recurring rate after materialization and champion-bonus enablement; never added to draw totals. */
  recurringDamagePerTurn: number;
  /** Per-card coverage ledger used to expose likely parser gaps instead of silently omitting them. */
  audit: DamageAuditEntry[];
  points: AggressionForecastPoint[];
}

const CHECKPOINTS = [7, 10, 15, 20] as const;
const BASIC_ELEMENTS = new Set(["NORM", "FIRE", "WATER", "WIND"]);

function expected(distribution: Map<number, number>): number {
  return Array.from(distribution).reduce((sum, [damage, probability]) => sum + damage * probability, 0);
}
function quantile(distribution: Map<number, number>, target: number): number {
  let cumulative = 0;
  for (const [damage, probability] of Array.from(distribution).sort((a, b) => a[0] - b[0])) {
    cumulative += probability;
    if (cumulative + 1e-12 >= target) return damage;
  }
  return 0;
}
function chanceAtLeast(distribution: Map<number, number>, threshold: number): number {
  return Array.from(distribution).reduce((sum, [damage, probability]) => sum + (damage >= threshold ? probability : 0), 0);
}
function round(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
function opponentFlowerbudsSummoned(card: Card): number {
  const match = (card.effect ?? "").replace(/\*\*/g, "").match(/opponent[^.]*\bsummons?\s+(one|two|three|four|five|six|seven|eight|\d+)\s+Flowerbud tokens?/i);
  return match ? Number(match[1]) || NUMBER_WORDS[match[1].toLowerCase()] || 0 : 0;
}

/** Only damage-bearing blocks are checked, so a separate Class Bonus cost reduction is not a gate. */
function damageConditions(card: Card): string | null {
  const text = (card.effect ?? "").replace(/\*\*/g, "");
  const blocks = text.split(/\n\s*\n/).filter((block) => /\bdeal\b.*\bdamage\b/is.test(block));
  const conditional = blocks.some((block) => /\[[^\]]+\]|\bif\b|\bwhenever\b|\bat the beginning\b|\bon (?:death|attack|hit|kill|sacrifice)\b/i.test(block));
  return conditional || /as an additional cost[^.]*\b(?:sacrifice|discard|banish)\b/i.test(text)
    ? "Printed trigger/board conditions are not determined by draw access; ceiling only" : null;
}

export function computeAggressionForecast(
  mainLines: { name: string; quantity: number }[],
  cardsByName: Map<string, Card>,
  materialLines: { name: string; quantity: number }[] = [],
  playOrder: "first" | "second" = "first",
): AggressionForecast {
  // Merge repeated import lines so one physical copy cannot enter multiple draw categories.
  const merge = (lines: typeof mainLines) => {
    const quantities = new Map<string, number>();
    for (const line of lines) if (Number.isFinite(line.quantity) && line.quantity > 0) quantities.set(line.name, (quantities.get(line.name) ?? 0) + Math.floor(line.quantity));
    return Array.from(quantities, ([name, quantity]) => ({ name, quantity }));
  };
  const main = merge(mainLines);
  const material = merge(materialLines);
  const deckSize = Math.max(60, main.reduce((sum, line) => sum + line.quantity, 0));
  const minGroups: DamageGroup[] = [];
  const maxGroups: DamageGroup[] = [];
  const audit: DamageAuditEntry[] = [];
  let fixedDamageCopies = 0, variableDamageCopies = 0, scalingDamageCopies = 0, ambiguousDamageCopies = 0;
  let awakeningBloomComboCopies = 0, symmetricDamageCopies = 0, recurringDamagePerTurn = 0, detectedDamageCopies = 0;
  const hasChampion = (name: string) => material.some((line) => line.name.startsWith(`${name},`));
  const hasDiao = hasChampion("Diao Chan");
  const hasScepter = hasDiao && material.some((line) => line.name === "Scepter of Awakening");
  const advancedReadySeen = playOrder === "first" ? 10 : 11;
  const champions = material.flatMap((line) => {
    const card = cardsByName.get(line.name);
    return card?.types.includes("CHAMPION") ? [card] : [];
  });
  const classes = new Set(champions.flatMap((card) => card.classes ?? []));
  const levels = new Set(champions.flatMap((card) => typeof card.level === "number" ? [card.level] : []));
  let lineageLevel = 0;
  while (levels.has(lineageLevel + 1)) lineageLevel++;
  const bonusAvailable = (card: Card, effect?: string) => {
    const text = (effect ?? card.effect ?? "").replace(/\*\*/g, "");
    const block = effect ?? text.split(/\n\s*\n/).find((part) => /\bdeal\b.*\bdamage\b/is.test(part)) ?? "";
    const bonuses = [...block.matchAll(/\[([^\]]+) Bonus\]/gi)].map((match) => match[1]);
    return bonuses.every((bonus) => bonus === "Class"
      ? (card.classes ?? card.subtypes).some((value) => classes.has(value))
      : bonus === "Element" || hasChampion(bonus));
  };
  const bonusReadySeen = (card: Card) => {
    const block = (card.effect ?? "").replace(/\*\*/g, "").split(/\n\s*\n/).find((part) => /\bdeal\b.*\bdamage\b/is.test(part)) ?? "";
    const bonuses = [...block.matchAll(/\[([^\]]+) Bonus\]/gi)].map((match) => match[1]).filter((bonus) => bonus !== "Element");
    let requiredLevel = Number(block.match(/\[Level (\d+)\+\]/i)?.[1] ?? 0);
    for (const bonus of bonuses) {
      const eligible = champions.filter((champion) => bonus === "Class"
        ? (card.classes ?? card.subtypes).some((value) => champion.classes?.includes(value))
        : champion.name.startsWith(`${bonus},`));
      requiredLevel = Math.max(requiredLevel, Math.min(...eligible.map((champion) => champion.level ?? Infinity)));
    }
    if (requiredLevel > lineageLevel) return Infinity;
    return requiredLevel > 0 ? requiredLevel + (playOrder === "first" ? 7 : 8) : 0;
  };
  const witherSupply = (card: Card): number => {
    const text = (card.effect ?? "").replace(/\*\*/g, "");
    const block = text.split(/\n\s*\n/).find((part) => /put (?:a|one|two|three|four|\d+) wither counters? on target non-champion/i.test(part));
    if (!block || /\b(?:if|whenever|at the beginning)\b/i.test(block.replace(/\([^)]*\)/g, "")) || !bonusAvailable(card, block)) return 0;
    const amount = block.match(/put (a|one|two|three|four|\d+) wither/i)?.[1]?.toLowerCase();
    return amount === "a" ? 1 : Number(amount) || NUMBER_WORDS[amount ?? ""] || 0;
  };
  const materialWither = material.map((line) => ({ ...line, card: cardsByName.get(line.name) })).filter((line) => line.card && witherSupply(line.card) > 0);

  for (const line of material) {
    const card = cardsByName.get(line.name);
    if (!card) {
      audit.push({ ...line, section: "Material", status: "review", classification: "Missing card data", reason: "Card data unavailable." });
      continue;
    }
    const recurring = parseRecurringChampionDamage(card);
    if (recurring !== null) {
      const available = bonusAvailable(card);
      const active = available;
      if (active) recurringDamagePerTurn += recurring * line.quantity;
      audit.push({ ...line, section: "Material", status: "partial", classification: "Recurring potential", reason: active ? `${recurring} per turn once materialized with its bonus active; separate from draw totals` : "Required champion/class bonus is absent from Material" });
    } else if (line.name === "Scepter of Awakening" && hasScepter) {
      audit.push({ ...line, section: "Material", status: "partial", classification: "Scepter attack", reason: "Ceiling requires four drawn phantasias; one eligible attack including its buff counter, subject to payment and attack readiness" });
    } else if (witherSupply(card) > 0) {
      audit.push({ ...line, section: "Material", status: "partial", classification: "Wither support", reason: `${witherSupply(card)} counters after materialization, with a legal opposing target; shared once` });
    } else if (/\bdamage\b/i.test(card.effect ?? "")) {
      audit.push({ ...line, section: "Material", status: "review", classification: "Unmodeled damage text", reason: "Material ability needs a supported activation scenario." });
    }
  }

  for (const line of main) {
    const card = cardsByName.get(line.name);
    if (!card) {
      audit.push({ ...line, section: "Main", status: "review", classification: "Missing card data", reason: "Card data unavailable." });
      continue;
    }
    const unlockSeen = (card.elements ?? []).some((element) => !BASIC_ELEMENTS.has(element)) ? advancedReadySeen : 0;
    const low: DamageGroup = { copies: line.quantity, damage: 0, unlockSeen };
    const high: DamageGroup = { ...low };
    let reason = "", status: DamageAuditEntry["status"] = "modeled", classification = "Included";
    const formulas = ["Fireball", "Essence of Blizzards", "Refracting Missile", "Shimmering Refraction", "Glowering Conflagration", "Decaying Reproach", "Burst Asunder", "Potion Infusion: Volatility"];
    if (formulas.includes(line.name)) {
      variableDamageCopies += line.quantity;
      switch (line.name) {
        case "Fireball": high.damage = 1; high.levelDamage = 1; reason = "1 + natural champion-level ceiling from the Material lineage at this checkpoint"; break;
        case "Essence of Blizzards":
          high.damage = 1; high.levelDamage = 1;
          status = "partial";
          reason = "1 base damage; 1 + Material-lineage level ceiling if the target is rested (opponent state unknown)";
          break;
        case "Refracting Missile": high.damage = 1; high.missile = 1; reason = "1 + Fractal objects in the same draw; objects assumed deployed for the ceiling"; break;
        case "Shimmering Refraction": high.refraction = 1; reason = "Phantasia objects in the same draw; objects assumed deployed for the ceiling"; break;
        case "Glowering Conflagration": low.damage = high.damage = 1; high.refraction = 1; reason = "1 + Phantasia objects in the same draw; objects assumed deployed for the ceiling"; break;
        case "Decaying Reproach": high.damage = 3; high.reproach = 4; status = "partial"; reason = "3 + twice counters from supported wither sources in the same draw and Material; at most 4 per copy, each counter spent once; opposing target required"; break;
        case "Burst Asunder":
          high.damage = 2; high.burst = 2;
          scalingDamageCopies += line.quantity; variableDamageCopies -= line.quantity;
          reason = "2 per copy + 2 per Fractal object in the same draw; each Fractal sacrificed once";
          break;
        case "Potion Infusion: Volatility": high.volatility = 1; reason = "5–10 per paired drawn Potion with a sacrifice ability that does not require resting; each Potion used once"; break;
      }
    } else if (line.name === "Full Bloom") {
      awakeningBloomComboCopies += line.quantity;
      if (hasDiao) {
        low.bloom = high.bloom = 1;
        low.unlockSeen = high.unlockSeen = advancedReadySeen;
        reason = "8 from four Flowerbuds; one active Full Bloom";
      } else {
        status = "partial"; reason = "Requires Diao Chan in Material";
      }
    } else {
      const range = fixedChampionDamageRange(card);
      const ambiguous = ambiguousFixedChampionDamage(card);
      const conditions = damageConditions(card);
      const available = bonusAvailable(card);
      if (range || ambiguous !== null) {
        if (range) {
          fixedDamageCopies += line.quantity;
          low.damage = range.min; high.damage = range.max;
          if (isSymmetricChampionDamage(card)) symmetricDamageCopies += line.quantity;
        } else {
          ambiguousDamageCopies += line.quantity;
          high.damage = ambiguous!;
        }
        reason = `${low.damage}–${high.damage} printed champion-reach damage`;
        if (conditions) {
          high.unlockSeen = Math.max(unlockSeen, bonusReadySeen(card));
          low.damage = 0;
          if (!available) high.damage = 0;
          status = "partial";
          reason += available ? `; ${conditions}` : "; required champion/class bonus absent from Material";
        }
        if (hasUnquantifiedChampionDamage(card) || /\b(?:LV|D6)\b/.test((card.effect ?? "").replace(/\*\*/g, ""))) {
          status = "partial"; reason += "; additional variable clause is not modeled";
        }
      } else if (hasUnquantifiedChampionDamage(card) || /\bdeal damage\b[^.]*\bequal to\b/i.test(card.effect ?? "")) {
        variableDamageCopies += line.quantity;
        status = "partial"; classification = "Variable damage"; reason = "Needs an additional supported game-state formula";
      }
    }

    const flowerbuds = hasDiao && line.name !== "Full Bloom" ? opponentFlowerbudsSummoned(card) : 0;
    const scepterCandidate = hasScepter && card.types.includes("PHANTASIA") && !card.types.includes("ALLY") && typeof card.cost_reserve === "number" && card.cost_reserve >= 0;
    if (flowerbuds > 0 || scepterCandidate) {
      if (line.name !== "Full Bloom") awakeningBloomComboCopies += line.quantity;
      if (flowerbuds > 0) {
        high.flowerbuds = flowerbuds;
        reason += `${reason ? "; " : ""}${flowerbuds} Flowerbuds trigger a drawn Full Bloom`;
      }
      if (scepterCandidate) {
        high.scepter = card.cost_reserve! + 1;
        reason += `${reason ? "; " : ""}Scepter candidate at ${high.scepter} power, strongest only after four phantasias are drawn`;
      }
    }
    // Sources and enablers occupy the same physical draw category: no independent-product approximation.
    if (card.types.includes("PHANTASIA")) {
      high.phantasias = 1;
      if (card.subtypes.includes("FRACTAL")) high.fractals = 1;
      if (card.types.includes("UNIQUE")) high.uniqueObject = card.name;
    }
    const clean = (card.effect ?? "").replace(/\*\*/g, "");
    const sacrificeCost = clean.split(/\n/).find((part) => /sacrifice[^:]+:/i.test(part))?.split(":")[0];
    if (card.subtypes.includes("POTION") && sacrificeCost && !/\[REST\]/i.test(sacrificeCost)) high.potions = 1;
    high.wither = witherSupply(card);
    if (reason) {
      detectedDamageCopies += line.quantity;
      if (unlockSeen > 0) reason += "; advanced element held until turn 4";
      audit.push({ ...line, section: "Main", status, classification, reason });
    } else if (/\bdamage\b/i.test(card.effect ?? "")) {
      // An ally can also have ability damage; do not hide unrecognized text behind Combat damage.
      audit.push({ ...line, section: "Main", status: "review", classification: "Unmodeled damage text", reason: "Damage text needs review; ordinary attacks use the combat forecast." });
    } else if (card.types.includes("ALLY") || typeof card.power === "number") {
      audit.push({ ...line, section: "Main", status: "excluded", classification: "Combat damage", reason: "Regular attacks belong to the separate combat forecast." });
    }
    minGroups.push(low);
    maxGroups.push(high);
  }
  const points = CHECKPOINTS.map((seen): AggressionForecastPoint => {
    const turn = Math.max(1, seen - (playOrder === "first" ? 6 : 7));
    const context = {
      // Starting Lv 0 is placed before turn one; its materialize phase is skipped.
      // https://rules.gatcg.com/general-rules/general-rules-starting-the-game
      level: Math.min(lineageLevel, Math.max(0, turn - 1)),
      materialWither: turn < 2 ? 0 : materialWither.reduce((sum, line) => {
        const advanced = line.card!.elements.some((element) => !BASIC_ELEMENTS.has(element));
        return sum + (advanced && seen < advancedReadySeen ? 0 : line.quantity * witherSupply(line.card!));
      }, 0),
      scepterAvailable: seen >= advancedReadySeen,
    };
    const min = damageDistribution(minGroups, deckSize, seen);
    const max = damageDistribution(maxGroups, deckSize, seen, context);
    return {
      seen, ...(min.sampleSize || max.sampleSize ? { sampleSize: Math.max(min.sampleSize ?? 0, max.sampleSize ?? 0) } : {}),
      expectedMin: round(expected(min)), expectedMax: round(expected(max)),
      medianMin: quantile(min, 0.5), medianMax: quantile(max, 0.5), low: quantile(min, 0.1), high: quantile(max, 0.9),
      chanceAtLeastFiveMin: round(chanceAtLeast(min, 5), 3), chanceAtLeastFiveMax: round(chanceAtLeast(max, 5), 3),
      chanceAtLeastTenMin: round(chanceAtLeast(min, 10), 3), chanceAtLeastTenMax: round(chanceAtLeast(max, 10), 3),
    };
  });
  return { deckSize, detectedDamageCopies, fixedDamageCopies, variableDamageCopies, scalingDamageCopies, ambiguousDamageCopies, awakeningBloomComboCopies, symmetricDamageCopies, recurringDamagePerTurn, audit, points };
}
