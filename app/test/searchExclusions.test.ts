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

test('card text requires every term, with quoted phrases and facets preserved', () => {
 const damage = {...make('Level strike', ['MELODY']), effect: 'Deal damage equal to your champion’s LV.'};
 const levelOnly = {...make('Level support', []), effect: 'Your champion gets +1 LV.'};
 const damageOnly = {...make('Strike', []), effect: 'Deal 2 damage.'};
 const pool = [damage, levelOnly, damageOnly];
 for (const name of ['LV Damage', 'damage lv', '  LV   DAMAGE  ', '"LV" "Damage"', '"Deal damage" LV', 'LV Damage subtype:melody']) {
   assert.deepEqual(filterCards(pool, {...emptyFilterState(), name}).map(c => c.name), [damage.name], name);
 }
 assert.equal(filterCards(pool, {...emptyFilterState(), name: '"LV Damage"'}).length, 0);
 assert.equal(filterCards(pool, {...emptyFilterState(), name: 'LV Damage -subtype:melody'}).length, 0);
 assert.deepEqual(filterCatalog(pool, 'LV Damage', emptyCatalogFilters()).map(c => c.name), [damage.name]);
 assert.equal(filterCards(pool, {...emptyFilterState(), name: '   '}).length, 3);
 assert.deepEqual(filterCards(pool, {...emptyFilterState(), name: 'strike LV'}).map(c => c.name), [damage.name]);
 const reverse = {...levelOnly, editions: [{...levelOnly.editions[0], other_orientations: [{name: 'Reverse', effect: 'Deal damage.'}]}]} as Card;
 assert.deepEqual(filterCards([reverse], {...emptyFilterState(), name: 'LV damage'}), [reverse]);
});

test('strict syntax rejects incomplete and unsupported expressions atomically', () => {
 for (const query of ['"unfinished', 'name:"unfinished', 'name:', '-name:""', 'name:"a"tail', 'na"me"', 'draw OR damage', '(draw)', 'power>=3', 'name:/draw/', '-', '!', 'type:action wat:x', 'constructor:x', 'any:x', 't:action -type:action']) {
  const parsed = parseFilterQuery(query);
  assert.ok(parsed.error, query);
  assert.deepEqual(parsed.facets, {}, query);
  assert.deepEqual(parsed.clauses, [], query);
 }
 for (const query of ['"OR"', 'effect:"(draw)"', 'name:"a:b"', '"power>=3"']) assert.equal(parseFilterQuery(query).error, undefined, query);
});

test('name/effect fields, aliases, exact names and negation stay distinct', () => {
 const pool = [
  {...make('Draw', []), effect: 'Deal damage.'},
  {...make('Draw again', []), effect: 'Draw a card.'},
  {...make('Other', []), effect: 'Draw a card.'},
 ];
 const results = (name: string) => filterCards(pool, {...emptyFilterState(), name}).map(card => card.name);
 assert.deepEqual(results('name:draw'), ['Draw', 'Draw again']);
 assert.deepEqual(results('n:draw -o:damage'), ['Draw again']);
 for (const field of ['effect', 'o', 'oracle', 'text']) assert.deepEqual(results(`${field}:"draw a card"`), ['Draw again', 'Other']);
 assert.deepEqual(results('!"DRAW"'), ['Draw']);
 assert.deepEqual(results('-draw'), []);
 assert.deepEqual(results('-name:draw'), ['Other']);
 assert.deepEqual(results('n:draw effect:draw'), ['Draw again']);
 assert.deepEqual(results('draw'), ['Draw', 'Draw again', 'Other']);
 assert.deepEqual(filterCatalog(pool, 'n:draw -effect:damage', emptyCatalogFilters()), [pool[1]]);
 const parsed = parseFilterQuery('n:"Draw again" -o:damage t:action -s:mrc');
 assert.deepEqual(parseFilterQuery(formatFilterQuery(parsed.text, parsed.facets)), parsed);
});

test('aliases preserve facet matching and artist restrictions share one printing', () => {
 const card = {...harmony, editions: [
  {...harmony.editions[0], illustrator: 'First Artist'},
  {...harmony.editions[1], illustrator: 'Second Artist'},
 ]};
 for (const [alias, canonical] of [['t', 'type'], ['s', 'set'], ['e', 'set'], ['r', 'rarity']]) {
  const value = alias === 't' ? 'action' : alias === 'r' ? '1' : 'doa';
  assert.deepEqual(parseFilterQuery(`${alias}:${value}`), parseFilterQuery(`${canonical}:${value}`));
 }
 assert.equal(filterCards([card], {...emptyFilterState(), name: 'a:"First Artist" s:doa r:1'}).length, 1);
 assert.equal(filterCards([card], {...emptyFilterState(), name: 'artist:first s:mrc'}).length, 0);
 assert.equal(filterCards([card], {...emptyFilterState(), name: '-a:first s:mrc'}).length, 1);
 assert.equal(filterCards([card], {...emptyFilterState(), name: 't:action t:ally'}).length, 1);
});

test('quoted escapes round trip and fields include reverse faces', () => {
 const card = {...harmony, name: 'A "quoted" name', editions: [{...harmony.editions[0], other_orientations: [{name: 'Reverse', effect: 'Draw a card.'}]}]} as Card;
 assert.equal(filterCards([card], {...emptyFilterState(), name: 'name:"A \\"quoted\\" name"'}).length, 1);
 assert.equal(filterCards([card], {...emptyFilterState(), name: 'n:reverse o:"draw a card"'}).length, 1);
 assert.equal(filterCards([card], {...emptyFilterState(), name: '-n:reverse'}).length, 0);
 const facets = {tags: new Set(['a "quote"', 'a\\b', 'or'])};
 assert.deepEqual(parseFilterQuery(formatFilterQuery('', facets)).facets.tags, facets.tags);
});
