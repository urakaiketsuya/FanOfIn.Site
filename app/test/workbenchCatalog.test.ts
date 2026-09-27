import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { emptyCatalogFilters, filterCatalog } from "../src/components/deck-editor/catalogFilters";
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
