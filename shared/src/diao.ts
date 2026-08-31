import type { Card } from "./api-types.js";

export interface DiaoCard extends Pick<Card, "name" | "classes" | "types" | "effect"> {
  subtypes?: string[];
  cost_memory?: number | null;
  power?: number | null;
}

export type RatingPillar = "durability" | "interaction" | "aggro" | "opportunity";
export const DIAO_MODEL_VERSION = 2;

export interface NamedCardLine {
  name: string;
  quantity: number;
}

export interface DeckRatingSignals {
  avgNonChampionCost: number;
  avgAllyPower: number;
  evasion: number;
  championDamageFloor: number;
  allyDamageFloor: number;
  repeatableDraw: number;
  oneShotDraw: number;
  variableDraw: number;
  floatingMemory: number;
  banish: number;
  destroy: number;
  negate: number;
  fastSpeed: number;
  recover: number;
  variableRecover: number;
  protection: number;
  threats: number;
}

export interface DeckRating {
  signals: DeckRatingSignals;
  points: Record<RatingPillar, number>;
  scores: Record<RatingPillar, number>;
  composite: number;
}

export const DIAO_SCORE_BANDS: Record<RatingPillar, readonly number[]> = {
  aggro: [3, 5.0837, 8.2368, 10.9, 17.8078, 21.7667, 35.1167],
  opportunity: [5, 15, 19, 30, 35, 38, 43],
  interaction: [4.2, 7.6, 10.5, 18, 23.6, 25.9, 37.3],
  durability: [0, 3.5, 5, 7.2, 9.4, 11, 16],
};

const FLOATING_MEMORY_RE = /(\[([^\]]+)\]\s*)?\*\*Floating Memory\*\*/g;
const DEAL_DAMAGE_RE = /Deal (\d+(?:\+X)?|X) damage\s*([^.]*)/gi;
const SELF_CHAMPION_RE = /\b(your|own) champion\b/g;
const REPEATABLE_DRAW_RE = /whenever[^.]*\bdraw (?:a|one|1) card|\[REST\][^.]*\bdraw (?:a|one|1) card|at the (?:beginning|start) of [^.]*\bdraw (?:a|one|1) card/i;
const FIXED_DRAW_RE = /\bdraw\s+(?:a|one|two|three|four|five|six|seven|\d+)\s+cards?\b/i;
const VARIABLE_DRAW_RE = /\bdraw\s+(?:\d+\s*\+\s*)?(?:\*\*)?x(?:\*\*)?\s+cards?\b|\bdraw that many cards?\b/i;
const FIXED_RECOVER_RE = /\brecover (\d+)\b(?!\s*\+)/i;
const VARIABLE_RECOVER_RE = /\brecover (?:\d+\s*\+\s*)?(?:\*\*)?x(?:\*\*)?\b/i;

function isLineageOpeningDraw(card: DiaoCard): boolean {
  return card.types.includes("CHAMPION") && /\bon enter\b[^.]*\bdraw (?:six|seven|6|7) cards?\b/i.test((card.effect ?? "").replace(/\*\*/g, ""));
}

function hasNegateActivation(rawEffect: string): boolean {
  return /\*\*negate\*\*/i.test(rawEffect) || /\*\*[^*\n]{0,40}\bnegate\b[^*\n]{0,40}\*\*[^.\n]{0,80}\bactivation\b/i.test(rawEffect);
}

function floatingMemory(lines: NamedCardLine[], cards: Map<string, DiaoCard>, championName: string | null, championClasses: string[]): number {
  let total = 0;
  for (const line of lines) {
    const effect = cards.get(line.name)?.effect;
    if (!effect) continue;
    FLOATING_MEMORY_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FLOATING_MEMORY_RE.exec(effect)) !== null) {
      const condition = match[2];
      if (!condition) total += line.quantity;
      else if (condition === "Class Bonus" && cards.get(line.name)!.classes.some((c) => championClasses.includes(c))) total += line.quantity;
      else if (condition.endsWith(" Bonus") && condition.slice(0, -" Bonus".length) === championName) total += line.quantity;
    }
  }
  return total;
}

