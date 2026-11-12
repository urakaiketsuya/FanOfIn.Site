import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { engineDependencies, recommendationDependencies, preservesRecommendationDependencies, type Card, type RecommendationLine } from '@gatcg/shared';
import { buildTournamentSuggestedDeck } from '../src/features/deckbuilder/suggestedBuild/buildTournamentSuggestedDeck';
import { suggestReportSwaps } from '../src/features/deck-analysis/reportModel';
import { persistReportSwap } from '../src/features/deck-analysis/reportDraft';
import type { DeckWorkspace } from '../src/features/deckbuilder/persistence/deckWorkspace';
import type { DeckBuilderRow } from '../src/features/deckbuilder/useDeckBuilderPopulation';
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = new Map<string, Card>(read('../../data/card-catalog.json').cards.map((card: Card) => [card.name, card]));
const fixture = read('./fixtures/tonoris-water.json');
const imported = read('./fixtures/tcgengine-recommendations.json');
const lines: RecommendationLine[] = (['main','material','sideboard'] as const).flatMap(section => Object.entries(fixture[section]).map(([cardName, quantity]) => ({cardName, quantity: quantity as number, section})));
const line = (cardName: string, section: RecommendationLine['section'] = 'main', quantity = 1): RecommendationLine => ({ cardName, section, quantity });
const workspace = (): DeckWorkspace => ({ format: 'STANDARD', main: [], material: [], sideboard: [], ...Object.fromEntries((['main','material','sideboard'] as const).map(section => [section, lines.filter(l => l.section === section).map(l => ({name:l.cardName,quantity:l.quantity}))])) }) as DeckWorkspace;
const replace = (input: RecommendationLine[], from: string, to: string) => input.map(l => l.cardName === from ? {...l,cardName:to} : l);
test('imports 18 existing engine scenarios intact with source provenance', () => {
  assert.equal(imported.scenarios.length,18);
  assert.match(imported.sourceRevision,/^[a-f0-9]{40}$/);
  for (const scenario of imported.scenarios) {
    assert.equal(createHash('sha256').update(scenario.excerpt).digest('hex'),scenario.excerptSha256);
    assert.ok(scenario.excerpt.includes(`gaScenario('${scenario.id}')`));
    assert.ok(scenario.excerpt.includes('->register();'));
  }
});
const cases = [
  ['Blade of Creation','Cordelia, Aurous Kaiser','tokens','blade-of-creation-class-bonus-costs-one-less-per-token-and-cleaves'],
  ['Archon Broadsword','Automata Genesis','tokens','archon-broadsword-class-bonus-token-power'],
  ['Neos Sight','Atmos Armor Type-Ares','objects','neos-sight-eight-objects-memory-draw'],
  ['The Eternal Kingdom','Epicurean Institute','domains','the-eternal-kingdom-class-bonus-domains-you-control-have-reservable'],
  ['Edge of Tomorrow','Hub of Innovation','domains','edge-of-tomorrow-scavenge-eight-for-a-domain-card'],
  ['Dormant Sacrificial Altar','Dungeon Guide','humans','dormant-sacrificial-altar-sacrifice-automaton-and-human-mills-two'],
  ['Dormant Sacrificial Altar','Shieldroid','automata','dormant-sacrificial-altar-sacrifice-automaton-and-human-mills-two'],
  ['Imperial Apprentice','Neos Sight','spells','imperial-apprentice-spell-activation-banishes-a-floating-memory-card-to-draw'],
  ['Imperial Apprentice','Spark Link','floating-memory','imperial-apprentice-spell-activation-banishes-a-floating-memory-card-to-draw'],
  ['Winbless Forecaster','Careful Study','enlighten','winbless-forecaster-adds-one-to-enlighten-counters-put-on-your-champion'],
  ['Lost Wisdom','Cordelia, Aurous Kaiser','unique-allies','lost-wisdom-class-bonus-with-a-unique-ally-costs-two-less-and-returns-a-spell-to-memory'],
  ['Primeval Ritual','Dungeon Guide','allies','primeval-ritual-cannot-be-activated-without-an-ally-to-sacrifice'],
];
for (const [consumer, supporter, resource, id] of cases) test(`fixture-backed construction: ${consumer} / ${resource}`, () => {
  const scenario = imported.scenarios.find((s: {id:string}) => s.id === id);
  assert.ok(scenario.excerpt.includes(consumer));
  const input = [line(consumer),line(supporter)];
  const group = recommendationDependencies(input,catalog).find(g => g.resource === resource)!;
  assert.deepEqual(group.supporters,[supporter]);
  assert.ok(engineDependencies(input,catalog).has(supporter));
  assert.equal(preservesRecommendationDependencies(input,replace(input,supporter,'Spirit of Fire'),catalog),false);
  assert.deepEqual(recommendationDependencies([line(consumer),line(supporter,'sideboard')],catalog).find(g=>g.resource===resource)?.supporters,[]);
});
test('partial core cuts are blocked, flex swaps preserve quantities, sideboard and unknown gaps', () => {
  assert.equal(preservesRecommendationDependencies(lines,lines.map(l=>l.cardName==='Cordelia, Aurous Kaiser'?{...l,quantity:l.quantity-1}:l),catalog),false);
  assert.equal(preservesRecommendationDependencies(lines,replace(lines,'Engulf','Frozen Dismissal'),catalog),true);
  assert.equal(preservesRecommendationDependencies(lines,[...lines,line('Unknown')],catalog),false);
  assert.equal(preservesRecommendationDependencies(lines,[...lines,line('Unknown','sideboard')],catalog),true);
});
test('new recursion requires real resources; optional bonuses do not block base effects', () => {
  assert.equal(preservesRecommendationDependencies([], [line('Primeval Ritual')],catalog),false);
  assert.equal(preservesRecommendationDependencies([], [line('Lost Wisdom')],catalog),false);
  assert.equal(preservesRecommendationDependencies([], [line('Lost Wisdom'),line('Neos Sight')],catalog),true);
  assert.equal(preservesRecommendationDependencies([], [line('Neos Sight')],catalog),true);
});
function peers(): DeckBuilderRow[] {
  return Array.from({length:12},(_,i)=>({deckId:String(i),spiritName:'Spirit of Water',main:new Map(Object.entries(fixture.main)),material:new Map(Object.entries(fixture.material)),sideboard:new Map(),winRate:0.5})) as DeckBuilderRow[];
}
test('ubiquitous core cards survive no with/without lift; no invented performance score', () => {
  const result = buildTournamentSuggestedDeck(peers(),'Spirit of Water',new Map(),new Set(),false,catalog,new Map(),new Map());
  for (const name of ['Hub of Innovation','Epicurean Institute','Blade of Creation','Cordelia, Aurous Kaiser']) {
    const card = [...result.main,...result.suggestions].find(c=>c.cardName===name);
    assert.ok(card,name); assert.equal(card.adjustedLift,null);
    assert.ok(['observed-core','identity-staple'].includes(card.reason));
  }
  const rejected = buildTournamentSuggestedDeck(peers(),'Spirit of Water',new Map(),new Set(['Blade of Creation']),false,catalog,new Map(),new Map());
  assert.ok(![...rejected.main,...rejected.suggestions].some(c=>c.cardName==='Blade of Creation'));
  const sparse = buildTournamentSuggestedDeck(peers().slice(0,5),'Spirit of Water',new Map(),new Set(),false,catalog,new Map(),new Map());
  assert.ok(![...sparse.main,...sparse.suggestions].some(c=>c.reason==='observed-core'));
});
test('report alternatives protect core and acceptance rechecks current dependencies', () => {
  const deck = workspace();
  const reference = {...peers()[0], similarity:0.9,eventDate:'2026-11-10',main:new Map(Object.entries(fixture.main) as [string,number][])};
  reference.main.delete('Cordelia, Aurous Kaiser'); reference.main.delete('Engulf'); reference.main.set('Frozen Dismissal',4);
  const suggestions = suggestReportSwaps(deck,[reference],catalog,'alternatives',new Set(),'');
  assert.ok(suggestions.some(s=>s.cut==='Engulf' && s.add==='Frozen Dismissal'));
  assert.ok(!suggestions.some(s=>s.cut==='Cordelia, Aurous Kaiser'));
  let writes=0; const storage={setItem(){writes++;}};
  const swap={cut:'Cordelia, Aurous Kaiser',add:'Frozen Dismissal',referenceId:'x',reason:'',gain:0};
  assert.throws(()=>persistReportSwap(storage,deck,swap,catalog),/no longer valid/);assert.equal(writes,0);
  const next=persistReportSwap(storage,deck,{...swap,cut:'Engulf'},catalog);
  assert.equal(writes,1);assert.equal(next.main.reduce((s,l)=>s+l.quantity,0),60);
  assert.deepEqual(next.sideboard,deck.sideboard); assert.equal(deck.main.find(l=>l.name==='Engulf')?.quantity,3);
});

