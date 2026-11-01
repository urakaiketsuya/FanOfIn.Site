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