function damageFloors(lines: NamedCardLine[], cards: Map<string, DiaoCard>): { champion: number; ally: number } {
  let champion = 0;
  let ally = 0;
  for (const line of lines) {
    const effect = cards.get(line.name)?.effect?.replace(/\*\*/g, "");
    if (!effect) continue;
    DEAL_DAMAGE_RE.lastIndex = 0;
    const values: Record<"champion" | "ally", number[]> = { champion: [], ally: [] };
    let match: RegExpExecArray | null;
    while ((match = DEAL_DAMAGE_RE.exec(effect)) !== null) {
      if (match[1].toUpperCase() === "X" || match[1].includes("+")) continue;
      const target = match[2].toLowerCase();
      const scan = target.replace(SELF_CHAMPION_RE, "");
      SELF_CHAMPION_RE.lastIndex = 0;
      const candidates = [
        { kind: "champion" as const, index: scan.indexOf("champion") },
        { kind: "ally" as const, index: scan.indexOf("ally") },
        { kind: "ally" as const, index: scan.indexOf("allies") },
        { kind: null, index: scan.indexOf("unit") },
      ].filter((candidate) => candidate.index >= 0).sort((a, b) => a.index - b.index);
      const kind = candidates[0]?.kind;
      if (kind) values[kind].push(Number(match[1]));
    }
    if (values.champion.length) champion += Math.max(...values.champion) * line.quantity;
    if (values.ally.length) ally += Math.max(...values.ally) * line.quantity;
  }
  return { champion, ally };
}

export function scoreDiaoPoints(points: Record<RatingPillar, number>): Record<RatingPillar, number> {
  const toScore = (value: number, boundaries: readonly number[]): number => {
    for (let i = 0; i < boundaries.length; i++) {
      if ((i === 0 && value <= boundaries[i]) || value < boundaries[i]) return Math.max(1, i + 3);
    }
    return 10;
  };
  return {
    aggro: toScore(points.aggro, DIAO_SCORE_BANDS.aggro),
    opportunity: toScore(points.opportunity, DIAO_SCORE_BANDS.opportunity),
    interaction: toScore(points.interaction, DIAO_SCORE_BANDS.interaction),
    durability: toScore(points.durability, DIAO_SCORE_BANDS.durability),
  };
}

