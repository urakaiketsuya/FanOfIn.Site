import type { Card } from "@gatcg/shared";

export interface NamedCardLine {
  name: string;
  quantity: number;
}

function computeCostCurve(lines: NamedCardLine[], cardsByName: Map<string, Card>, field: "cost_memory" | "cost_reserve", maxBucket: number) {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const card = cardsByName.get(line.name);
    if (!card || card.types.includes("CHAMPION")) continue;
    const cost = card[field];
    if (cost === null || cost < 0) continue;
    const bucket = Math.min(cost, maxBucket);
    counts.set(bucket, (counts.get(bucket) ?? 0) + line.quantity);
  }
  return Array.from({ length: maxBucket + 1 }, (_, cost) => ({
    label: cost === maxBucket ? `${maxBucket}+` : String(cost),
    value: counts.get(cost) ?? 0,
  }));
}

export function memoryCostCurve(lines: NamedCardLine[], cardsByName: Map<string, Card>) {
  return computeCostCurve(lines, cardsByName, "cost_memory", 6);
}

export function reserveCostCurve(lines: NamedCardLine[], cardsByName: Map<string, Card>) {
  return computeCostCurve(lines, cardsByName, "cost_reserve", 8);
}

export function rarityBreakdown(lines: NamedCardLine[], cardsByName: Map<string, Card>) {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const rarity = cardsByName.get(line.name)?.editions[0]?.rarity;
    if (rarity === undefined) continue;
    counts.set(rarity, (counts.get(rarity) ?? 0) + line.quantity);
  }
  return counts;
}