test('covered same-resource substitutions preserve support without claiming equal output', () => {
  const before=[line('Winbless Forecaster'),line('Careful Study')];
  assert.equal(preservesRecommendationDependencies(before,replace(before,'Careful Study','Peer into Mana'),catalog),true);
  assert.equal(preservesRecommendationDependencies(before,replace(before,'Careful Study','Engulf'),catalog),false);
});

test('Material Wind identity is not a recoverable Main-deck target', () => {
  const after=[line('Primeval Ritual'),line('Dungeon Guide'),line('Spirit of Wind','material')];
  assert.equal(preservesRecommendationDependencies([],after,catalog),false);
  assert.equal(preservesRecommendationDependencies([],[...after,line('Channel the Wind')],catalog),true);
});
test('a full imported list still gets omitted core suggestions; sideboard sightings do not qualify', () => {
  const locks = new Map(lines.filter(l=>l.section!=='sideboard').map(l=>[l.cardName,l.quantity]));
  const sections = new Map(lines.filter(l=>l.section!=='sideboard').map(l=>[l.cardName,l.section]));
  locks.delete('Cordelia, Aurous Kaiser'); locks.set('Frozen Dismissal',2); sections.set('Frozen Dismissal','main');
  const result=buildTournamentSuggestedDeck(peers(),'Spirit of Water',locks,new Set(),false,catalog,new Map(),sections);
  assert.equal(result.main.reduce((sum,c)=>sum+c.quantity,0),60);
  assert.ok(result.suggestions.some(c=>c.cardName==='Cordelia, Aurous Kaiser' && c.adjustedLift===null));
  const onlySide=peers().map(row=>({...row,main:new Map([...row.main].filter(([name])=>name!=='Cordelia, Aurous Kaiser')),sideboard:new Map([['Cordelia, Aurous Kaiser',2]])}));
  const noCore=buildTournamentSuggestedDeck(onlySide,'Spirit of Water',locks,new Set(),false,catalog,new Map(),sections);
  assert.ok(!noCore.suggestions.some(c=>c.cardName==='Cordelia, Aurous Kaiser' && c.reason==='observed-core'));
});
