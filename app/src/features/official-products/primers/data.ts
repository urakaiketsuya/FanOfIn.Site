import guides from './guides.json';
import glossary from './glossary.json';

export const starterPrimers = new Map(guides.map(guide => [guide.deckId, guide]));
export type StarterPrimer = typeof guides[number];
export function primerTerms(deckId: string) {
  const coverage = glossary.decks[deckId as keyof typeof glossary.decks] ?? [];
  return coverage.map(entry => ({ ...glossary.entries[entry.termIndex], cards: entry.cards, quote: entry.quote }));
}

export function findPrimer(identifier: string) {
  return starterPrimers.get(identifier) ?? guides.find(guide => guide.slug === identifier);
}
export function primerPath(deckId: string) {
  const primer = starterPrimers.get(deckId);
  return primer ? `/official-decks/${primer.slug}/primer` : null;
}
