import type { Card, CardEdition } from './api-types.js';
import type { CollectionEntry } from './collection-types.js';
import { artistForCredit } from './artists.js';
import { KEYWORD_PATTERNS } from './keywords.js';
import { setFamily } from './setFamilies.js';

export type CollectionProgressKind = 'set' | 'rarity' | 'artist' | 'champion' | 'keyword';
export interface CollectionProgressGoal {
  kind: CollectionProgressKind;
  id: string;
  target: 'single' | 'playset' | 'printing';
}
export interface CollectionProgressMember { card: Card; editions: CardEdition[] }
export interface CollectionProgressGroup {
  kind: CollectionProgressKind;
  id: string;
  title: string;
  members: CollectionProgressMember[];
}
export const COLLECTION_PROGRESS_KINDS: CollectionProgressKind[] = ['set', 'rarity', 'artist', 'champion', 'keyword'];
export const collectionProgressKey = (goal: CollectionProgressGoal) => JSON.stringify([goal.kind, goal.id, goal.target]);
export const defaultProgressTarget = (kind: CollectionProgressKind) => kind === 'artist' || kind === 'rarity' ? 'printing' : 'single';

export function collectionPlaysetTarget(card: Card): number {
  return card.cost_memory != null || card.cost?.type === 'memory' ? 1 : 4;
}

/** Membership is catalog-based; overlapping groups are never added into an overall total. */
export function buildCollectionProgressGroups(cards: readonly Card[]): CollectionProgressGroup[] {
  const groups = new Map<string, CollectionProgressGroup>();
  function add(kind: CollectionProgressKind, id: string, title: string, card: Card, editions: CardEdition[]) {
    const key = JSON.stringify([kind, id]);
    let group = groups.get(key);
    if (!group) { group = { kind, id, title, members: [] }; groups.set(key, group); }
    let member = group.members.find(value => value.card.uuid === card.uuid);
    if (!member) { member = { card, editions: [] }; group.members.push(member); }
    for (const edition of editions) if (!member.editions.some(value => value.uuid === edition.uuid)) member.editions.push(edition);
  }
  for (const card of cards) {
    for (const edition of card.editions) {
      const family = setFamily(edition.set);
      add('set', family.prefix, family.name, card, [edition]);
      if (Number.isFinite(edition.rarity)) add('rarity', String(edition.rarity), String(edition.rarity), card, [edition]);
      if (edition.illustrator?.trim()) {
        const artist = artistForCredit(edition.illustrator);
        add('artist', artist.id, artist.name, card, [edition]);
      }
    }
    if (card.types.includes('CHAMPION')) {
      const name = card.name.split(',')[0].trim();
      add('champion', name, name, card, card.editions);
    }
    for (const { keyword, re } of KEYWORD_PATTERNS) if (re.test(card.effect ?? '')) add('keyword', keyword, keyword, card, card.editions);
  }
  return [...groups.values()].map(group => ({ ...group, members: group.members.sort((a, b) => a.card.name.localeCompare(b.card.name)) }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

/** Exact editions pool finishes, but never borrow unidentified or differently printed copies. */
export function collectionGroupProgress(group: CollectionProgressGroup, target: CollectionProgressGoal['target'], entries: readonly CollectionEntry[]) {
  const inventory = new Map<string, CollectionEntry[]>();
  for (const entry of entries) {
    const rows = inventory.get(entry.cardUuid) ?? [];
    rows.push(entry); inventory.set(entry.cardUuid, rows);
  }
  const printing = group.kind === 'artist' || group.kind === 'rarity' || target === 'printing';
  const rows = group.members.flatMap(({ card, editions }) => {
    const ownedEntries = inventory.get(card.uuid) ?? [];
    const quantity = (lines: CollectionEntry[]) => lines.reduce((sum, line) => sum + Math.max(0, line.ownedQuantity), 0);
    const unidentified = quantity(ownedEntries.filter(line => !line.editionUuid || !card.editions.some(edition => edition.uuid === line.editionUuid)));
    const required = !printing && target === 'playset' ? collectionPlaysetTarget(card) : 1;
    const row = (edition?: CardEdition) => {
      const owned = quantity(edition ? ownedEntries.filter(line => line.editionUuid === edition.uuid) : ownedEntries);
      return { key: JSON.stringify([card.uuid, edition?.uuid ?? '']), card, edition, required, owned, missing: Math.max(0, required - owned), needsIdentification: !!edition && owned < required && unidentified > 0 };
    };
    return printing ? editions.map(edition => row(edition)) : [row()];
  });
  const complete = rows.filter(row => row.missing === 0).length;
  return { rows, complete, total: rows.length, percent: rows.length ? Math.floor(complete * 100 / rows.length) : 0,
    missingCopies: rows.reduce((sum, row) => sum + row.missing, 0), printing };
}

export function parseCollectionProgressGoals(value: string | null): CollectionProgressGoal[] {
  if (value === null) return [];
  const data: unknown = JSON.parse(value);
  if (!Array.isArray(data)) throw new Error('Invalid collection goals');
  const result: CollectionProgressGoal[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object' || !COLLECTION_PROGRESS_KINDS.includes(item.kind) || typeof item.id !== 'string' || !item.id || item.id.length > 200 || !['single', 'printing', 'playset'].includes(item.target) || ((item.kind === 'artist' || item.kind === 'rarity') && item.target !== 'printing')) throw new Error('Invalid collection goal');
    const goal: CollectionProgressGoal = { kind: item.kind, id: item.id, target: item.target };
    if (!result.some(existing => collectionProgressKey(existing) === collectionProgressKey(goal))) result.push(goal);
  }
  return result;
}
