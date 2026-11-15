import assert from 'node:assert/strict';
import test from 'node:test';
import { officialProductDecks } from '../src/features/official-products/data';
import { starterPrimers, primerTerms, findPrimer, primerPath } from '../src/features/official-products/primers/data';

test('every catalog product has its own primer and valid card examples', () => {
  const expected = officialProductDecks;
  assert.equal(expected.length, 22);
  assert.deepEqual([...starterPrimers.keys()].sort(), expected.map(deck => deck.id).sort());
  for (const deck of expected) {
    const primer = starterPrimers.get(deck.id)!;
    const names = new Set(Object.values(deck.cards).flat().map(card => card.name));
    for (const name of [...primer.cards, ...primer.synergyCards, ...primer.winCards]) {
      assert.ok(names.has(name), `${deck.name} highlights a card outside its list: ${name}`);
    }
    assert.ok(primer.summary && primer.opening && primer.leveling && primer.sequence && primer.winText);
    assert.ok(primer.synergyCards.length >= 2 && primer.winCards.length >= 2);
    const terms = primerTerms(deck.id);
    assert.ok(terms.length > 10);
    assert.equal(new Set(terms.map(term => term.term)).size, terms.length);
    for (const term of terms) {
      assert.ok(term.meaning && term.cards.length);
      for (const name of term.cards) assert.ok(names.has(name), `${deck.name}: ${term.term} uses ${name}`);
    }
  }
});

test('the two Diana products teach their own mechanics and finishes', () => {
  const gun = officialProductDecks.find(deck => deck.name === 'Diana Starter Deck')!;
  const aetherwing = officialProductDecks.find(deck => deck.name === 'Diana, Moonpiercer')!;
  assert.ok(starterPrimers.get(gun.id)!.winCards.includes("Anathema's End"));
  assert.ok(starterPrimers.get(aetherwing.id)!.winCards.includes('Meteoric Volley'));
  assert.ok(primerTerms(gun.id).some(term => term.term === 'Renewable'));
  assert.ok(!primerTerms(gun.id).some(term => term.term === 'Aethercalling'));
  assert.ok(primerTerms(aetherwing.id).some(term => term.term === 'Aethercalling'));
});

test('unknown products have neither invented content nor glossary entries', () => {
  assert.equal(starterPrimers.get('unknown'), undefined);
  assert.deepEqual(primerTerms('unknown'), []);
});


test('readable routes are unique and legacy IDs resolve to the same guide', () => {
  const slugs = new Set<string>();
  for (const [id, guide] of starterPrimers) {
    assert.match(guide.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(guide.slug));
    slugs.add(guide.slug);
    assert.equal(findPrimer(id), findPrimer(guide.slug));
    assert.equal(primerPath(id), `/official-decks/${guide.slug}/primer`);
  }
  assert.equal(findPrimer('unknown'), undefined);
  assert.equal(primerPath('unknown'), null);
});

test('new products explain their distinctive mechanics', () => {
  const expected: Record<string, string[]> = {
    'ReC-IDY': ['Glimmer counters', 'Wither counters', 'Flowerbuds / Blooms'],
    'ReC-HVF': ['Transform / Fatestone / Fatebound', 'Quest counters', 'Retort', 'Generate'],
    'ReC-SLM': ['Pride', 'Refinement counters'],
    'ReC-SHD': ['Prepare / Preparation', 'Ominous Shadow', 'Agility'],
    RDOPD: ['Crowd’s Favor', 'Siegeable / On Destroy', 'Retort'],
  };
  for (const deck of officialProductDecks) {
    for (const term of expected[deck.productCode] ?? []) {
      assert.ok(primerTerms(deck.id).some(entry => entry.term === term), `${deck.name} needs ${term}`);
    }
    if (deck.productCode === 'RDOPD' && !deck.name.startsWith('Arisanna')) {
      assert.ok(!primerTerms(deck.id).some(entry => entry.term === 'Age counters'));
    }
  }
});

test('card quotations are short, attributed, and refer to cards in the glossary examples', () => {
  const quotesBySource = new Map<string, string>();
  for (const [id] of starterPrimers) {
    const terms = primerTerms(id);
    assert.ok(terms.some(term => term.quote));
    for (const { quote, cards } of terms) {
      if (!quote) continue;
      assert.ok(cards.includes(quote.cardName));
      assert.match(quote.sourceUrl, /^https:\/\/index\.gatcg\.com\/card\/[a-z0-9-]+$/);
      assert.ok(quote.text.split(/\s+/).length <= 25);
      assert.ok(!quote.text.includes('CARDNAME'));
      const existing = quotesBySource.get(quote.sourceUrl);
      if (existing) assert.equal(quote.text, existing);
      quotesBySource.set(quote.sourceUrl, quote.text);
    }
  }
});


test('comprehensive-rule excerpts are distinguished from card wording', () => {
  const rules = new Map<string, string>();
  for (const [id] of starterPrimers) {
    for (const term of primerTerms(id)) {
      if (!term.ruleQuote) continue;
      assert.match(term.ruleQuote.sourceUrl, /^https:\/\/rules\.gatcg\.com\/glossary\/keywords-and-abilities#/);
      rules.set(term.ruleQuote.sourceUrl, term.ruleQuote.text);
    }
  }
  assert.equal(rules.size, 3);
  assert.ok([...rules.values()].reduce((total, text) => total + text.split(/\s+/).length, 0) <= 25);
});
