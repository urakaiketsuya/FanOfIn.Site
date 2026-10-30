import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Card } from '@gatcg/shared';
import { contextualCutImpact, engineDependencies, type ReviewLine } from '../src/features/deckbuilder/suggestedBuild/reviewContext';
import { buildTournamentSuggestedDeck, type SuggestedCard } from '../src/features/deckbuilder/suggestedBuild/buildTournamentSuggestedDeck';
import { deriveReviewGroups } from '../src/features/deckbuilder/engine/builderSelectors';
import type { DeckBuilderRow } from '../src/features/deckbuilder/useDeckBuilderPopulation';
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/tonoris-water.json', import.meta.url), 'utf8'));
const catalog = new Map<string, Card>(JSON.parse(fs.readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((c: Card) => [c.name, c]));
const lines: ReviewLine[] = (['main', 'material', 'sideboard'] as const).flatMap(section => Object.entries(fixture[section]).map(([cardName, quantity]) => ({ cardName, quantity: quantity as number, section })));
const main = new Map<string, number>(Object.entries(fixture.main));
function row(id: number, included: boolean, similar = true): DeckBuilderRow {
  const cards = new Map(main); cards.delete('Engulf');
  if (included) cards.set('Engulf', 3);
  return { deckId: String(id), spiritName: 'Spirit of Water', main: similar ? cards : new Map([['Unrelated', 60], ...(included ? [['Engulf', 3] as [string, number]] : [])]), material: new Map(Object.entries(fixture.material)), sideboard: new Map(), winRate: included ? 0.2 : 0.8 };
}
test('Tonoris fixture preserves connected token/domain cards, including reduced quantities', () => {
  assert.equal(lines.filter(l => l.section === 'main').reduce((n,l)=>n+l.quantity,0),60);
  const expected = ['Cordelia, Aurous Kaiser','Automata Genesis','The Eternal Kingdom','Blade of Creation','Atmos Armor Type-Ares','Dormant Sacrificial Altar','Epicurean Institute','Hub of Innovation','Archon Broadsword'];
  for (const input of [lines, lines.map(l => ({ ...l, quantity: 1 }))]) {
    const protectedNames = engineDependencies(input, catalog);
    for (const name of expected) assert.ok(protectedNames.has(name), name);
    assert.equal(protectedNames.has('Engulf'), false);
  }
  assert.equal(engineDependencies(lines.map(l=>({...l,section:'sideboard'})), catalog).size,0);
  assert.equal(engineDependencies([{cardName:'Blade of Creation',quantity:2,section:'main'}],catalog).size,0);
});
test('cut evidence requires comparable decks and both section-specific samples', () => {
  assert.equal(contextualCutImpact(Array.from({length:20},(_,i)=>row(i,i<10,false)),main,'Engulf','main'),null);
  assert.equal(contextualCutImpact(Array.from({length:14},(_,i)=>row(i,i<4)),main,'Engulf','main'),null);
  const peers=Array.from({length:20},(_,i)=>row(i,i<10));
  assert.ok(contextualCutImpact(peers,main,'Engulf','main')!.adjustedLift < -0.02);
  assert.equal(contextualCutImpact(peers,main,'Engulf','sideboard'),null);
});
test('full review suppresses engine cuts even with negative comparable evidence', () => {
  const peers=Array.from({length:20},(_,i)=>{const r=row(i,i<10);if(i>=10)r.main.delete('Blade of Creation');return r;});
  const locks=new Map(lines.filter(l=>l.section!=='sideboard').map(l=>[l.cardName,l.quantity]));
  const sections=new Map(lines.filter(l=>l.section!=='sideboard').map(l=>[l.cardName,l.section]));
  const result=buildTournamentSuggestedDeck(peers,'Spirit of Water',locks,new Set(),false,catalog,new Map(),sections);
  assert.ok(result.removalSuggestions.some(c=>c.cardName==='Engulf'));
  assert.equal([...result.removalSuggestions,...result.protectedRemovalSuggestions].some(c=>c.cardName==='Blade of Creation'),false);
  assert.equal(result.main.find(c=>c.cardName==='Blade of Creation')?.quantity,2);
});
test('a same-section addition alone never becomes a proposed swap', () => {
  const removal={cardName:'Engulf',section:'main'} as SuggestedCard;
  const addition={cardName:'Unrelated',section:'main'} as SuggestedCard;
  const groups=deriveReviewGroups([removal],[addition]);
  assert.equal(groups.pairs.length,0);assert.deepEqual(groups.unpairedRemovals,[removal]);
  const contextual=deriveReviewGroups([{...removal,contextualReplacement:{cardName:'Unrelated',peerDecks:20}}],[addition]);
  assert.equal(contextual.pairs.length,1);
});

test('review import preserves Main and Sideboard copies of the same card', async () => {
  const { reviewSelections } = await import('../src/features/deck-review/reviewSelections');
  const workspace = Object.fromEntries(Object.entries(fixture).map(([section, cards]) => [section, Object.entries(cards as Record<string, number>).map(([name, quantity]) => ({ name, quantity }))]));
  const result = reviewSelections(workspace as any);
  assert.equal(result.cards.get('Song of Frost'), 2);
  assert.equal(result.sections.get('Song of Frost'), 'main');
  assert.equal(result.sideboard.get('Song of Frost'), 1);
  assert.equal([...result.cards].filter(([name]) => result.sections.get(name)==='main').reduce((n,[,q])=>n+q,0),60);
});
