import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archetypeReport, cohortDeckDrawForecast, computeRaiDrawReport, computeTonorisDrawReport, cardAccess, type Card, type DeckCardIndexData } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = (name: string) => {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
  const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({name, quantity}));
  return {main: lines(f.main), material: lines(f.material)};
};
for (const name of ['rai-fire-draw', 'tonoris-water']) test(`${name}: all five checkpoints match existing paid models and access stays bounded`, () => {
  const deck = fixture(name), forecast = cohortDeckDrawForecast(deck, catalog)!;
  const rai = computeRaiDrawReport(deck, catalog);
  const gains = Array.from({length:5}, () => new Map<string, number>());
  const tonoris = name === 'tonoris-water' ? computeTonorisDrawReport(deck, catalog, 1024, state => {
    for (const card of state.seenNames) if (!state.naturalSeenNames.includes(card)) gains[state.turn-1].set(card,(gains[state.turn-1].get(card) ?? 0)+1/1024);
  }) : null;
  assert.deepEqual(forecast.map(p => p.turn), [1,2,3,4,5]);
  for (const [i,p] of forecast.entries()) {
    assert.deepEqual(p.seen, rai?.status === 'ready' ? rai.points[i].seenRange : tonoris!.points[i].seen);
    for (const line of deck.main) {
      const v=p.cards.get(line.name)!;
      const natural=cardAccess(60,line.quantity,7+i).access;
      const gain=rai?.status === 'ready' ? rai.points[i].extraAccess.get(line.name) ?? 0 : gains[i].get(line.name) ?? 0;
      assert.equal(v.modeled,Math.min(1,natural+gain));
      assert.ok(v.modeled>=v.natural && v.modeled<=1);
    }
  }
  assert.deepEqual(cohortDeckDrawForecast({...deck,main:[...deck.main].reverse()},catalog),forecast);
});
test('cohort preserves sighting weighting, excludes unsupported and missing lists, and retains absent-card zero', () => {
  const deck=fixture('tonoris-water');
  const cardNames=[...new Set([...deck.main,...deck.material].map(l=>l.name))];
  const encode=(lines: typeof deck.main) => lines.map(l=>[cardNames.indexOf(l.name),l.quantity] as [number,number]);
  const base={main:encode(deck.main),material:encode(deck.material),sideboard:[]};
  const other={...base,main:encode(deck.main.filter(l=>l.name!=='Neos Sight'))};
  const partition: DeckCardIndexData={generatedAt:'',cardNames,decks:[{...base,deckId:'a'},{...base,deckId:'b'},{...other,deckId:'c'},{...base,material:[],deckId:'unsupported'}]};
  const report=archetypeReport(['a','b','c','unsupported'],[partition,partition],catalog);
  assert.equal(report.forecast.supported,3); assert.equal(report.forecast.total,4);
  const single=cohortDeckDrawForecast(deck,catalog)!;
  const neos=report.cards.find(c=>c.name==='Neos Sight')!;
  for (const [i,p] of neos.forecast.entries()) assert.equal(p.mean,single[i].cards.get('Neos Sight')!.modeled*2/3);
  const missing=new Map(catalog); missing.delete('Neos Sight');
  assert.equal(cohortDeckDrawForecast(deck,missing),null);
  assert.equal(cohortDeckDrawForecast({main:[],material:[]},catalog),null);
});
test('small libraries cap every checkpoint and first-copy sources do not self-enable', () => {
  const fixtureDeck=fixture('tonoris-water');
  const deck={...fixtureDeck,main:[{name:'Hub of Innovation',quantity:2}]};
  const forecast=cohortDeckDrawForecast(deck,catalog)!;
  for(const point of forecast){assert.equal(point.cards.get('Hub of Innovation')!.modeled,1);assert.equal(point.seen.high,2);}
  const sourceDeck={...fixtureDeck,main:[{name:'Hub of Innovation',quantity:1},{name:'Frostbind',quantity:59}]};
  const sourceForecast=cohortDeckDrawForecast(sourceDeck,catalog)!;
  for(const point of sourceForecast) assert.equal(point.cards.get('Hub of Innovation')!.modeled,point.cards.get('Hub of Innovation')!.natural);
});
