import { readFile, writeFile } from 'node:fs/promises';
import type { BroadcastTimelines, BroadcastTimelineMatch } from '../shared/src/broadcast-timeline-types.ts';
const root = new URL('../', import.meta.url);
const registry = JSON.parse(await readFile(new URL('docs/BROADCAST_VIDEO_SOURCES.json', root), 'utf8'));
const file = new URL('data/broadcast-timelines.json', root);
const data: BroadcastTimelines = JSON.parse(await readFile(file, 'utf8'));
const sources = new Map<string, { videoId: string }>(registry.sources.map((s: { videoId: string }) => [s.videoId, s]));
const links = new Map<string, BroadcastTimelineMatch['video']>();
for (const link of registry.matches) {
  if (links.has(link.matchId) || !sources.has(link.videoId) || !/^[\w-]{11}$/.test(link.videoId) || !['match', 'broadcast'].includes(link.kind)) throw new Error(`Invalid or duplicate video association: ${link.matchId}`);
  if (link.startSeconds !== undefined && (!Number.isInteger(link.startSeconds) || link.startSeconds < 0 || !link.startEvidence)) throw new Error(`Unverified start: ${link.matchId}`);
  if (!data.matches.some(m => m.id === link.matchId)) throw new Error(`Unknown match: ${link.matchId}`);
  links.set(link.matchId, { id: link.videoId, kind: link.kind, ...(link.startSeconds !== undefined ? { startSeconds: link.startSeconds } : {}) });
}
const before = JSON.stringify(data.matches);
for (const match of data.matches) {
  const video = links.get(match.id);
  if (video) match.video = video;
  else delete match.video;
}
if (JSON.stringify(data.matches) !== before) {
  data.generatedAt = new Date().toISOString();
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
  const manifestFile = new URL('data/manifest.json', root);
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  manifest['broadcast-timelines'] = data.generatedAt;
  await writeFile(manifestFile, JSON.stringify(manifest));
}
console.log(`${links.size} verified video links`);
