import type { Card, CardEdition } from "./api-types.js";
import type { OmnidexDecklist, OmnidexDecklistCardLine } from "./omnidex-types.js";

/** Unallocated copies remain unspecified. Finish is independent of edition. */
export interface CardPrintingAllocation { editionUuid: string; quantity: number }
export type DeckPrintings = Partial<Record<keyof OmnidexDecklist | "maybeboard", Record<string, CardPrintingAllocation[]>>>;
export const printingCardKey = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
export function validPrintingAllocations(value: unknown, quantity: number): value is CardPrintingAllocation[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const ids = new Set<string>();
  let total = 0;
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.editionUuid !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(item.editionUuid) || ids.has(item.editionUuid) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return false;
    ids.add(item.editionUuid); total += item.quantity;
  }
  return total <= quantity;
}
export function mergePrintingAllocations(values: CardPrintingAllocation[]): CardPrintingAllocation[] {
  const quantities = new Map<string, number>();
  for (const value of values) quantities.set(value.editionUuid, (quantities.get(value.editionUuid) ?? 0) + value.quantity);
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([editionUuid, quantity]) => ({ editionUuid, quantity }));
}
export function extractDeckPrintings(deck: OmnidexDecklist & { maybeboard?: OmnidexDecklistCardLine[] }): DeckPrintings {
  const result: DeckPrintings = {};
  for (const section of ["main", "material", "sideboard", "maybeboard"] as const) {
    for (const line of deck[section] ?? []) {
      if (!line.printings?.length) continue;
      const rows = result[section] ??= Object.create(null) as Record<string, CardPrintingAllocation[]>;
      const key = printingCardKey(line.card);
      rows[key] = mergePrintingAllocations([...(rows[key] ?? []), ...line.printings]);
    }
  }
  for (const section of Object.keys(result) as (keyof DeckPrintings)[]) result[section] = Object.fromEntries(Object.entries(result[section]!).sort(([a], [b]) => a.localeCompare(b)));
  return result;
}
export function withDeckPrintings<T extends OmnidexDecklist & { maybeboard?: OmnidexDecklistCardLine[] }>(deck: T, printings: DeckPrintings): T {
  const result = { ...deck };
  for (const section of ["main", "material", "sideboard", "maybeboard"] as const) {
    const lines = deck[section];
    if (!lines) continue;
    Object.assign(result, { [section]: lines.map(line => {
      const allocations = printings[section]?.[printingCardKey(line.card)];
      return validPrintingAllocations(allocations, 9999) && allocations.length ? { ...line, printings: allocations } : line;
    }) });
  }
  return result;
}
export function printingLabel(edition: CardEdition): string {
  return `${edition.set.name} · ${edition.set.prefix} #${edition.collector_number}`;
}
export function cardWithPrinting(card: Card | undefined, editionUuid?: string): Card | undefined {
  if (!card || !editionUuid) return card;
  const edition = card.editions.find(item => item.uuid === editionUuid);
  return { ...card, editions: edition ? [edition] : [] };
}
/** Lossless optional extension for local drafts and Fan of Insight text interchange. */
export function printingCardLine(line: OmnidexDecklistCardLine): string {
  return `${line.quantity} ${line.card}${line.printings?.length ? ` [printings:${line.printings.map(p => `${p.editionUuid}=${p.quantity}`).join(",")}]` : ""}`;
}
