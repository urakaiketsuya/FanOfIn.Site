import type { DeckRating, DiaoCard, NamedCardLine, RatingPillar } from "@gatcg/shared";

/** Frozen DIAO v1 implementation used only to make model migrations reproducible. */
export const DIAO_V1_SCORE_BANDS: Record<RatingPillar, readonly number[]> = {
  aggro: [3.4, 4.9, 7.3, 10, 16.9, 20.3, 30],
  opportunity: [10, 18, 23, 36, 40, 47, 54],
  interaction: [6.2, 9.3, 12.8, 19.8, 25.1, 27.9, 31],
  durability: [5.8, 8, 8.9, 10.2, 12.1, 15.7, 19],
};

const FLOATING_MEMORY_RE = /(\[([^\]]+)\]\s*)?\*\*Floating Memory\*\*/g;
const DEAL_DAMAGE_RE = /Deal (\d+(?:\+X)?|X) damage\s*([^.]*)/gi;
const SELF_CHAMPION_RE = /\b(your|own) champion\b/g;

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
      const scan = match[2].toLowerCase().replace(SELF_CHAMPION_RE, "");
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

export function scoreDiaoV1Points(points: Record<RatingPillar, number>): Record<RatingPillar, number> {
  const toScore = (value: number, boundaries: readonly number[]): number => {
    for (let i = 0; i < boundaries.length; i++) if (value < boundaries[i]) return Math.max(1, i + 3);
    return 10;
  };
  return {
    aggro: toScore(points.aggro, DIAO_V1_SCORE_BANDS.aggro),
    opportunity: toScore(points.opportunity, DIAO_V1_SCORE_BANDS.opportunity),
    interaction: toScore(points.interaction, DIAO_V1_SCORE_BANDS.interaction),
    durability: toScore(points.durability, DIAO_V1_SCORE_BANDS.durability),
  };
}

export function computeDiaoV1Rating(lines: NamedCardLine[], cards: Map<string, DiaoCard>, championName: string | null, championClasses: string[]): DeckRating {
  const damage = damageFloors(lines, cards);
  const signals: DeckRating["signals"] = {
    avgNonChampionCost: 0, avgAllyPower: 0, evasion: 0,
    championDamageFloor: damage.champion, allyDamageFloor: damage.ally,
    repeatableDraw: 0, oneShotDraw: 0, variableDraw: 0, floatingMemory: floatingMemory(lines, cards, championName, championClasses),
    banish: 0, destroy: 0, negate: 0, fastSpeed: 0, recover: 0, variableRecover: 0, protection: 0, threats: 0,
  };
  let costSum = 0, costN = 0, allyPower = 0, allyN = 0;
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
    if (/whenever .* draw a card|\[REST\].*draw a card|at the (beginning|start) of .* draw a card/i.test(effect)) signals.repeatableDraw += line.quantity;
    else if (/draw (a|two|three|\d+) card/i.test(effect)) signals.oneShotDraw += line.quantity;
    if (!isChampion && /\bbanish\b/i.test(effect)) signals.banish += line.quantity;
    if (!isChampion && /\bdestroy\b/i.test(effect)) signals.destroy += line.quantity;
    if (/\*\*negate\*\*/i.test(card.effect ?? "")) signals.negate += line.quantity;
    if (/fast activation/i.test(effect)) signals.fastSpeed += line.quantity;
    const recover = effect.match(/recover (\d+)/i);
    if (recover) signals.recover += Number(recover[1]) * line.quantity;
    if (/spellshroud|intercept|\bprevent\b/i.test(effect)) signals.protection += line.quantity;
    if (isAlly && card.power != null && card.power >= 2) signals.threats += line.quantity;
  }
  signals.avgNonChampionCost = costN ? costSum / costN : 0;
  signals.avgAllyPower = allyN ? allyPower / allyN : 0;
  const points: Record<RatingPillar, number> = {
    aggro: Math.max(0, signals.avgAllyPower - 1) * 10 + signals.evasion * 0.5 + signals.threats * 0.5 + Math.max(0, 1.5 - signals.avgNonChampionCost) * 3 + Math.min(signals.championDamageFloor, 25) * 0.2 + Math.min(signals.allyDamageFloor, 15) * 0.15,
    opportunity: Math.min(signals.repeatableDraw * 4 + Math.min(signals.oneShotDraw, 30), 50) + Math.min(signals.floatingMemory, 35) * 0.5,
    interaction: Math.min(signals.banish, 30) * 0.3 + signals.destroy * 0.3 + signals.negate * 2 + signals.fastSpeed * 1.5 + Math.min(signals.championDamageFloor, 25) * 0.1,
    durability: Math.min(signals.recover, 30) * 0.3 + signals.protection * 0.5 + signals.threats * 0.3,
  };
  const scores = scoreDiaoV1Points(points);
  return { signals, points, scores, composite: +((scores.durability + scores.interaction + scores.aggro + scores.opportunity) / 4).toFixed(2) };
}
