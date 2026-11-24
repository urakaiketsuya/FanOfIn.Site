import { groupCardResults, type CardGrouping } from "./cardResultGroups";
import { parseFilterQuery } from "@gatcg/shared";
import { searchCardPool } from "../features/cards/filters";
import type { Card } from "@gatcg/shared";
import spoilers from "../../../data/reference/card-spoilers-2026-11-01.json";
import { mergePreviewCards, type PreviewCardRecord } from "./previewCards";

/** Shared display catalog: official records supersede editorial previews. */
export function withSpoilerCards(cards: Card[]): Card[] {
  return mergePreviewCards(cards, spoilers.cards, true);
}

/** Spoiler browsing historically includes class/type/element words in bare searches. */
export function searchSpoilers(query: string): typeof spoilers.cards;
export function searchSpoilers<T extends PreviewCardRecord>(query: string, records: readonly T[]): T[];
export function searchSpoilers(query: string, records: readonly PreviewCardRecord[] = spoilers.cards) {
  const parsed = parseFilterQuery(query);
  const plain = !parsed.error && !parsed.expression && !Object.keys(parsed.facets).length && !parsed.numeric?.length
    && parsed.clauses.every(clause => clause.field === 'any' && !clause.exclude && !clause.exact);
  // Match each printing independently: shared names must not leak matches across sets.
  return records.filter(card => searchCardPool([card], mergePreviewCards([], [card], true), query).length > 0 || (plain &&
    [card.name, card.effect, ...card.classes, ...card.types, ...card.subtypes, ...card.elements].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
}

/** Printing editions share a set; companion products remain separate groups. */
export const spoilerSetKey = (prefix: string) => prefix.replace(/\s+1st$/, '');
export const spoilerSetName = (prefix: string) => ({
  CBL: 'Asphodel/Cantabile', CBLOS: 'Asphodel/Cantabile Opus',
  CBLP: 'Asphodel/Cantabile Pantheon', 'Re:C-SKY': 'Re:Collection · Casella',
  'Re:C-MST': 'Re:Collection · Beatrice', P26: '2026 Promos',
}[prefix] ?? prefix);

export function groupSpoilers<T extends { name: string; setPrefix: string; addedAt: string }>(cards: readonly T[], sort: "newest" | "oldest" | "name" | "name-desc" = "newest") {
  const groups = new Map<string, T[]>();
  // Stable ties preserve editorial order within an import batch.
  for (const card of [...cards].sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt))) {
    const key = spoilerSetKey(card.setPrefix);
    const group = groups.get(key) ?? [];
    group.push(card);
    groups.set(key, group);
  }
  return [...groups].map(([prefix, cards]) => ({
    prefix, name: spoilerSetName(prefix),
    cards: sort === "newest" ? cards : [...cards].sort((a, b) => sort === "oldest"
      ? Date.parse(a.addedAt) - Date.parse(b.addedAt)
      : (sort === "name-desc" ? -1 : 1) * a.name.localeCompare(b.name)),
  }));
}


export type SpoilerSort = "newest" | "oldest" | "name" | "name-desc";
export function sortSpoilers<T extends { name: string; addedAt: string }>(cards: readonly T[], sort: SpoilerSort) {
  return [...cards].sort((a, b) => sort === "name" || sort === "name-desc"
    ? (sort === "name-desc" ? -1 : 1) * a.name.localeCompare(b.name)
    : (sort === "oldest" ? 1 : -1) * (Date.parse(a.addedAt) - Date.parse(b.addedAt)));
}

/** Set membership belongs to the reveal, not all historical catalog editions. */
export function groupSpoilerResults<T extends { name: string; setPrefix: string; addedAt: string }>(
  items: readonly T[], cardFor: (item: T) => Card | undefined, grouping: CardGrouping,
) {
  if (grouping !== 'sets') return groupCardResults(items, cardFor, grouping);
  return groupSpoilers(items).map(group => ({
    label: group.name,
    items: items.filter(item => spoilerSetKey(item.setPrefix) === group.prefix),
  }));
}
