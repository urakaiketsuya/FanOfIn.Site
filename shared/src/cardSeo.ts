import type { Card } from './api-types';

const CARD_IMAGE = /^\/cards\/images\/[\w-]+\.(?:jpg|jpeg|png|webp)$/;

export function cardPagePath(slug: string): string {
  return `/cards/${encodeURIComponent(slug)}/`;
}

const titleCase = (value: string) => value.toLowerCase().replace(/(^|[\s_-])([a-z])/g, (_, sep: string, char: string) => `${sep === '_' ? ' ' : sep}${char.toUpperCase()}`);

/** "Fire Cleric Action (Skill)": element, class, type, then subtypes not already named. */
export function cardTypeLine(card: Pick<Card, 'elements' | 'classes' | 'types' | 'subtypes'>): string {
  const named = new Set([...card.classes, ...card.types]);
  const subtypes = card.subtypes.filter(subtype => !named.has(subtype)).map(titleCase);
  const base = [...card.elements, ...card.classes, ...card.types].map(titleCase).join(' ');
  return `${base}${subtypes.length ? ` (${subtypes.join(', ')})` : ''}`.trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max / 2)).replace(/[\s,.;:–-]+$/, '')}…`;
}

/**
 * Shared by the static entry pages and client-side navigation, so both describe a card the same way.
 * SEO text is deliberately limited to the card name, its keywords and its effect text.
 */
export function cardPageMetadata(card: Pick<Card, 'slug' | 'name' | 'elements' | 'classes' | 'types' | 'subtypes' | 'effect_raw' | 'effect_html'>) {
  const keywords = cardKeywords(card);
  const effect = card.effect_raw?.replace(/\s+/g, ' ').trim();
  const description = truncate([`${card.name}.`, keywords.length ? `Keywords: ${keywords.join(', ')}.` : '', effect ?? ''].filter(Boolean).join(' '), 160);
  return { title: card.name, description, path: cardPagePath(card.slug), typeLine: cardTypeLine(card), keywords };
}

/** Card art from the first printing, the same one the card page shows by default. */
export function cardSocialImage(card: Pick<Card, 'name' | 'editions'>): { src: string; alt: string } | undefined {
  const image = card.editions.find(edition => CARD_IMAGE.test(edition.image ?? ''))?.image;
  return image ? { src: `https://api.gatcg.com${image}`, alt: `${card.name} card art` } : undefined;
}

const NOT_KEYWORDS = new Set(['x', 'lv', 'class bonus']);
// Activation costs ("Banish Bauble of Abundance:") are also labelled, but they are not keywords.
const COST_LABEL = /^(?:banish|sacrifice|remove|pay|discard|exhaust|reveal|put)\b/i;

/** Keyword labels the API marks in effect_html (e.g. "Glimpse", "On Enter"), without counts, costs or punctuation. */
export function cardKeywords(card: Pick<Card, 'effect_html'>): string[] {
  const keywords = new Map<string, string>();
  for (const [, label] of (card.effect_html ?? '').matchAll(/class="effect__label">([^<]*)</g)) {
    for (const piece of label.split(/[:,.]/)) {
      // Strip counts and formulas ("Recover 3+LV", "4+X") and trailing dashes or quotes.
      const keyword = piece.replace(/&amp;/g, '&').replace(/["“”—–\s]+$/, '').replace(/(?:^|\s+)[-+]?(?:\d+|x|lv)(?:[-+](?:\d+|x|lv))*$/i, '').replace(/^(?:x|lv)\s+/i, '').trim();
      const key = keyword.toLowerCase();
      if (!keyword || keyword.split(/\s+/).length > 3 || COST_LABEL.test(keyword) || NOT_KEYWORDS.has(key) || !/[a-z]{2}/i.test(keyword.replace(/\blv\b/gi, '')) || keywords.has(key)) continue;
      keywords.set(key, titleCase(keyword));
    }
  }
  return [...keywords.values()];
}
