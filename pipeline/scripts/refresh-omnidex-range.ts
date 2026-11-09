/** Backfill previously excluded small events, publishing only after the bounded crawl succeeds. */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { crawlEvents } from '../src/omnidex/crawler.js';
import { readCachedBundle, writeCachedBundle, type OmnidexEventBundle } from '../src/omnidex/cache.js';
import { buildOmnidexIndex, writeEventBrowserData } from '../src/omnidex/build.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';

const [startId, endId] = process.argv.slice(2).map(Number);
if (!Number.isSafeInteger(startId) || !Number.isSafeInteger(endId) || startId < 1 || endId < startId || process.argv.length !== 4) throw new Error('Usage: node --import tsx pipeline/scripts/refresh-omnidex-range.ts START_ID END_ID');
const root = new URL('../../data/omnidex/', import.meta.url);
const before = JSON.parse(await readFile(new URL('players.json', root), 'utf8')) as { players: { id: number }[] };
const beforeIds = new Set(before.players.map(player => player.id));
// The published snapshots can be newer than a populated local cache. Reuse them first.
console.log(`Preparing published snapshots for events ${startId}–${endId}`);
for (let id = startId; id <= endId; id++) {
  let published: OmnidexEventBundle;
  try { published = JSON.parse(await readFile(new URL(`events/${id}.json`, root), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
  const cached = await readCachedBundle(id);
  if (!cached || published.fetchedAt > cached.fetchedAt) await writeCachedBundle(published);
}
console.log('Fetching previously skipped events');
await crawlEvents({ kind: 'range', startId, endId });
const bundles = new Map<number, OmnidexEventBundle>();
for (const file of (await readdir(new URL('events/', root))).filter(file => file.endsWith('.json'))) {
  const bundle = JSON.parse(await readFile(new URL(`events/${file}`, root), 'utf8')) as OmnidexEventBundle;
  bundles.set(bundle.id, bundle);
}
for (let id = startId; id <= endId; id++) {
  const bundle = await readCachedBundle(id);
  if (!bundle || bundle.event.status !== 'complete') continue;
  const prior = bundles.get(id);
  if (!prior || bundle.fetchedAt > prior.fetchedAt) {
    bundles.set(id, bundle);
    await writeJsonAtomic(fileURLToPath(new URL(`events/${id}.json`, root)), bundle, 0);
  }
}
const { index, players, judges, teams } = await buildOmnidexIndex([...bundles.values()].sort((a, b) => a.event.date.localeCompare(b.event.date) || a.id - b.id));
await writeEventBrowserData(index);
for (const [name, value] of Object.entries({ index, players: { generatedAt: index.generatedAt, players }, judges: { generatedAt: index.generatedAt, judges }, teams: { generatedAt: index.generatedAt, teams } })) await writeJsonAtomic(fileURLToPath(new URL(`${name}.json`, root)), value, 0);
const manifestPath = fileURLToPath(new URL('../manifest.json', root));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, string>;
for (const name of ['index', 'browse', 'search', 'players', 'judges', 'teams']) manifest[`omnidex-${name}`] = index.generatedAt;
await writeJsonAtomic(manifestPath, manifest, 0);
console.log(JSON.stringify({ events: index.events.length, players: players.length, addedPlayers: players.filter(player => !beforeIds.has(player.id)).map(player => ({ id: player.id, username: player.username })) }, null, 2));
