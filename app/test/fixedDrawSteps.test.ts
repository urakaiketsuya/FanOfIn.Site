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
