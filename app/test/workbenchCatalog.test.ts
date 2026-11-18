import { searchSpoilers } from "../src/lib/spoilerCatalog";
import { filterCardNames, searchCardPool, searchCardPrintings, cardQueryError } from "../src/features/cards/filters";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { emptyCatalogFilters, filterCatalog, sortCatalogNames } from "../src/components/deck-editor/catalogFilters";
const card = (name: string, changes: Partial<Card> = {}) => ({name, uuid:name, effect:"", elements:["NORM"], types:["ALLY"], subtypes:[], classes:[], editions:[], cost_memory:null, cost_reserve:2, ...changes}) as Card;
const cards = [card("Singer", { effect:"Recover 3. Draw a card.",elements:["WATER"],subtypes:["MELODY"] }), card("Guard",{elements:["FIRE"],cost_reserve:4}),card("Token",{cost_memory:0,cost_reserve:null,types:["REGALIA"]})];
test("manual catalog searches rules text and combines subtype, element and cost filters",()=>{
 const filters={...emptyCatalogFilters(),subtype:"MELODY",element:"WATER",maxCost:"2"};
 assert.deepEqual(filterCatalog(cards,"recover",filters).map(c=>c.name),["Singer"]);
 assert.equal(filterCatalog(cards,"recover",{...filters,element:"FIRE"}).length,0);
 assert.deepEqual(filterCatalog(cards,"",{...emptyCatalogFilters(),costType:"memory",maxCost:"0"}).map(c=>c.name),["Token"]);
});
test("ownership and available elements are opt-in and never silently restrict all cards",()=>{
 assert.equal(filterCatalog(cards,"",emptyCatalogFilters(),undefined,new Set(["WATER"])).length,3);
 assert.deepEqual(filterCatalog(cards,"",{...emptyCatalogFilters(),availableElements:true},undefined,new Set(["WATER"])).map(c=>c.name),["Singer","Token"]);
 assert.deepEqual(filterCatalog(cards,"",{...emptyCatalogFilters(),ownedOnly:true},new Map([["Guard",2]])).map(c=>c.name),["Guard"]);
 assert.equal(filterCatalog(cards,"",{...emptyCatalogFilters(),ownedOnly:true}).length,0);
});

test("catalog sorting handles zero cost, unknown cards and deterministic ties without mutating input",()=>{
 const catalog = new Map(cards.map(c=>[c.name,c]));
 const names = ["Unknown","Guard","Token","Singer"];
 assert.deepEqual(sortCatalogNames(names,catalog,"cost"),["Token","Singer","Guard","Unknown"]);
 assert.deepEqual(sortCatalogNames(names,catalog,"cost-desc"),["Guard","Singer","Token","Unknown"]);
 assert.deepEqual(sortCatalogNames(names,catalog,"name-desc"),["Unknown","Token","Singer","Guard"]);
 assert.deepEqual(names,["Unknown","Guard","Token","Singer"]);
});

test("named result pools share scoped, Boolean and numeric catalog search without changing order", () => {
 const catalog = new Map(cards.map(c => [c.name, c]));
 const names = ["Unknown", "Guard", "Singer", "Token"];
 assert.deepEqual(filterCardNames(names, catalog, '(o:recover OR n:guard) reserve<=3'), ["Singer"]);
 assert.deepEqual(filterCardNames(names, catalog, 't:ally AND reserve>=2'), ["Guard", "Singer"]);
 assert.deepEqual(filterCardNames(names, catalog, 'n:unknown OR memory=0'), ["Unknown", "Token"]);
 assert.deepEqual(filterCardNames(names, catalog, 'reserve>='), []);
 assert.deepEqual(filterCardNames(names, catalog, ''), names);
 assert.deepEqual(filterCardNames(names, catalog, 'n:singer OR n:absent'), ["Singer"]);
});

test("missing catalog records support name syntax without treating unknown metadata as false", () => {
 const names = ["Unknown Card", "Other"];
 const catalog = new Map<string, Card>();
 assert.deepEqual(filterCardNames(names, catalog, '!"unknown card"'), ["Unknown Card"]);
 assert.deepEqual(filterCardNames(names, catalog, 'NOT n:other'), ["Unknown Card"]);
 for (const query of ['NOT power>2', '-t:ally', '-o:draw', 'NOT (n:other OR power>2)', 'n:unknown AND reserve<=3']) {
   assert.deepEqual(filterCardNames(names, catalog, query), [], query);
 }
 assert.deepEqual(filterCardNames(names, catalog, 'n:unknown OR power>2'), ["Unknown Card"]);
 assert.deepEqual(filterCardNames(names, catalog, 'NOT (n:other AND power>2)'), ["Unknown Card"]);
});

test("named search uses reverse faces and preserves printing constraints", () => {
 const dual = card("Front", { editions: [
   { uuid: 'one', set: { prefix: 'DOA' }, rarity: 1, illustrator: 'Alice', other_orientations: [{ name: 'Reverse', effect: 'Recover 2.' }] },
   { uuid: 'two', set: { prefix: 'FTC' }, rarity: 2, illustrator: 'Bob' },
 ] as Card['editions'] });
 const catalog = new Map([[dual.name, dual]]);
 assert.deepEqual(filterCardNames(['Front'], catalog, 'n:reverse AND o:recover'), ['Front']);
 assert.deepEqual(filterCardNames(['Front'], catalog, 's:doa AND a:bob'), []);
 assert.deepEqual(filterCardNames(['Front'], catalog, 's:ftc AND a:bob'), ['Front']);
});

