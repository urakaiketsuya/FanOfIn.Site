import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { beatVideoLink } from '../src/features/timelines/matchVideoUrl';
import type { BroadcastTimelineBeat, BroadcastTimelines } from '@gatcg/shared';
const video = { id: 'g3NNFcNpw3k', kind: 'broadcast' as const, startSeconds: 18000 };
const beat: BroadcastTimelineBeat = { order: 1, actor: 'both', text: 'Play' };
test('beat links use absolute upload time, including zero and hour boundaries', () => {
  for (const [seconds, label] of [[0, '0:00'], [65, '1:05'], [3600, '1:00:00'], [42884, '11:54:44']] as const) {
    assert.deepEqual(beatVideoLink({ ...beat, timestamp: { videoId: video.id, seconds } }, video), { url: `https://www.youtube.com/watch?v=${video.id}&t=${seconds}s`, label });
  }
});
test('missing, invalid and different-upload timestamps do not produce links', () => {
  assert.equal(beatVideoLink(beat, video), undefined);
  for (const seconds of [-1, 1.5, NaN, Infinity]) assert.equal(beatVideoLink({ ...beat, timestamp: { videoId: video.id, seconds } }, video), undefined);
  const timed = { ...beat, timestamp: { videoId: video.id, seconds: 30 } };
  assert.equal(beatVideoLink(timed, undefined), undefined);
  assert.equal(beatVideoLink(timed, { ...video, id: 'VOlVotCfOU0' }), undefined);
});
test('all Osaka highlights have traceable timestamps bound to the reviewed upload', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const data: BroadcastTimelines = read('data/broadcast-timelines.json');
  const evidence = read('docs/broadcast-review/osaka-day1/beat-timestamps.json');
  let count = 0;
  for (const match of data.matches.filter(m => m.eventId === 67176)) for (const game of match.games) for (const b of game.beats) {
    const e = evidence.find((e: { matchId: string; gameNumber: number; order: number }) => e.matchId === match.id && e.gameNumber === game.gameNumber && e.order === b.order);
    assert.ok(e);
    assert.equal(e.text, b.text);
    assert.equal(b.timestamp?.seconds, Math.floor(e.source.seconds));
    assert.equal(b.timestamp?.videoId, 'g3NNFcNpw3k');
    assert.ok(b.timestamp!.seconds < 42898);
    assert.ok(beatVideoLink(b, match.video));
    count++;
  }
  assert.equal(count, 80);
});

test('archive backfill retains source excerpts and matches current highlights and uploads', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const data: BroadcastTimelines = read('data/broadcast-timelines.json');
  const evidence = read('docs/broadcast-review/archive-timestamps/beat-timestamps.json');
  const seen = new Set<string>();
  for (const e of evidence) {
    const key = `${e.matchId}/${e.gameNumber}/${e.order}`;
    assert.ok(!seen.has(key), `Duplicate evidence: ${key}`);
    seen.add(key);
    const match = data.matches.find(m => m.id === e.matchId)!;
    const b = match.games.find(g => g.gameNumber === e.gameNumber)!.beats.find(b => b.order === e.order)!;
    assert.equal(b.text, e.text, key);
    assert.deepEqual(b.timestamp, e.timestamp, key);
    assert.equal(b.timestamp!.videoId, match.video!.id, key);
    assert.ok(beatVideoLink(b, match.video), key);
    assert.match(e.sourceSha256, /^[a-f0-9]{64}$/);
    assert.equal(e.source.length, e.sourceRows[1] - e.sourceRows[0] + 1);
    for (const [i, segment] of e.source.entries()) {
      assert.equal(segment.row, e.sourceRows[0] + i);
      assert.equal(typeof segment.text, 'string');
    }
    const seconds = e.source[0].timestamp.split(':').reduce((n: number, v: string) => n * 60 + Number(v), 0);
    assert.equal(b.timestamp!.seconds, Math.floor(seconds), key);
    assert.ok(b.timestamp!.seconds >= (match.video!.startSeconds ?? 0), key);
  }
  assert.equal(seen.size, 1079);
  assert.equal(new Set(evidence.map((e: { matchId: string }) => e.matchId)).size, 204);
});

test('remaining timestamp queue covers every untimed highlight exactly once', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const data: BroadcastTimelines = read('data/broadcast-timelines.json');
  const remaining = read('docs/broadcast-review/archive-timestamps/remaining.json');
  const expected = data.matches.flatMap(m => m.games.flatMap(g => g.beats.filter(b => !b.timestamp).map(b => `${m.id}/${g.gameNumber}/${b.order}`)));
  const actual = remaining.flatMap((m: { matchId: string; beats: { gameNumber: number; order: number }[] }) => m.beats.map(b => `${m.matchId}/${b.gameNumber}/${b.order}`));
  assert.deepEqual(actual.sort(), expected.sort());
});

test('every remaining highlight has a documented source or game-assignment blocker', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const data: BroadcastTimelines = read('data/broadcast-timelines.json');
  const unresolved = read('docs/broadcast-review/archive-timestamps/unresolved.json');
  const expected = data.matches.flatMap(m => m.games.flatMap(g => g.beats.filter(b => !b.timestamp).map(b => `${m.id}/${g.gameNumber}/${b.order}`)));
  const actual = unresolved.map((e: { matchId: string; gameNumber: number; order: number; text: string; videoId: string; reason: string }) => {
    const match = data.matches.find(m => m.id === e.matchId)!;
    const beat = match.games.find(g => g.gameNumber === e.gameNumber)!.beats.find(b => b.order === e.order)!;
    assert.equal(beat.text, e.text);
    assert.equal(match.video!.id, e.videoId);
    assert.ok(e.reason.length > 0);
    return `${e.matchId}/${e.gameNumber}/${e.order}`;
  });
  assert.equal(actual.length, 0);
  assert.deepEqual(actual.sort(), expected.sort());
});

test('Taipei game two cues follow the actual removal and winning sequence', () => {
  const data: BroadcastTimelines = JSON.parse(readFileSync(new URL('../../data/broadcast-timelines.json', import.meta.url), 'utf8'));
  const match = data.matches.find(m => m.id === 'ascent-taipei-2026-day2-bronze-long-yamikin')!;
  const game = match.games.find(g => g.gameNumber === 2)!;
  assert.deepEqual(game.beats.map(b => b.timestamp?.seconds), [36219, 36474]);
  assert.ok(game.beats.every(b => b.timestamp!.seconds > 591 * 60 && b.timestamp!.seconds < 609 * 60));
});

test('NA round nine uses its separate replay clock and persistent video mapping', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const data: BroadcastTimelines = read('data/broadcast-timelines.json');
  const registry = read('docs/BROADCAST_VIDEO_SOURCES.json');
  const match = data.matches.find(m => m.id === 'na-nationals-2026-day1-round9-likebailey-vernosius')!;
  assert.deepEqual(match.video, { id: 'lt8xG0pelpw', kind: 'match' });
  const mapping = registry.matches.find((m: { matchId: string }) => m.matchId === match.id);
  assert.equal(mapping.videoId, match.video!.id);
  assert.equal(mapping.kind, 'match');
  const beats = match.games.flatMap(g => g.beats);
  assert.equal(beats.length, 9);
  for (const beat of beats) {
    assert.equal(beat.timestamp?.videoId, match.video!.id);
    assert.ok(beat.timestamp!.seconds < 59 * 60 + 37);
    assert.ok(beatVideoLink(beat, match.video));
  }
});
