import type { CardTagsData, CardTagStatus } from "./card-tag-types.js";

export const CARD_TAG_CATEGORIES = ["Characters", "Art & themes", "Gameplay", "Other"] as const;
export type CardTagCategory = typeof CARD_TAG_CATEGORIES[number];

// Explicit aliases only: do not infer character identities from partial name matches.
const characterGroups = [
  ["Arisanna Sequestra", "Arisanna"], ["Lorraine Allard", "Lorraine"],
  ["Merlin Veritor", "Merlin"], ["Silvie Heartsong", "Silvie"],
  ["Ciel Lepford", "Ciel"], ["Rai Kyouki", "rai"],
  ["Tristan Halifax"], ["Alice Orleane"], ["Jin Mara"], ["Zander Forare"],
  ["Mordred Alazon"], ["Beatrice Othniel"], ["Allen Yumara"], ["Nova Aokami"],
  ["Kongming"], ["Diana"], ["Tonoris"], ["Diao Chan"], ["Guo Jia"],
  ["Liu Bei"], ["Cao Cao"], ["Guan Yu"], ["Zhang Fei"], ["Zhao Yun"],
  ["Xiao Qiao"], ["Da Qiao"], ["Lu Bu"], ["Vanitas"], ["Polkhawk"],
];
const clean = (name: string) => name.trim().replace(/\s+/g, " ");
const aliases = new Map(characterGroups.flatMap(group => group.map(name => [name.toLowerCase(), group[0]] as const)));
const characters = new Set(characterGroups.map(group => group[0]));
const gameplay = new Set([
  "Draft", "Mill", "Class Bonus", "Draw a Card", "Fast", "Slow", "Normal",
  "Unique", "Preparation", "Spellshroud", "Deal 4 Damage", "Prevent Damage",
  "On Attack", "Taunt", "Transform", "Floating Memory", "Enlighten",
].map(name => name.toLowerCase()));
const art = new Set([
  "Environment", "Sword", "bird", "Shield", "Slime", "Dagger", "Borderless Art",
  "Doodle", "Chibi", "Horse", "Spellbook", "Flute", "Gun", "Pistol", "Tiger",
  "Wolf", "Dog", "Dragon", "Squirrel", "Turtle", "Blue Hair", "Pink Hair",
  "White Hair", "Castle", "Flower", "Book", "Hat", "Cape", "Scarf", "Stars",
  "Weapon on Fire", "Nameless Character", "Unknown Character", "Nameless Ally",
].map(name => name.toLowerCase()));

export function canonicalCardTag(name: string): string {
  const normalized = clean(name);
  return aliases.get(normalized.toLowerCase()) ?? normalized;
}

/** Categories are editorial discovery aids, not verified card mechanics. */
export function cardTagCategory(name: string): CardTagCategory {
  const canonical = canonicalCardTag(name);
  if (characters.has(canonical)) return "Characters";
  if (gameplay.has(canonical.toLowerCase()) || /^[+-]\d+ Influence$/.test(canonical) || /^\d+ (Power|Cost|Health)$/.test(canonical)) return "Gameplay";
  if (art.has(canonical.toLowerCase())) return "Art & themes";
  return "Other";
}

/** Keep source data intact; merge aliases for discovery and count distinct cards, not links. */
export function normalizeCardTags(data: CardTagsData): CardTagsData {
  const names = [...new Set(data.tags.map(tag => canonicalCardTag(tag.name)))];
  const index = new Map(names.map((name, i) => [name, i]));
  const remap = (rows: Record<string, number[]>) => Object.fromEntries(Object.entries(rows).map(([uuid, ids]) => [uuid,
    [...new Set(ids.flatMap(id => data.tags[id] ? [index.get(canonicalCardTag(data.tags[id].name))!] : []))],
  ]));
  const cards = remap(data.cards);
  const counts = new Map<number, number>();
  for (const ids of Object.values(cards)) for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const statuses = new Map<string, CardTagStatus>();
  for (const tag of data.tags) {
    const name = canonicalCardTag(tag.name);
    const previous = statuses.get(name);
    // Merging an approved alias must not promote an unreviewed label.
    statuses.set(name, previous === "pending" || tag.status === "pending" ? "pending" : previous === "review" || tag.status === "review" ? "review" : "approved");
  }
  return { ...data, cards, editions: remap(data.editions), tags: names.map((name, i) => ({ name, cardCount: counts.get(i) ?? 0, status: statuses.get(name)! })) };
}

/** Decoded silvie.gg art tags — tag names per card uuid and per edition uuid. */
export interface CardTagLookup {
  cards: ReadonlyMap<string, ReadonlySet<string>>;
  editions: ReadonlyMap<string, ReadonlySet<string>>;
}

export function buildCardTagLookup(data: CardTagsData): CardTagLookup {
  const decode = (encoded: Record<string, number[]>) =>
    new Map(Object.entries(encoded).map(([uuid, indices]) => [uuid, new Set(indices.map((i) => data.tags[i].name))]));
  return { cards: decode(data.cards), editions: decode(data.editions) };
}
