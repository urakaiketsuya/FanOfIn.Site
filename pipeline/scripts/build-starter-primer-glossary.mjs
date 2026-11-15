/** Refresh illustrated term references and short attributed card-text excerpts. */
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const path = 'app/src/features/official-products/primers/glossary.json';
const glossary = read(path);
const guides = read('app/src/features/official-products/primers/guides.json');
const faces = read('app/src/features/official-products/primers/transformFaces.json');
const decks = read('app/src/features/official-products/decks.json').decks;
const catalog = new Map(read('pipeline/.cache/cards.json').cards.map(card => [card.name, card]));
const textFor = name => [catalog.get(name).effect ?? '', ...(faces[name]?.faces.map(face => face.effect) ?? [])].join('\n').replace(/\*|_/g, '');
// One reusable excerpt per source card, at most 25 words, across the whole collection.
const excerpts = new Map();
function quoteFor(names, pattern) {
  for (const name of names) {
    const existing = excerpts.get(name);
    if (existing) {
      if (pattern.test(existing.text)) return existing;
      continue;
    }
    // Quote the displayed front face only; reverse-face coverage is still indexed above.
    const plain = (catalog.get(name).effect ?? '').replace(/\*|_/g, '');
    const sentence = plain.split(/\n+/).find(text => pattern.test(text) && !text.includes('CARDNAME') && !text.includes('%'))?.trim();
    if (!sentence) continue;
    const words = sentence.split(/\s+/);
    let text = words.slice(0, 25).join(' ');
    if (words.length > 25) {
      const sentenceEnd = text.lastIndexOf('. ');
      if (sentenceEnd >= 0 && pattern.test(text.slice(0, sentenceEnd + 1))) text = text.slice(0, sentenceEnd + 1);
      text += '…';
    }
    if (!pattern.test(text)) continue;
    const quote = { text, cardName: name, sourceUrl: `https://index.gatcg.com/card/${catalog.get(name).slug}` };
    excerpts.set(name, quote);
    return quote;
  }
  return null;
}
glossary.decks = Object.fromEntries(guides.map(guide => {
  const deck = decks.find(deck => deck.id === guide.deckId);
  if (!deck) throw new Error(`Missing product ${guide.deckId}`);
  const lines = Object.values(deck.cards).flat();
  for (const line of lines) if (!catalog.has(line.name)) throw new Error(`Missing catalog card: ${line.name}`);
  return [deck.id, glossary.entries.flatMap((term, termIndex) => {
    const pattern = new RegExp(term.pattern, 'i');
    const cards = [...new Set(lines.filter(line => pattern.test(textFor(line.name))).map(line => line.name))];
    return cards.length ? [{ termIndex, cards, quote: quoteFor(cards, pattern) }] : [];
  })];
}));
writeFileSync(new URL(path, root), `${JSON.stringify(glossary, null, 2)}\n`);
