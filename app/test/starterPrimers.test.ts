import assert from 'node:assert/strict';
import test from 'node:test';
import { officialProductDecks } from '../src/features/official-products/data';
import { starterPrimers, primerTerms } from '../src/features/official-products/primers/data';

test('every standard starter has a product-specific primer, excluding other formats', () => {
  const expected = officialProductDecks.filter(deck => deck.productCode !== 'RDOPD' && !deck.productCode.startsWith('ReC-'));
  assert.equal(expected.length, 14);
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
