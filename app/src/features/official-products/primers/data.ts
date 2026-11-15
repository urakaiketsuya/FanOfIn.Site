import guides from './guides.json';
import glossary from './glossary.json';

export const starterPrimers = new Map(guides.map(guide => [guide.deckId, guide]));
export type StarterPrimer = typeof guides[number];
export function primerTerms(deckId: string) {
  const coverage = glossary.decks[deckId as keyof typeof glossary.decks] ?? [];
  return coverage.map(entry => ({ ...glossary.entries[entry.termIndex], cards: entry.cards }));
}