test("secondary pickers preserve eligible row identity, ordering and duplicate quantities", () => {
 const pool = [{ name: 'Guard', quantity: 2 }, { name: 'Singer', quantity: 1 }, { name: 'Guard', quantity: 3 }];
 assert.deepEqual(searchCardPool(pool, cards, 'reserve>=3 OR o:recover'), pool);
 assert.equal(searchCardPool(pool, cards, 'reserve>3')[1], pool[2]);
 assert.deepEqual(searchCardPool(pool, cards, 'memory=0'), []);
 assert.deepEqual(searchCardPool(pool, cards, '(n:guard OR)'), []);
 assert.deepEqual(searchCardPool([{ name: 'Unknown' }], [], 'NOT power>0'), []);
 assert.deepEqual(searchCardPool([{ name: 'Unknown' }], [], 'n:unknown'), [{ name: 'Unknown' }]);
});

test("compact queries report unsupported metadata even under Boolean negation", () => {
 for (const query of ['tag:forest', '-tag:forest', 'NOT (tag:forest OR n:guard)']) {
  assert.match(cardQueryError(query)!, /Tag search/);
  assert.equal(cardQueryError(query, true), undefined);
  assert.deepEqual(searchCardPool(cards, cards, query), []);
 }
 assert.match(cardQueryError('power>=')!, /finite numeric/);
 assert.equal(cardQueryError('n:guard OR reserve>=2'), undefined);
});

test("printing galleries keep their printing scope and all reverse-face text", () => {
 const dual = card('Front', { editions: [
  { uuid: 'one', set: { prefix: 'DOA' }, rarity: 1, illustrator: 'Alice', other_orientations: [{ name: 'Reverse', effect: 'Recover 2.' }] },
  { uuid: 'two', set: { prefix: 'FTC' }, rarity: 2, illustrator: 'Bob' },
 ] as Card['editions'] });
 assert.deepEqual(searchCardPrintings(dual, 'n:reverse AND a:bob').map(e => e.uuid), ['two']);
 assert.deepEqual(searchCardPrintings(dual, 's:doa AND a:bob'), []);
 assert.deepEqual(searchCardPrintings(dual, 'r:2 OR a:alice'), dual.editions);
 assert.deepEqual(searchCardPrintings(dual, 'NOT tag:forest'), []);
 const lookup = { cards: new Map([['Front', new Set(['Forest'])]]), editions: new Map([['one', new Set(['Forest'])]]) };
 assert.deepEqual(searchCardPrintings(dual, 'tag:forest AND a:alice', lookup).map(e => e.uuid), ['one']);
 // Tag predicates remain card-level, matching the established browser semantics.
 assert.deepEqual(searchCardPrintings(dual, 'tag:forest AND a:bob', lookup).map(e => e.uuid), ['two']);
});

test("spoiler search preserves broad bare text and adds strict GA fields", () => {
 const all = searchSpoilers('');
 const expected = all.filter(card => [card.name, card.effect, ...card.classes, ...card.types, ...card.subtypes, ...card.elements].join(' ').toLowerCase().includes('water'));
 assert.deepEqual(searchSpoilers('water'), expected);
 assert.deepEqual(searchSpoilers('element:water'), all.filter(card => card.elements.includes('WATER')));
 assert.deepEqual(searchSpoilers('power>='), []);
 assert.ok(searchSpoilers('power>=1').every(card => card.power != null && card.power >= 1));
});


test("deck edit queries compose with printing, ownership, element and maximum cost controls", () => {
 const printed = card('Singer', { elements: ['WATER'], cost_reserve: 2, effect: 'Recover 2.', editions: [
  { uuid: 'one', set: { prefix: 'DOA' }, rarity: 1, illustrator: 'Alice' },
  { uuid: 'two', set: { prefix: 'FTC' }, rarity: 2, illustrator: 'Bob' },
 ] as Card['editions'] });
 const filters = { ...emptyCatalogFilters(), edition: 'FTC', maxCost: '2', ownedOnly: true, availableElements: true };
 const owned = new Map([['Singer', 1]]), elements = new Set(['WATER']);
 const query = '(n:singer OR n:guard) reserve<=2 a:bob';
 assert.deepEqual(filterCatalog([printed, ...cards.slice(1)], query, filters, owned, elements), [printed]);
 assert.deepEqual(filterCatalog([printed], query, { ...filters, edition: 'DOA' }, owned, elements), []);
 assert.deepEqual(filterCatalog([printed], query, filters, new Map(), elements), []);
 assert.deepEqual(filterCatalog([printed], query, filters, owned, new Set(['FIRE'])), []);
 assert.deepEqual(filterCatalog([printed], query, { ...filters, maxCost: '1' }, owned, elements), []);
});
