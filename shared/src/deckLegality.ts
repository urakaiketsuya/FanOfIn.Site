import type { Card } from "./api-types.js";
import type { DeckFormat } from "./shoutatyourdecks-types.js";
import type { OmnidexDecklist } from "./omnidex-types.js";
export type DeckLegalitySection = keyof OmnidexDecklist;
export interface DeckCardIssue {
  code: "banned" | "unverified"; card: string; section: DeckLegalitySection; quantity: number; format: DeckFormat;
}
export function cardLegalityStatus(card: Card | undefined, format: DeckFormat): "banned" | "unverified" | "allowed" {
  if (format === "UNKNOWN" || !card || card.legality?.[format] === undefined) return "unverified";
  return card.legality[format].limit === 0 ? "banned" : "allowed";
}
/** Current catalog only. Maybeboard is intentionally excluded from active deck legality. */
export function deckCardIssues(deck: OmnidexDecklist, catalog: ReadonlyMap<string, Card>, format: DeckFormat): DeckCardIssue[] {
  return (["main", "material", "sideboard"] as const).flatMap(section => deck[section].flatMap(line => {
    if (line.quantity <= 0) return [];
    const code = cardLegalityStatus(catalog.get(line.card), format);
    return code === "allowed" ? [] : [{ code, card: line.card, quantity: line.quantity, section, format }];
  }));
}
/** Warnings only for a user edit that increases an active banned-card total. */
export function newlyAddedBannedCards(before: OmnidexDecklist, after: OmnidexDecklist, catalog: ReadonlyMap<string, Card>, format: DeckFormat): string[] {
  const counts = (deck: OmnidexDecklist) => {
    const totals = new Map<string, number>();
    for (const issue of deckCardIssues(deck, catalog, format)) if (issue.code === "banned") totals.set(issue.card, (totals.get(issue.card) ?? 0) + issue.quantity);
    return totals;
  };
  const old = counts(before);
  return [...counts(after)].filter(([name, count]) => count > (old.get(name) ?? 0)).map(([name]) => name);
}
