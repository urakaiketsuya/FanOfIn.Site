import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { BroadcastTimelines, BroadcastEventMaps } from '@gatcg/shared';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const data: BroadcastTimelines = read('data/broadcast-timelines.json');
const maps: BroadcastEventMaps = read('data/broadcast-events.json');
const review = read('docs/BROADCAST_BACKFILL_REVIEW_2026-10-31.json');
const registry = read('docs/BROADCAST_VIDEO_SOURCES.json');
const match = (id: string) => {
  const found = data.matches.find(m => m.id === id);
  assert.ok(found, id);
  return found;
};

test('recovered coverage retains the baseline and accounts for every new recap', () => {
  assert.equal(review.baselineRecapIds.length, 110);
  assert.equal(review.newRecapIds.length, 86);
  assert.equal(review.updatedOffsetIds.length, 18);
  assert.deepEqual([...review.baselineRecapIds, ...review.newRecapIds].sort(), data.matches.map(m => m.id).sort());
  assert.equal(new Set(review.sources.map((s: { videoId: string }) => s.videoId)).size, 14);
  for (const source of review.sources) {
    assert.equal(source.fullGameplayReviewed, false);
    assert.equal(source.sha256, registry.sources.find((s: { videoId: string }) => s.videoId === source.videoId).capture.sha256);
  }
  for (const held of review.held) if (held.matchId) assert.ok(!review.newRecapIds.includes(held.matchId));
});

test('every backfill association joins the exact event, stage, round and two players', () => {
  for (const record of review.records) {
    const m = match(record.matchId);
    const pair = record.officialPairing;
    assert.equal(m.eventId, pair.eventId, m.id);
    assert.deepEqual(m.players.map(p => p.name).sort(), pair.players.map((p: { name: string }) => p.name).sort(), m.id);
    const event = maps.events.find(e => e.id === pair.eventId)!;
    const official = event.stages.find(s => s.id === pair.stage)!.matches.find(p => p.id === `${pair.stage}:${pair.round}:${pair.id}`)!;
    assert.equal(official.recapId, m.id);
    assert.deepEqual(official.players.map(p => [p.id, p.score]).sort(), pair.players.map((p: { id: number; score: number }) => [p.id, p.score]).sort());
    const video = registry.matches.find((v: { matchId: string }) => v.matchId === m.id);
    assert.equal(m.video?.id, record.videoId);
    assert.equal(video.startSeconds, record.startSeconds);
    if (record.startSeconds !== undefined) {
      assert.equal(record.startEvidence.timestamp.split(':').reduce((seconds: number, part: string) => seconds * 60 + Number(part), 0), record.startSeconds);
      assert.ok(video.startEvidence.includes(record.startEvidence.quote));
    }
  }
});

test('partial coverage preserves game numbers, draws, penalties and missing starts', () => {
  assert.deepEqual(match('ascent-melbourne-2026-semifinal-hachico-noel').games.map(g => g.gameNumber), [2]);
  const draw = match('oce-nationals-2026-round-8-kmo-professor');
  assert.equal(draw.result, 'Draw 1-1');
  assert.equal(draw.games[0].gameNumber, 2);
  assert.equal(draw.games[0].winner, 'p1');
  const penalty = match('ascent-los-angeles-2026-day1-round6-quarax-rexaren');
  assert.deepEqual(penalty.games.map(g => g.winner), ['p1', 'p2', 'p1']);
  assert.match(penalty.games[1].beats[0].text, /Quarax receives a game loss/);
  const exhibition = match('ascent-niagara-falls-2025-day1-round7-maindeckdan-yojiah');
  assert.deepEqual(exhibition.games.map(g => g.gameNumber), [1, 2]);
  assert.equal(match('sea-national-2026-grand-final-raylam-dragonjg').video?.startSeconds, undefined);
  assert.equal(match('na-nationals-2026-day1-round9-likebailey-vernosius').video?.startSeconds, undefined);
});
