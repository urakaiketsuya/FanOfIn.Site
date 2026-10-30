import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedDrawSteps } from '@gatcg/shared';
import { drawnCardsPerCopy } from '../src/features/deckbuilder/drawEffects';
import type { Card } from '@gatcg/shared';

test('fixed draws retain destinations and clause order', () => {
 assert.deepEqual(fixedDrawSteps('Draw two cards into your memory. Draw a card. Draw 3 cards into your hand.'),[
  {count:2,destination:'memory'},{count:1,destination:'hand'},{count:3,destination:'hand'}]);
 assert.equal(drawnCardsPerCopy({effect:'Draw two cards into your memory. Draw a card.'} as Card),3);
 assert.deepEqual(fixedDrawSteps('Draw X cards. Draw 3+X cards.'),[]);
});
test('published Study the Fables wording draws into memory', () => {
 assert.deepEqual(fixedDrawSteps('Target player reveals six cards from their material deck. Draw a card into your memory.'),[{count:1,destination:'memory'}]);
});

test('automatic model accepts only complete supported Action text', async () => {
 const { supportedDrawEffect } = await import('@gatcg/shared');
 assert.deepEqual(supportedDrawEffect({types:['ACTION'],effect:'Draw two cards, then discard a card.'}),{steps:[{count:2,destination:'hand'}],discard:1});
 assert.deepEqual(supportedDrawEffect({types:['ACTION'],effect:'Draw a card into your memory. Draw two cards.'}),{steps:[{count:1,destination:'memory'},{count:2,destination:'hand'}],discard:0});
 for (const effect of [
  'If ready, draw two cards.', '[Class Bonus] Draw a card.',
  '(3), Banish CARDNAME: Draw a card into your memory.',
  'On Death: Draw two cards.', 'Draw a card for each ally you control.',
  'Draw two cards, then put a card from your hand on top of your deck.',
  'Draw a card. If you control eight objects, draw a card into your memory.',
  'Draw two cards. At the beginning of the next end phase, discard your hand.',
 ]) assert.equal(supportedDrawEffect({types:['ACTION'],effect}),null,effect);
 assert.equal(supportedDrawEffect({types:['ITEM'],effect:'Draw a card.'}),null);
});
