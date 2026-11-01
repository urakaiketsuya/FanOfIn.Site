import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type { BroadcastTimelines, BroadcastEventMaps } from '@gatcg/shared';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const root = 'docs/broadcast-review/osaka-day1/';
const review = read(`${root}review-summary.json`);
const recaps: BroadcastTimelines = read('data/broadcast-timelines.json');
const maps: BroadcastEventMaps = read('data/broadcast-events.json');
const registry = read('docs/BROADCAST_VIDEO_SOURCES.json');
const source = read(`${root}omnidex-snapshot.json`);
const round = (n: number) => {
  const match = recaps.matches.find(m => m.eventId === 67176 && m.round === `Round ${n}`);
  assert.ok(match);
  return match;
};

test('Osaka review covers every supplied segment and publishes exact official pairings', () => {
  assert.equal(review.segmentCount, 9182);
  assert.deepEqual(review.reviewedRanges, [[0, 4108], [4108, 7282], [7282, 9182]]);
  assert.equal(review.rangeEndExclusive, true);
  assert.equal(review.newRecapIds.length, 9);
  const event = maps.events.find(e => e.id === 67176)!;
  assert.ok(event);
  assert.deepEqual(event.unlinkedRecapIds, []);
  for (const pair of read(`${root}featured-pairings.json`)) {
    const match = round(pair.round);
    assert.ok(review.newRecapIds.includes(match.id));
    assert.deepEqual(match.players.map(p => p.name), pair.players.map((p: { name: string }) => p.name));
    const official = event.stages.find(s => s.id === 1)!.matches.find(p => p.id === `1:${pair.round}:${pair.pairingId}`)!;
    assert.equal(official.recapId, match.id);
    assert.deepEqual(official.players.map(p => [p.id, p.score]).sort(), pair.players.map((p: { id: number; officialScore: number }) => [p.id, p.officialScore]).sort());
    assert.ok(source.pairingsByRound.find((r: { round: { id: number } }) => r.round.id === pair.round));
  }
});

test('Osaka cleanup remains traceable to the original capture and unchanged timestamps', () => {
  const cleaned = read(`${root}cleaned-transcript.json`);
  const corrections = read(`${root}corrections.json`);
  assert.equal(cleaned.segments.length, review.segmentCount);
  assert.equal(cleaned.originalSha256, review.sourceSha256);
  assert.equal(corrections.sourceSha256, review.sourceSha256);
  assert.equal(registry.sources.find((s: { videoId: string }) => s.videoId === review.videoId).capture.sha256, review.sourceSha256);
  const hash = createHash('sha256').update(readFileSync(new URL(`../../${root}cleaned-transcript.json`, import.meta.url))).digest('hex');
  assert.equal(review.cleanedSha256, hash);
  assert.equal(new Set(corrections.changes.map((c: { segmentIndex: number }) => c.segmentIndex)).size, corrections.changes.length);
  for (const change of corrections.changes) {
    assert.equal(cleaned.segments[change.segmentIndex].text, change.cleaned);
    assert.equal(cleaned.segments[change.segmentIndex].timestamp, change.timestamp);
    assert.notEqual(change.original, change.cleaned);
  }
});

test('Osaka preserves the concession, time procedures, and corrected champion identities', () => {
  assert.deepEqual(round(4).games.map(g => [g.gameNumber, g.winner]), [[1, 'p1'], [2, 'p2'], [3, 'p1']]);
  assert.match(round(7).result, /Quarax.*2.?1/i);
  assert.match(round(7).sourceNote, /DragonJG conceded.*two games/i);
  assert.deepEqual(round(7).games.map(g => [g.gameNumber, g.winner]), [[1, 'p2'], [2, 'p1']]);
  assert.match(round(5).result, /1.?0.*official/i);
  assert.match(round(5).sourceNote, /through time/);
  assert.doesNotMatch(round(5).sourceNote, /2.?0/);
  assert.ok(round(5).games.every(g => g.gameNumber !== 2 || g.winner !== 'p2'));
  assert.match(round(3).players[1].deck, /Ciel/);
  assert.doesNotMatch(round(3).players[1].deck, /Diao Chan/);
  assert.match(round(8).players[0].deck, /Silvie/);
  assert.doesNotMatch(round(8).players[0].deck, /Ciel/);
  assert.deepEqual(round(6).games.map(g => g.winner), ['p2', 'p1', 'p1']);
  assert.equal(round(9).games.length, 1);
  assert.equal(round(9).games[0].winner, 'unknown');
  assert.match(round(9).result, /Royan.*official/);
  assert.match(round(9).sourceNote, /Opening only/);
});

test('recovered Osaka audio retains raw evidence and complete review ranges', () => {
  const audio = read(`${root}audio-recovery.json`);
  const captures = new Map<string, { rawJson: string; sha256: string }>(audio.captures.map((c: { file: string }) => [c.file, c]));
  for (const capture of captures.values()) {
    assert.equal(createHash('sha256').update(capture.rawJson).digest('hex'), capture.sha256);
  }
  const reviewed = new Set<string>();
  for (const file of ['recovery-r2.json', 'recovery-r4-r5.json', 'recovery-gaps.json']) {
    const recovery = read(`${root}${file}`);
    for (const record of recovery.reviewedRecoveries) {
      const capture = captures.get(record.file)!;
      assert.ok(capture, record.file);
      const raw = JSON.parse(capture.rawJson);
      assert.equal(record.sha256, capture.sha256);
      assert.deepEqual(record.segmentsRead, [0, raw.transcription.length]);
      assert.equal(record.endExclusive, true);
      reviewed.add(record.file);
    }
    for (const segment of recovery.normalizedRecoveredSegments ?? []) {
      const raw = JSON.parse(captures.get(segment.sourceFile)!.rawJson);
      assert.equal(segment.originalText, raw.transcription[segment.sourceIndex].text.trim());
    }
  }
  assert.equal(reviewed.size, [...captures.keys()].filter(name => name.startsWith('bounded-')).length);
});
