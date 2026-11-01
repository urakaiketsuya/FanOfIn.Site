import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { BroadcastTimelines, BroadcastEventMaps } from '@gatcg/shared';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const data: BroadcastTimelines = read('data/broadcast-timelines.json');
const maps: BroadcastEventMaps = read('data/broadcast-events.json');
const review = read('docs/BROADCAST_BACKFILL_REVIEW_2026-10-31.json');
const resolutions = read('docs/BROADCAST_HELD_RESOLUTIONS_2026-10-31.json');
const registry = read('docs/BROADCAST_VIDEO_SOURCES.json');
const sequential = read('docs/BROADCAST_SEQUENTIAL_REVIEW_2026-10-31.json');
const match = (id: string) => {
  const found = data.matches.find(m => m.id === id);
  assert.ok(found, id);
  return found;
};

test('recovered coverage retains the baseline and accounts for every new recap', () => {
  assert.equal(review.baselineRecapIds.length, 110);
  assert.equal(review.newRecapIds.length, 86);
  assert.equal(review.updatedOffsetIds.length, 18);
  assert.deepEqual([...review.baselineRecapIds, ...review.newRecapIds, ...resolutions.newRecapIds].sort(), data.matches.map(m => m.id).sort());
  assert.equal(new Set(review.sources.map((s: { videoId: string }) => s.videoId)).size, 14);
  for (const source of review.sources) {
    assert.equal(source.fullGameplayReviewed, false);
    assert.equal(source.sha256, registry.sources.find((s: { videoId: string }) => s.videoId === source.videoId).capture.sha256);
  }
  for (const held of review.held) if (held.matchId) assert.ok(!review.newRecapIds.includes(held.matchId));
});

test('sequential caption review accounts for every recovered source and associated recap', () => {
  const sourceIds = new Set(review.sources.map((s: { videoId: string }) => s.videoId));
  assert.equal(sequential.sources.length, sourceIds.size);
  assert.equal(new Set(sequential.sources.map((s: { videoId: string }) => s.videoId)).size, sourceIds.size);
  for (const source of sequential.sources) {
    assert.ok(sourceIds.has(source.videoId));
    assert.equal(source.fullCaptionReview, true, source.videoId);
    assert.equal(source.fullGameplayReviewed, false, source.videoId);
    assert.equal(source.sourceSha256, review.sources.find((s: { videoId: string }) => s.videoId === source.videoId).sha256);
    let coveredThrough = -1;
    const ranges = [...source.reviewedRowRanges, ...(source.priorReviewedRowRanges ?? []), ...(source.previouslyReviewedRowRanges ?? [])];
    for (const [start, end] of ranges.sort((a: number[], b: number[]) => a[0] - b[0])) {
      assert.ok(start >= 0 && start <= coveredThrough + 1 && end >= start && end < source.segmentCount, source.videoId);
      coveredThrough = Math.max(coveredThrough, end);
    }
    assert.equal(coveredThrough, source.segmentCount - 1, source.videoId);
  }
  const associated = data.matches.filter(m => m.video && sourceIds.has(m.video.id)).map(m => m.id).sort();
  assert.deepEqual(sequential.records.map((r: { matchId: string }) => r.matchId).sort(), associated);
  for (const record of sequential.records) {
    assert.equal(record.videoId, match(record.matchId).video?.id);
    const source = sequential.sources.find((s: { videoId: string }) => s.videoId === record.videoId);
    assert.equal(record.sourceSha256, source.sourceSha256, record.matchId);
    const ranges = record.reviewedRowRanges ?? record.rowsZeroBased;
    assert.ok(ranges.length > 0, record.matchId);
    for (const [start, end] of ranges) {
      assert.ok(start >= 0 && end >= start && end < source.segmentCount, record.matchId);
    }
  }
});

