import type { OmnidexDecklistCardLine } from "@gatcg/shared";

export interface SectionPrice {
  total: number;
  missing: number;
}

export function computeSectionPrice(lines: OmnidexDecklistCardLine[], priceByName: Map<string, number>): SectionPrice {
  let total = 0;
  let missing = 0;
  for (const line of lines) {
    const price = priceByName.get(line.card);
    if (price === undefined) missing += 1;
    else total += price * line.quantity;
  }
  return { total, missing };
}
