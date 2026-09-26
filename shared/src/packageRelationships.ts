import { decodeCardLines, type DeckCardIndexData } from "./analysis-types.js";
import { matchesPackageRule, type PackageReviewRule } from "./packageConfidence.js";

/** Display grouping only: card-pool similarity must never rewrite activation rules. */
export interface PackagePoolEntry {
  id: string;
  cards: readonly string[];
}

export interface PackagePoolGroup<T extends PackagePoolEntry> {
  id: string;
  cards: string[];
  entries: T[];
}

export type PackagePoolRelationshipKind = "contained" | "strong" | "loose";
export interface PackagePoolRelationship {
  leftId: string;
  rightId: string;
  kind: PackagePoolRelationshipKind;
  sharedCards: string[];
  leftOnly: string[];
  rightOnly: string[];
  similarity: number;
  containment: number;
  smallerId: string | null;
}

export const PACKAGE_OVERLAP_THRESHOLDS = { minimumShared: 3, similarity: 0.7, containment: 0.9 } as const;

export function comparePackagePools(left: PackagePoolEntry, right: PackagePoolEntry): PackagePoolRelationship | null {
  const a = new Set(left.cards);
  const b = new Set(right.cards);
  const sharedCards = [...a].filter((card) => b.has(card)).sort();
  if (sharedCards.length < 2) return null;
  const leftOnly = [...a].filter((card) => !b.has(card)).sort();
  const rightOnly = [...b].filter((card) => !a.has(card)).sort();
  const similarity = sharedCards.length / (a.size + b.size - sharedCards.length);
  const containment = sharedCards.length / Math.min(a.size, b.size);
  const contained = (leftOnly.length === 0 || rightOnly.length === 0) && a.size !== b.size;
  const strong = sharedCards.length >= PACKAGE_OVERLAP_THRESHOLDS.minimumShared &&
    (similarity >= PACKAGE_OVERLAP_THRESHOLDS.similarity || containment >= PACKAGE_OVERLAP_THRESHOLDS.containment);
  return { leftId: left.id, rightId: right.id, sharedCards, leftOnly, rightOnly, similarity, containment,
    kind: contained ? "contained" : strong ? "strong" : "loose",
    smallerId: a.size === b.size ? null : a.size < b.size ? left.id : right.id };
}

export function groupPackagePools<T extends PackagePoolEntry>(entries: readonly T[]) {
  const bySignature = new Map<string, PackagePoolGroup<T>>();
  for (const entry of entries) {
    const cards = [...new Set(entry.cards)].sort();
    if (cards.length < 2) continue;
    const signature = JSON.stringify(cards);
    const group = bySignature.get(signature) ?? { id: signature, cards, entries: [] };
    group.entries.push(entry);
    bySignature.set(signature, group);
  }
  // Only exact equality groups entries. In particular, A~B and B~C never merges A with C.
  const groups = [...bySignature.values()].sort((a, b) => b.entries.length - a.entries.length || a.id.localeCompare(b.id));
  for (const group of groups) group.entries.sort((a, b) => a.id.localeCompare(b.id));
  const relationships: PackagePoolRelationship[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const relationship = comparePackagePools(groups[i], groups[j]);
      if (relationship) relationships.push(relationship);
    }
  }
  const priority = { contained: 0, strong: 1, loose: 2 };
  relationships.sort((a, b) => priority[a.kind] - priority[b.kind] || b.similarity - a.similarity || a.leftId.localeCompare(b.leftId) || a.rightId.localeCompare(b.rightId));
  return { groups, relationships };
}

/** Pooled main + material evidence for two explicit rules; never approximates prose rules. */
export function measurePackageRuleOverlap(data: DeckCardIndexData, left: PackageReviewRule, right: PackageReviewRule) {
  const names = (rule: PackageReviewRule) => new Set([...rule.requiredCards, ...rule.groups.flatMap((group) => group.cards)]);
  const leftNames = names(left), rightNames = names(right);
  const relevant = new Set([...leftNames, ...rightNames]);
  const sharedCounts = new Map([...leftNames].filter((card) => rightNames.has(card)).map((card) => [card, 0]));
  const indices = new Set(data.cardNames.flatMap((name, index) => relevant.has(name) ? [index] : []));
  let leftCount = 0, rightCount = 0, both = 0;
  for (const deck of data.decks) {
    const cards = new Set(decodeCardLines([...deck.main, ...deck.material].filter(([index, quantity]) => quantity > 0 && indices.has(index)), data.cardNames).map((line) => line.name));
    for (const card of cards) if (sharedCounts.has(card)) sharedCounts.set(card, sharedCounts.get(card)! + 1);
    const a = matchesPackageRule(cards, left), b = matchesPackageRule(cards, right);
    if (a) leftCount++;
    if (b) rightCount++;
    if (a && b) both++;
  }
  return { leftCount, rightCount, both, union: leftCount + rightCount - both, population: data.decks.length,
    sharedPrevalence: [...sharedCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}
