import test from 'node:test';
import assert from 'node:assert/strict';
import { competitionMatches, recordPercent, seasonRecordedReports, regionalFieldReport, type OmnidexEventSummary, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckPopularityEntry, type OmnidexPairingsResponse } from '@gatcg/shared';
const event = (id: number, month: string, extra = {}) => ({ id, date: `${month}-15`, status: 'complete', seasonId: 1, format: 'standard', setting: 'physical', hostCountry: 'US', ...extra }) as OmnidexEventSummary;
const entry = (eventId: number, player: number) => ({ deckId: `${eventId}:${player}`, eventId, player, championName: 'Lorraine' }) as DeckPopularityEntry;
const taxonomy = { clusters: [{ id: 'b', name: 'Build B', championName: 'Lorraine', deckIds: ['1:1'] }] } as ArchetypeTaxonomyData;
const lists: DeckCardIndexData = { generatedAt: '', cardNames: ['Card A', 'Champion', 'Sideboard only'], decks: [{ deckId: '1:1', main: [[0, 4]], material: [[1, 1]], sideboard: [[2, 1]] }, { deckId: '2:1', main: [[1, 1]], material: [[1, 1]], sideboard: [[0, 4]] }] };
test('season deduplication, unclassified share, once-per-list adoption and no sideboard', () => {
 const [r] = seasonRecordedReports([event(1,'2026-01'),event(1,'2026-01'),event(2,'2026-02')], [entry(1,1),entry(1,1),entry(2,1),entry(2,2)], lists, taxonomy);
 assert.deepEqual(r.months.map(m=>[m.decks,m.lists]),[[1,1],[2,1]]);
 assert.deepEqual(r.builds.find(b=>b.name==='Unclassified')!.values,[0,100]);
 assert.deepEqual(r.cards[0].rows.find(c=>c.name==='Card A')!.values,[100,0]);
 assert.ok(!r.cards[0].rows.some(c=>c.name==='Sideboard only'));
});
test('missing month/list preserves unavailable; malformed and ambiguous membership counted', () => {
 const t = { clusters: [...taxonomy.clusters, { ...taxonomy.clusters[0], id: 'c' }] } as ArchetypeTaxonomyData;
 const [r] = seasonRecordedReports([event(1,'2026-01'),event(2,'2026-02')], [entry(1,1)], lists,t);
 assert.deepEqual(r.builds[0].values,[100,null]);assert.equal(r.builds[0].name,'Ambiguous assignment');assert.equal(r.cards[0].rows.length,0);
 const invalid = {...lists,decks:[{...lists.decks[0],main:[[99,2]] as [number,number][]}]};
 assert.equal(seasonRecordedReports([event(1,'2026-01')],[entry(1,1)],invalid,t)[0].months[0].lists,0);
});
test('match records exclude byes, incomplete, conflicting and repeated pairings; ties stay denominator', () => {
 const pair=(id:number,a:string,b?:string)=>({id,status:'complete',pairing:[{id:1,status:a},...(b?[{id:2,status:b}]:[])]});
 const rounds=[{pairings:[pair(1,'winner','loser'),pair(1,'winner','loser'),pair(2,'winner'),pair(3,'winner','winner'),pair(4,'tied','tied'),{...pair(5,'winner','loser'),status:'active'}]}] as OmnidexPairingsResponse[];
 assert.deepEqual(competitionMatches(rounds),[{a:1,b:2,winner:1},{a:1,b:2,winner:null}]);
 assert.equal(recordPercent({wins:1,losses:0,ties:1}),50); assert.equal(recordPercent({wins:0,losses:0,ties:0}),null);
});
test('regional comparison excludes local from broader and missing fields from denominator', () => {
 const f=(name:string,count:number)=>({entrants:count,champions:[{name,count}]});
 const report=regionalFieldReport([event(1,'2026-02',{fieldComposition:f('A',10)}),event(2,'2026-02',{hostCountry:'CA',fieldComposition:f('B',30)}),event(3,'2026-02'),event(4,'2026-02',{setting:'online',fieldComposition:f('A',90)})],e=>e.hostCountry==='US')!;
 assert.deepEqual(report.formats[0].rows[0].values,[100,0]); assert.equal(report.formats[0].scopes[0].events,2);assert.equal(report.formats[0].scopes[0].complete,1);
});
