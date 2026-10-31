import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildBroadcastEventMap, type BroadcastEventMaps, type BroadcastEventSource, type BroadcastTimelines } from '@gatcg/shared';
import { tournamentWindow } from '../src/features/timelines/tournamentLayout';
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8'));
const maps: BroadcastEventMaps = read('broadcast-events.json');
const recaps: BroadcastTimelines = read('broadcast-timelines.json');

test('all recaps remain accessible and event/stage/round pairing joins are unique', () => {
  const ids = new Set<string>();
  for (const event of maps.events) {
    const source = read(`omnidex/events/${event.id}.json`);
    assert.deepEqual(event, buildBroadcastEventMap(source, recaps.matches.filter(m => m.eventId === event.id)));
    for (const stage of event.stages) for (const match of stage.matches) {
      if (match.recapId) { assert.ok(!ids.has(match.recapId)); ids.add(match.recapId); }
      if (match.next) {
        assert.equal(stage.type, 'single-elimination');
        const next = stage.matches.find(m => m.id === match.next)!;
        assert.ok(next && !next.bronze && !match.bronze);
        assert.equal(next.round, match.round + 1);
        assert.ok(next.players.some(p => p.id === match.winner));
      }
    }
    for (const id of event.unlinkedRecapIds) ids.add(id);
  }
  assert.deepEqual([...ids].sort(), recaps.matches.map(m => m.id).sort());
  assert.equal(read('manifest.json')['broadcast-events'], maps.generatedAt);
});
test('Worlds full top eight connects seven matches; bronze is separate; official and broadcast scores stay distinct', () => {
  const event = maps.events.find(e => e.id === 60488)!;
  assert.ok(event.aliases.includes('Worlds 2026 Swiss Stage'));
  const stage = event.stages.find(s => s.type === 'single-elimination')!;
  const window = tournamentWindow(stage, 1, 0);
  assert.equal(window.matches.length, 7);
  assert.equal(window.matches.filter(m => m.next).length, 6);
  assert.equal(window.matches.some(m => m.bronze), false);
  const final = window.matches.find(m => m.round === 3)!;
  assert.deepEqual(final.players.map(p => p.score).sort(), [1, 2]);
  assert.match(recaps.matches.find(m => m.id === final.recapId)!.result, /3-2/);
});
test('uncertain identities and ambiguous rematches do not attach a recap', () => {
  const source: BroadcastEventSource = read('omnidex/events/60488.json');
  const recap = recaps.matches.find(m => m.eventId === 60488 && m.round.includes('Grand Finals'))!;
  const uncertain = structuredClone(recap); uncertain.players[0].eventDecklist = 'unverified-identity';
  assert.deepEqual(buildBroadcastEventMap(source, [uncertain]).unlinkedRecapIds, [recap.id]);
  const copy = structuredClone(source);
  const final = copy.pairingsByRound.at(-1)!;
  final.pairings!.push({ ...final.pairings![0], id: 999 });
  assert.deepEqual(buildBroadcastEventMap(copy, [recap]).unlinkedRecapIds, [recap.id]);
});
test('large cuts expose bounded three-round sections rather than every entrant', () => {
  const matches = Array.from({length: 32}, (_, i) => ({id:`1:${i}`,round:1,label:'',bronze:false,players:[],next:`2:${Math.floor(i/2)}`}));
  matches.push(...Array.from({length:16},(_,i)=>({id:`2:${i}`,round:2,label:'',bronze:false,players:[],next:`3:${Math.floor(i/2)}`})), ...Array.from({length:8},(_,i)=>({id:`3:${i}`,round:3,label:'',bronze:false,players:[],next:''})));
  const window = tournamentWindow({id:2,type:'single-elimination',rounds:[1,2,3],matches},1,4);
  assert.equal(window.roots.length,8); assert.equal(window.matches.length,7);
  assert.ok(window.matches.some(m=>m.id==='3:4'));
});