export function computeDeckRating(lines: NamedCardLine[], cards: Map<string, DiaoCard>, championName: string | null, championClasses: string[]): DeckRating {
  const damage = damageFloors(lines, cards);
  const signals: DeckRatingSignals = {
    avgNonChampionCost: 0, avgAllyPower: 0, evasion: 0,
    championDamageFloor: damage.champion, allyDamageFloor: damage.ally,
    repeatableDraw: 0, oneShotDraw: 0, variableDraw: 0, floatingMemory: floatingMemory(lines, cards, championName, championClasses),
    banish: 0, destroy: 0, negate: 0, fastSpeed: 0, recover: 0, variableRecover: 0, protection: 0, threats: 0,
  };
  let costSum = 0;
  let costN = 0;
  let allyPower = 0;
  let allyN = 0;
  for (const line of lines) {
    const card = cards.get(line.name);
    if (!card) continue;
    const isChampion = card.types.includes("CHAMPION");
    const isAlly = card.types.includes("ALLY");
    const effect = (card.effect ?? "").replace(/\*\*/g, "");
    if (!isChampion && card.cost_memory != null && card.cost_memory >= 0) { costSum += card.cost_memory * line.quantity; costN += line.quantity; }
    if (isAlly && card.power != null) { allyPower += card.power * line.quantity; allyN += line.quantity; }
    if (/unblockable/i.test(effect)) signals.evasion += 3 * line.quantity;
    if (/ranged \d/i.test(effect)) signals.evasion += line.quantity;
    if (!isLineageOpeningDraw(card)) {
      if (REPEATABLE_DRAW_RE.test(effect)) signals.repeatableDraw += line.quantity;
      else if (VARIABLE_DRAW_RE.test(effect)) { signals.oneShotDraw += line.quantity; signals.variableDraw += line.quantity; }
      else if (FIXED_DRAW_RE.test(effect)) signals.oneShotDraw += line.quantity;
    }
    if (!isChampion && /\bbanish\b/i.test(effect)) signals.banish += line.quantity;
    if (!isChampion && /\bdestroy\b/i.test(effect)) signals.destroy += line.quantity;
    if (hasNegateActivation(card.effect ?? "")) signals.negate += line.quantity;
    if (/fast activation/i.test(effect)) signals.fastSpeed += line.quantity;
    const recover = effect.match(FIXED_RECOVER_RE);
    if (recover) signals.recover += Number(recover[1]) * line.quantity;
    if (VARIABLE_RECOVER_RE.test(effect)) signals.variableRecover += line.quantity;
    if (/spellshroud|intercept|\bprevent\b/i.test(effect)) signals.protection += line.quantity;
    if (isAlly && card.power != null && card.power >= 2) signals.threats += line.quantity;
  }
  signals.avgNonChampionCost = costN ? costSum / costN : 0;
  signals.avgAllyPower = allyN ? allyPower / allyN : 0;
  const points: Record<RatingPillar, number> = {
    aggro: Math.max(0, signals.avgAllyPower - 1) * 10 + signals.evasion * 0.5 + signals.threats * 0.5 + Math.max(0, 1.5 - signals.avgNonChampionCost) * 3 + Math.min(signals.championDamageFloor, 25) * 0.2 + Math.min(signals.allyDamageFloor, 15) * 0.15,
    opportunity: Math.min(signals.repeatableDraw * 4 + Math.min(signals.oneShotDraw, 30), 50) + Math.min(signals.floatingMemory, 35) * 0.5,
    interaction: Math.min(signals.banish, 30) * 0.3 + signals.destroy * 0.3 + signals.negate * 2 + signals.fastSpeed * 1.5 + Math.min(signals.championDamageFloor, 25) * 0.1,
    durability: Math.min(signals.recover, 30) * 0.3 + signals.protection * 0.5,
  };
  const scores = scoreDiaoPoints(points);
  return { signals, points, scores, composite: +((scores.durability + scores.interaction + scores.aggro + scores.opportunity) / 4).toFixed(2) };
}

export function cardPillarScore(card: DiaoCard, pillar: RatingPillar): number {
  const effect = (card.effect ?? "").replace(/\*\*/g, "");
  const isChampion = card.types.includes("CHAMPION");
  const isAlly = card.types.includes("ALLY");
  if (pillar === "aggro") return (isAlly && card.power != null ? Math.max(0, card.power - 1) : 0) + (/unblockable/i.test(effect) ? 1.5 : 0) + (/ranged \d/i.test(effect) ? 0.5 : 0) + (!isChampion && card.cost_memory != null && card.cost_memory <= 1 ? 1 : 0);
  if (pillar === "opportunity") return !isLineageOpeningDraw(card) && REPEATABLE_DRAW_RE.test(effect) ? 4 : !isLineageOpeningDraw(card) && (VARIABLE_DRAW_RE.test(effect) || FIXED_DRAW_RE.test(effect)) ? 1.5 : 0;
  if (pillar === "interaction") return (!isChampion && /\bbanish\b/i.test(effect) ? 0.3 : 0) + (!isChampion && /\bdestroy\b/i.test(effect) ? 0.3 : 0) + (hasNegateActivation(card.effect ?? "") ? 2 : 0) + (/fast activation/i.test(effect) ? 1.5 : 0);
  const recover = effect.match(FIXED_RECOVER_RE);
  return (recover ? Number(recover[1]) * 0.3 : 0) + (/spellshroud|intercept|\bprevent\b/i.test(effect) ? 0.5 : 0);
}
