import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { BroadcastEventMaps, BroadcastTimelines } from '@gatcg/shared';
import { groupTimelineResults } from '../src/features/timelines/timelineResultGroups';
const read = (path: string) => JSON.parse(readFileSync(new URL(`../../data/${path}`, import.meta.url),'utf8'));
const data: BroadcastTimelines = read('broadcast-timelines.json');
const maps: BroadcastEventMaps = read('broadcast-events.json');
test('default grouped results retain every recap and merge Worlds stages',()=>{
 const groups=groupTimelineResults(data.matches,maps.events);
 assert.equal(groups.length,new Set(data.matches.map(m=>m.eventId ?? m.event)).size);
 assert.deepEqual(groups.flatMap(g=>g.matches.map(m=>m.id)).sort(),data.matches.map(m=>m.id).sort());
 assert.equal(groups.find(g=>g.key==='60488')?.matches.length,18);
 assert.ok(groups[0].event!.date >= groups[1].event!.date);
 const worlds=groups.find(g=>g.key==='60488')!;
 assert.match(worlds.matches[0].round,/^Round 1/);
 assert.match(worlds.matches.at(-1)!.round,/Grand Finals/);
});
test('results remain available without tournament-map data and honor event filters',()=>{
 assert.deepEqual(groupTimelineResults(data.matches,[]).flatMap(g=>g.matches.map(m=>m.id)).sort(),data.matches.map(m=>m.id).sort());
 assert.equal(groupTimelineResults(data.matches,[],'60488')[0].matches.length,18);
 assert.equal(groupTimelineResults(data.matches,maps.events,'Worlds 2026 Swiss Stage')[0].matches.length,18);
 assert.deepEqual(groupTimelineResults([],maps.events),[]);
 assert.deepEqual(groupTimelineResults(data.matches,maps.events,'not-an-event'),[]);
});
