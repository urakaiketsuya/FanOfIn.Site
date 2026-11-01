import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type { BroadcastTimelines, BroadcastEventMaps } from '@gatcg/shared';
import { beatVideoLink } from '../src/features/timelines/matchVideoUrl';
const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const root = 'docs/broadcast-review/osaka-day2/';
const review = read(`${root}review-summary.json`);
const data: BroadcastTimelines = read('data/broadcast-timelines.json');
const maps: BroadcastEventMaps = read('data/broadcast-events.json');
const matches = data.matches.filter(m => review.newRecapIds.includes(m.id));

test('Osaka Day 2 recaps join exact official pairings and retain observed game outcomes', () => {
  assert.equal(matches.length, 9);
  assert.equal(matches.reduce((n, m) => n + m.games.length, 0), 23);
  const event = maps.events.find(e => e.id === 67176)!;
  for (const pair of read(`${root}featured-pairings.json`)) {
    const m = matches.find(m => m.id === pair.matchId)!;
    const linked = event.stages.find(s => s.id === pair.stage)!.matches.find(p => p.id === `${pair.stage}:${pair.round}:${pair.pairingId}`)!;
    assert.equal(linked.recapId, m.id);
    assert.deepEqual(m.players.map(p => p.name).sort(), pair.players.map((p: { name: string }) => p.name).sort());
    assert.deepEqual(linked.players.map(p => [p.id, p.score]).sort(), pair.players.map((p: { id: number; score: number }) => [p.id, p.score]).sort());
  }
  assert.deepEqual(event.unlinkedRecapIds, []);
  const swiss = matches.find(m => m.round === 'Round 12')!;
  assert.deepEqual(swiss.games.map(g => g.winner), ['p1', 'unknown']);
  assert.equal(swiss.result, 'DeRealDeal wins 1–0');
  const semi = matches.find(m => m.id.endsWith('semifinal-pokerkt-noel'))!;
  assert.deepEqual(semi.games.map(g => g.gameNumber), [2, 3]);
  assert.equal(matches.find(m => m.round === 'Top 8')!.result, 'Noel wins 2–1');
  assert.deepEqual(matches.find(m => m.round === 'Final')!.games.map(g => g.winner), ['p1', 'p2', 'p2']);
  assert.ok(!matches.some(m => m.round === 'Bronze' || m.round === 'Round 9'));
});

test('every Day 2 highlight retains original source evidence and a matching capture clock', () => {
  const raw = readFileSync(new URL(`../../${root}source-transcript.json`, import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), review.sourceSha256);
  const source = JSON.parse(raw.toString());
  assert.equal(source.segments.length, 15458);
  assert.deepEqual(review.reviewedRanges, [[0, 7198], [7198, 11720], [11720, 15458]]);
  const evidence = read(`${root}beat-timestamps.json`);
  const seen = new Set<string>();
  for (const e of evidence) {
    const key = `${e.matchId}/${e.gameNumber}/${e.order}`;
    assert.ok(!seen.has(key), key); seen.add(key);
    const m = matches.find(m => m.id === e.matchId)!;
    const beat = m.games.find(g => g.gameNumber === e.gameNumber)!.beats.find(b => b.order === e.order)!;
    assert.equal(beat.text, e.text);
    assert.equal(e.sourceSha256, review.sourceSha256);
    assert.equal(e.timestamp.videoId, m.video!.id);
    assert.equal(e.source.length, e.sourceRows[1] - e.sourceRows[0] + 1);
    for (const [i, segment] of e.source.entries()) {
      assert.equal(segment.row, e.sourceRows[0] + i);
      assert.deepEqual({ text: segment.text, timestamp: segment.timestamp }, source.segments[segment.row]);
    }
    assert.equal(e.timestamp.seconds, e.source[0].timestamp.split(':').reduce((n: number, v: string) => n * 60 + Number(v), 0));
    if (m.round !== 'Final') {
      assert.deepEqual(beat.timestamp, e.timestamp);
      assert.ok(beatVideoLink(beat, m.video));
      assert.ok(beat.timestamp!.seconds >= m.video!.startSeconds!);
    }
  }
  assert.equal(seen.size, 79);
  assert.equal(seen.size, matches.reduce((n, m) => n + m.games.reduce((n, g) => n + g.beats.length, 0), 0));
});

test('final capture timestamps stay unpublished while the replay is truncated', () => {
  const pending = read(`${root}pending-playback.json`);
  const check = read(`${root}playback-check.json`);
  const final = matches.find(m => m.round === 'Final')!;
  assert.equal(final.video!.startSeconds, undefined);
  assert.equal(pending.length, 10);
  for (const p of pending) {
    assert.ok(p.captureSeconds > check.browser.durationSeconds);
    const beat = final.games.find(g => g.gameNumber === p.gameNumber)!.beats.find(b => b.order === p.order)!;
    assert.equal(beat.text, p.text);
    assert.equal(beatVideoLink(beat, final.video), undefined);
  }
  assert.equal(matches.flatMap(m => m.games.flatMap(g => g.beats)).filter(b => b.timestamp).length, 69);
});
