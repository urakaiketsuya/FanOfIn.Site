import { searchSetFamily, type Card } from '@gatcg/shared';

export interface PreviewCardRecord {
  image?: string; setPrefix?: string;
  name: string; aliases?: string[]; types: string[]; subtypes: string[]; classes: string[]; elements: string[];
  level: number | null; life: number | null; power: number | null; speed: string | null;
  cost: { type: string; value: string | null }; effect: string; flavor?: string;
}
export const PREVIEW_SET = { prefix: "CBL", name: "Asphodel/Cantabile" };
type PreviewCard = Card & { previewImage?: string; previewSetPrefix?: string };
export function previewCardSet(card: Card): string | undefined {
  return isPreviewCard(card) ? (card as PreviewCard).previewSetPrefix : undefined;
}
export function catalogSetOptions(cards: Card[]) {
  const sets = new Map(cards.flatMap(card => card.editions.map(edition => { const family = searchSetFamily(edition.set); return [family.prefix, family.name] as const; })));
  if (cards.some(card => previewCardSet(card))) sets.set(PREVIEW_SET.prefix, PREVIEW_SET.name);
  return [...sets].map(([value, text]) => ({ value, text })).sort((a, b) => a.text.localeCompare(b.text));
}
export function previewCardImage(card: Card | undefined): string | undefined {
  return isPreviewCard(card) ? (card as PreviewCard).previewImage : undefined;
}
export const cardNameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
export const isPreviewCard = (card: Card | undefined) => Boolean(card?.uuid?.startsWith('preview:'));

/** Official records always win in full. Aliases are explicit editorial mappings, never fuzzy guesses. */
export function mergePreviewCards(official: Card[], previews: PreviewCardRecord[], includePreviews: boolean, selected: string[] = []): Card[] {
  const result = [...official];
  const officialKeys = new Set(official.map(card => cardNameKey(card.name)));
  const selectedKeys = new Set(selected.map(cardNameKey));
  for (const card of previews) {
    if ([card.name, ...(card.aliases ?? [])].some(name => officialKeys.has(cardNameKey(name)))) continue;
    if (!includePreviews && !selectedKeys.has(cardNameKey(card.name))) continue;
    const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const costType = card.cost.type;
    const preview: PreviewCard = {
      previewSetPrefix: card.setPrefix,
      previewImage: card.image && /^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(card.image) ? `/images/spoilers/${card.image}` : undefined,
      uuid: `preview:${slug}`, slug, name: card.name, types: card.types, subtypes: card.subtypes,
      classes: card.classes, elements: card.elements, element: card.elements[0] ?? 'NORM',
      level: card.level, life: card.life, power: card.power, speed: card.speed === null ? null : card.speed === 'fast',
      cost: { type: costType === 'memory' || costType === 'reserve' || costType === 'aria' ? costType : 'none', value: card.cost.value },
      cost_memory: costType === 'memory' ? Number(card.cost.value) : null,
      cost_reserve: costType === 'reserve' ? Number(card.cost.value) : null,
      durability: null, effect: card.effect, effect_raw: card.effect, effect_html: null, flavor: card.flavor ?? null,
      editions: [], references: [], referenced_by: [], legality: null, last_update: '',
    };
    result.push(preview);
  }
  return result;
}

export function officialCardNames(official: Card[], previews: PreviewCardRecord[]): Map<string, string> {
  const names = new Map(official.map(card => [cardNameKey(card.name), card.name]));
  for (const preview of previews) {
    const canonical = [preview.name, ...(preview.aliases ?? [])].map(name => names.get(cardNameKey(name))).find(Boolean);
    if (canonical) for (const name of [preview.name, ...(preview.aliases ?? [])]) names.set(cardNameKey(name), canonical);
  }
  return names;
}
