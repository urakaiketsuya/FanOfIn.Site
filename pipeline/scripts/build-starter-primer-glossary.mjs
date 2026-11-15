/** Refresh term-to-card references after reviewing starter lists or catalog text. */
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const path = 'app/src/features/official-products/primers/glossary.json';
const glossary = read(path);
const guides = read('app/src/features/official-products/primers/guides.json');
const decks = read('app/src/features/official-products/decks.json').decks;
const catalog = new Map(read('pipeline/.cache/cards.json').cards.map(card => [card.name, card]));
glossary.decks = Object.fromEntries(guides.map(guide => {
  const deck = decks.find(deck => deck.id === guide.deckId);
  if (!deck) throw new Error(`Missing product ${guide.deckId}`);
  const lines = Object.values(deck.cards).flat();
  for (const line of lines) if (!catalog.has(line.name)) throw new Error(`Missing catalog card: ${line.name}`);
  return [deck.id, glossary.entries.flatMap((term, termIndex) => {
    const pattern = new RegExp(term.pattern, 'i');
    const cards = [...new Set(lines.filter(line => pattern.test(catalog.get(line.name).effect ?? '')).map(line => line.name))];
    return cards.length ? [{ termIndex, cards }] : [];
  })];
}));
writeFileSync(new URL(path, root), `${JSON.stringify(glossary, null, 2)}\n`);
