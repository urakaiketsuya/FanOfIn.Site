import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchVideoLink } from '../src/features/timelines/matchVideoUrl';

test('distinguishes broadcasts, match clips, and verified offsets', () => {
  assert.equal(matchVideoLink({ id: 'bfhumlDXjrE', kind: 'match' })?.label, 'Watch match');
  assert.equal(matchVideoLink({ id: 'E8MyaSKtI_U', kind: 'broadcast' })?.label, 'Watch broadcast');
  assert.deepEqual(matchVideoLink({ id: 'E8MyaSKtI_U', kind: 'broadcast', startSeconds: 123 }), { url: 'https://www.youtube.com/watch?v=E8MyaSKtI_U&t=123s', label: 'Watch match' });
  assert.equal(matchVideoLink(undefined), undefined);
  assert.equal(matchVideoLink({ id: 'javascript:alert(1)', kind: 'match' }), undefined);
  assert.equal(matchVideoLink({ id: 'bfhumlDXjrE', kind: 'match', startSeconds: -1 }), undefined);
});

test('every published link has an explicit registry association and no transferred clip offsets', () => {
  const data = JSON.parse(readFileSync(new URL('../../data/broadcast-timelines.json', import.meta.url), 'utf8'));
  const registry = JSON.parse(readFileSync(new URL('../../docs/BROADCAST_VIDEO_SOURCES.json', import.meta.url), 'utf8'));
  const links = new Map(registry.matches.map((m: { matchId: string }) => [m.matchId, m]));
  assert.equal(links.size, registry.matches.length);
  for (const match of data.matches) {
    const association = links.get(match.id) as { videoId: string; startEvidence?: string } | undefined;
    if (!match.video) { assert.equal(association, undefined); continue; }
    assert.equal(match.video.id, association?.videoId);
    assert.ok(matchVideoLink(match.video));
    assert.ok(registry.sources.some((s: { videoId: string }) => s.videoId === match.video.id));
    if (match.video.startSeconds !== undefined) assert.ok(association?.startEvidence);
  }
  assert.equal(data.matches.find((m: { eventId: number }) => m.eventId === 38740).video.id, 'bfhumlDXjrE');
  for (const m of data.matches.filter((m: { eventId: number }) => m.eventId === 52777)) assert.equal(m.video.startSeconds, undefined);
});
