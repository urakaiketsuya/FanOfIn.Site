import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareRaiDrawReports, type Card } from '@gatcg/shared';
import { computeDeckAnalysisReport } from '../src/lib/deckAnalysisReport';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url),'utf8')).cards.map((card: Card) => [card.name,card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/rai-fire-draw.json', import.meta.url),'utf8'));
const lines = (section: Record<string,number>) => Object.entries(section).map(([name,quantity]) => ({name,quantity}));
const deck = {main:lines(fixture.main),material:lines(fixture.material)};
test('comparison agrees with standalone checkpoints and identical versions have zero deltas', () => {
 const comparison = compareRaiDrawReports(deck,deck,catalog)!;
 assert.equal(comparison.status,'ready');
 if (comparison.status !== 'ready') return;
 const report = computeDeckAnalysisReport(deck.main,deck.material,catalog);
 for (const point of comparison.points) {
  assert.deepEqual(point.before,point.after);
  assert.equal(point.medianDelta,0);
  assert.equal(point.before.hand,report.checkpoints.find(p=>p.turn===point.turn && p.order==='first')!.hand);
 }
 const reordered = {...deck,main:[...deck.main].reverse()};
 assert.deepEqual(compareRaiDrawReports(reordered,deck,catalog),comparison);
});
test('new conditional sources propagate without treating unsupported decks as zero', () => {
 const target = {...deck,main:deck.main.map(line=>line.name==='Fireball'?{...line,name:'Peer into Mana'}:line)};
 const result = compareRaiDrawReports(deck,target,catalog)!;
 assert.equal(result.status,'ready');
 if(result.status === 'ready') assert.deepEqual(result.sources.find(s=>s.name==='Peer into Mana'),{name:'Peer into Mana',before:0,after:4});
 assert.equal(compareRaiDrawReports({main:[],material:[]},{main:[],material:[]},catalog),null);
 assert.equal(compareRaiDrawReports(deck,{main:[],material:[]},catalog)?.status,'unsupported');
 const missing = new Map(catalog); missing.delete('Academy Guide');
 assert.equal(compareRaiDrawReports(deck,target,missing)?.status,'missing');
});
