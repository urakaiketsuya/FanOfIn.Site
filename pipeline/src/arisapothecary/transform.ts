import type { DeckLine, ShoutAtYourDecksDeck } from '@gatcg/shared';

export const BASE_URL = 'https://www.arisapothecary.com';
export interface AriDeck {
  id: string; name: string; is_public: boolean; format: string;
  creator_username?: string; updated_at: string;
  cards: Record<string, unknown>;
}

/** Read JSON flight records, never evaluate source scripts. Fail closed on schema changes. */
export function parseDeckFlight(chunks: string[], id: string): AriDeck {
  const visit = (value: unknown): AriDeck | undefined => {
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (record.id === id && record.cards && typeof record.cards === 'object') return record as unknown as AriDeck;
    for (const child of Object.values(record)) { const found = visit(child); if (found) return found; }
  };
  for (const line of chunks.join('').split('\n')) {
    const json = line.slice(line.indexOf(':') + 1);
    if (!json.startsWith('[') && !json.startsWith('{')) continue;
    let value: unknown;
    try { value = JSON.parse(json); } catch { continue; }
    const found = visit(value);
    if (found) return found;
  }
  throw new Error(`Ari deck ${id}: public deck payload missing`);
}

export function transformDeck(raw: AriDeck, fetchedAt = new Date().toISOString()): ShoutAtYourDecksDeck {
  if (typeof raw.id !== 'string' || !/^[a-z0-9-]+$/i.test(raw.id) || raw.is_public !== true || typeof raw.name !== 'string') throw new Error('Invalid or nonpublic Ari deck');
  const lines = (zone: string, required = false): DeckLine[] => {
    const values = raw.cards[zone];
    if (values === undefined && !required) return [];
    if (!Array.isArray(values)) throw new Error(`Invalid Ari ${zone} section`);
    const counts = new Map<string, number>();
    for (const value of values) {
      if (!value || typeof value.name !== 'string' || !value.name.trim() || !Number.isSafeInteger(value.count) || value.count <= 0) throw new Error(`Invalid Ari ${zone} card`);
      const name = value.name.trim();
      counts.set(name, (counts.get(name) ?? 0) + value.count);
    }
    return [...counts].map(([name, quantity]) => ({ name, quantity }));
  };
  const mainDeck = lines('main', true), materialDeck = lines('material', true), sideDeck = lines('sideboard'), pantheonDeck = lines('boons');
  // Tokens are generated references, not registered deck content.
  if (!['Constructed', 'Pantheon'].includes(raw.format) || Object.entries(raw.cards).some(([key, value]) => Array.isArray(value) && value.length && !['main', 'material', 'sideboard', 'boons', 'tokens'].includes(key))) throw new Error(`Unsupported Ari format/zones: ${raw.format}`);
  const count = (cards: DeckLine[]) => cards.reduce((sum, card) => sum + card.quantity, 0);
  const champion = (raw.cards.material as Array<{ name: string; types?: string[]; subtypes?: string[] }>).find(c => c.types?.includes('CHAMPION') && !c.subtypes?.includes('SPIRIT'))?.name.split(',')[0] ?? null;
  return { id: raw.id, url: `${BASE_URL}/decks/${raw.id}`, title: raw.name, author: raw.creator_username ?? '', champion, priceLow: null, fetchedAt, format: raw.format === 'Pantheon' ? 'PANTHEON' : 'STANDARD', formatConfidence: 'declared', mainDeck, materialDeck, sideDeck, pantheonDeck, mainCount: count(mainDeck), materialCount: count(materialDeck), sideCount: count(sideDeck) };
}
export const shouldKeepAriDeck = (deck: ShoutAtYourDecksDeck) => (deck.mainCount ?? 0) >= 60 && (deck.materialCount ?? 0) > 0;