test('sequential review preserves the Melbourne final penalty and Niagara timed draw', () => {
  const final = match('ascent-melbourne-2026-final-hachico-yamikin');
  assert.deepEqual(final.games.map(g => g.winner), ['p1', 'p1']);
  assert.equal(final.games[0].beats[0].actor, 'p2');
  assert.match(final.games[0].beats[0].text, /game loss for Yamikin/);
  assert.match(final.games[0].beats[0].text, /main-deck card.*material deck/);
  const timed = match('ascent-niagara-falls-2025-day1-round2-kibbles-hyouka');
  assert.deepEqual(timed.games.map(g => g.winner), ['p2', 'draw']);
  assert.equal(timed.result, 'Hyouka wins 1-0 on broadcast');
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
  assert.deepEqual(draw.games.map(g => [g.gameNumber, g.winner]), [[1, 'p2'], [2, 'p1']]);
  const penalty = match('ascent-los-angeles-2026-day1-round6-quarax-rexaren');
  assert.deepEqual(penalty.games.map(g => g.winner), ['p1', 'p2', 'p1']);
  assert.match(penalty.games[1].beats[0].text, /Quarax receives a game loss/);
  const exhibition = match('ascent-niagara-falls-2025-day1-round7-maindeckdan-yojiah');
  assert.deepEqual(exhibition.games.map(g => g.gameNumber), [1, 2]);
  assert.equal(match('sea-national-2026-grand-final-raylam-dragonjg').video?.startSeconds, undefined);
  assert.equal(match('na-nationals-2026-day1-round9-likebailey-vernosius').video?.startSeconds, undefined);
});


test('all twelve held findings have explicit dispositions and exact published pairings', () => {
  assert.equal(resolutions.records.length, 12);
  assert.equal(resolutions.newRecapIds.length, 8);
  for (const record of resolutions.records) {
    assert.ok(record.disposition);
    assert.ok(record.resolution || record.conclusion);
    if (!record.published) continue;
    const m = match(record.matchId);
    const pair = record.officialPairing;
    const id = typeof pair.id === 'number' ? `${pair.stage}:${pair.round}:${pair.id}` : pair.id;
    const official = maps.events.find(e => e.id === pair.eventId)!.stages.find(s => s.id === pair.stage)!.matches.find(p => p.id === id)!;
    assert.equal(official.recapId, m.id);
    assert.deepEqual(m.players.map(p => p.name).sort(), pair.players.map((p: { name: string }) => p.name).sort());
    assert.equal(m.video?.startSeconds, record.startEvidence.timestamp.split(':').reduce((n: number, p: string) => n * 60 + Number(p), 0));
    assert.equal(registry.matches.find((r: { matchId: string }) => r.matchId === m.id).startSeconds, m.video?.startSeconds);
  }
});

test('resolved holds preserve source conflicts, partial games and the deciding penalty', () => {
  assert.equal(match('ascent-niagara-falls-2025-day1-round2-kibbles-hyouka').result, 'Hyouka wins 1-0 on broadcast');
  assert.equal(match('ascent-niagara-falls-2025-day1-round3-centai-superior').result, 'Centai wins 2-1 on broadcast');
  const penalty = match('ascent-niagara-falls-2025-day1-round5-fruitcake-rng');
  assert.deepEqual(penalty.games.map(g => g.winner), ['p1', 'p2', 'p2']);
  assert.match(penalty.games[2].beats[0].text, /game loss ends the match at 2-1/);
  assert.deepEqual(match('ascent-los-angeles-2026-day1-round7-quikk-chemcollapse').games.map(g => g.gameNumber), [1]);
  assert.deepEqual(match('na-nationals-2026-day1-round5-superior-elian').games.map(g => g.gameNumber), [1]);
  assert.deepEqual(match('ascent-taipei-2025-round-2-lifdrasyl-shina2486').games.map(g => [g.gameNumber, g.winner]), [[1, 'p1'], [2, 'draw']]);
  assert.match(match('ascent-taipei-2025-round-2-lifdrasyl-shina2486').sourceNote!, /draw inferred from official 1-0/);
  assert.deepEqual(match('ascent-taipei-2025-round-4-aw5459-menbao').games.map(g => g.gameNumber), [1, 2]);
  const seaQuarterfinal = match('sea-national-2026-quarterfinal-dragonjg-noobtinnn');
  assert.deepEqual(seaQuarterfinal.games.map(g => [g.gameNumber, g.winner]), [[1, 'p1'], [2, 'p1']]);
  assert.equal(seaQuarterfinal.players[1].name, 'NoobTinnn');
  assert.ok(seaQuarterfinal.games.find(g => g.gameNumber === 1)!.beats.some(b => /concedes/i.test(b.text)));
  const decidingGame = seaQuarterfinal.games.find(g => g.gameNumber === 2)!;
  assert.ok(decidingGame.beats.some(b => /deck[ -]?out/i.test(b.text)));
  assert.ok(decidingGame.beats.some(b => b.cards?.includes('Dynastic Whirlpool')));
  assert.equal(seaQuarterfinal.video?.startSeconds, 22861);
});
