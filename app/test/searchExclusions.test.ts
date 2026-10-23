import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesFilterValues, parseFilterQuery, formatFilterQuery, toggleFilterValue, type Card } from '@gatcg/shared';
import { emptyFilterState, filterCards, matchesEdition } from '../src/features/cards/filters';
import { emptyDeckContentFilters, deckMatchesContentFilters, deckContentRelevance } from '../src/features/decks/deckContentFilters';
import { emptyCatalogFilters, filterCatalog } from '../src/components/deck-editor/catalogFilters';
const make = (name: string, subtypes: string[]) => ({name, subtypes, classes:[], types:['ACTION'], elements:['WIND'], editions:[{rarity:1,set:{prefix:'DOA'}},{rarity:3,set:{prefix:'MRC'}}]}) as Card;
const harmony = make('Harmony example',['HARMONY']), melody = make('Melody example',['MELODY']), both = make('Both',['HARMONY','MELODY']);
test('exclusions veto multi-subtype matches and inclusion remains any-of', () => {
 const filters = {...emptyFilterState(),subtypes:new Set(['MELODY','-HARMONY'])};
 assert.deepEqual(filterCards([harmony,melody,both],filters).map(c=>c.name),[melody.name]);
 assert.equal(filterCards([harmony,melody,both],{...emptyFilterState(),subtypes:new Set(['-HARMONY'])}).length,1);
 assert.equal(matchesFilterValues(['WIND','FIRE'],new Set(['WIND','-FIRE']),true),false);
 assert.equal(matchesFilterValues([],new Set(['-HARMONY'])),true);
});
test('picker polarity switches atomically and clears', () => {
 assert.deepEqual([...toggleFilterValue(new Set(['HARMONY']),'-HARMONY')],['-HARMONY']);
 assert.equal(toggleFilterValue(new Set(['-HARMONY']),'-HARMONY').size,0);
});
test('query round trip, phrases, errors and conflicts', () => {
 const parsed=parseFilterQuery('draw a card subtype:melody -subtype:harmony');
 assert.equal(parsed.text,'draw a card');
 assert.deepEqual([...parsed.facets.subtypes!],['MELODY','-HARMONY']);
 assert.deepEqual(parseFilterQuery(formatFilterQuery(parsed.text,parsed.facets)),parsed);
 assert.equal(parseFilterQuery('subtype:"spirit beast"').facets.subtypes?.has('SPIRIT BEAST'),true);
 for(const q of ['subtype:','subtype:"unfinished','wat:harmony','subtype:harmony -subtype:harmony']) assert.ok(parseFilterQuery(q).error,q);
});
test('deck exclusions veto whole deck and do not dilute relevance', () => {
 const cards = new Map([harmony,melody].map(c=>[c.name,c]));
 const lines=[{name:harmony.name,quantity:4},{name:melody.name,quantity:4}];
 assert.equal(deckMatchesContentFilters(lines,{...emptyDeckContentFilters(),subtypes:new Set(['-HARMONY'])},cards),false);
 assert.equal(deckMatchesContentFilters(lines,{...emptyDeckContentFilters(),cards:[`-${harmony.name}`]},cards),false);
 const base={...emptyDeckContentFilters(),types:new Set(['ACTION'])};
 assert.equal(deckContentRelevance(lines,base,cards),deckContentRelevance(lines,{...base,subtypes:new Set(['-BEAST'])},cards));
});
test('printing exclusions retain other eligible printings and combine on one edition', () => {
 const filters={...emptyFilterState(),sets:new Set(['-MRC']),rarities:new Set(['3'])};
 assert.equal(filterCards([harmony],filters).length,0);
 assert.equal(filterCards([harmony],{...filters,rarities:new Set()}).length,1);
 assert.equal(matchesEdition(harmony.editions[1],{...filters,rarities:new Set()}),false);
});
test('Builder uses the same matching and syntax', () => {
 assert.deepEqual(filterCatalog([harmony,melody,both],'',{...emptyCatalogFilters(),subtype:'MELODY|-HARMONY'}).map(c=>c.name),[melody.name]);
 assert.deepEqual(filterCatalog([harmony,melody,both],'-subtype:harmony',emptyCatalogFilters()).map(c=>c.name),[melody.name]);
});
test('literal minus in community tag names is distinct from negation', () => {
 const positive = parseFilterQuery('tag:"-1 Influence"');
 const negative = parseFilterQuery('-tag:"-1 Influence"');
 assert.equal(matchesFilterValues(['-1 influence'], positive.facets.tags!),true);
 assert.equal(matchesFilterValues(['-1 influence'], negative.facets.tags!),false);
 assert.equal(matchesFilterValues(['bird'],positive.facets.tags!),false);
 assert.deepEqual(parseFilterQuery(formatFilterQuery('',positive.facets)),positive);
});
