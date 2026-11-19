import type { CardTagsData } from "./card-tag-types.js";
import type { TagOverride } from "./tag-contribution-types.js";
import { canonicalCardTag, cardTagKey, normalizeCardTags } from "./cardTags.js";

/** Rebuild card unions after edition corrections; card-wide decisions apply last. */
export function mergeTagOverrides(source: CardTagsData, overrides: TagOverride[], catalog: { uuid: string; editions: { uuid: string }[] }[]): CardTagsData {
  const data = normalizeCardTags(source);
  const namesByKey = new Map(data.tags.map(tag => [cardTagKey(tag.name), tag.name]));
  for (const row of overrides) {
    const name = canonicalCardTag(row.tag);
    if (!namesByKey.has(cardTagKey(name))) namesByKey.set(cardTagKey(name), name);
  }
  const resolveName = (name: string) => namesByKey.get(cardTagKey(name))!;
  const decode = (ids: number[]) => new Set(ids.map(id => data.tags[id].name));
  const editions = new Map(Object.entries(data.editions).map(([id, ids]) => [id, decode(ids)]));
  const cards = new Map(Object.entries(data.cards).map(([id, ids]) => [id, decode(ids)]));
  const known = new Map(catalog.map(card => [card.uuid, card]));
  const changed = new Set<string>();
  // Preserve card-only imported links, including printings not yet in our catalog.
  const cardOnly = new Map<string, Set<string>>();
  for (const card of catalog) {
    const names = new Set(cards.get(card.uuid));
    for (const edition of card.editions) for (const name of editions.get(edition.uuid) ?? []) names.delete(name);
    cardOnly.set(card.uuid, names);
  }
  for (const override of overrides) {
    const card = known.get(override.cardUuid);
    if (!card || !override.editionUuid || !card.editions.some(edition => edition.uuid === override.editionUuid)) continue;
    const tags = editions.get(override.editionUuid) ?? new Set<string>();
    const tag = resolveName(override.tag);
    if (override.action === "add") tags.add(tag); else tags.delete(tag);
    editions.set(override.editionUuid, tags);
    changed.add(card.uuid);
  }
  for (const uuid of changed) {
    const tags = new Set(cardOnly.get(uuid));
    for (const edition of known.get(uuid)!.editions) for (const tag of editions.get(edition.uuid) ?? []) tags.add(tag);
    cards.set(uuid, tags);
  }
  for (const override of overrides) {
    if (override.editionUuid || !known.has(override.cardUuid)) continue;
    const tag = resolveName(override.tag);
    const tags = cards.get(override.cardUuid) ?? new Set<string>();
    if (override.action === "add") tags.add(tag); else tags.delete(tag);
    cards.set(override.cardUuid, tags);
    for (const edition of known.get(override.cardUuid)!.editions) {
      const names = editions.get(edition.uuid) ?? new Set<string>();
      if (override.action === "add") names.add(tag); else names.delete(tag);
      editions.set(edition.uuid, names);
    }
  }
  const names = [...namesByKey.values()];
  const index = new Map(names.map((name, i) => [name, i]));
  const encode = (rows: Map<string, Set<string>>) => Object.fromEntries([...rows].map(([id, tags]) => [id, [...tags].map(tag => index.get(tag)!)]));
  return normalizeCardTags({ ...data, tags: names.map(name => ({ name, cardCount: 0, status: data.tags.find(tag => tag.name === name)?.status ?? "approved" })), cards: encode(cards), editions: encode(editions) });
}
