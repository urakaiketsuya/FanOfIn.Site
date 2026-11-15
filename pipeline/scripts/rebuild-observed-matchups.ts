import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeObservedMatchups } from '../src/analysis/observedMatchups.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';
import type { ArchetypeTaxonomyData } from '@gatcg/shared';
const root = fileURLToPath(new URL('../../data/', import.meta.url));
const taxonomy = JSON.parse(await readFile(path.join(root, 'analysis/archetype-taxonomy.json'), 'utf8')) as ArchetypeTaxonomyData;
// Only load events that can have a classified deck; published snapshots are the reproducible source.
const ids = new Set(taxonomy.clusters.flatMap(c => c.deckIds.map(id => id.split(':')[0])));
const bundles: OmnidexEventBundle[] = [];
for (const name of (await readdir(path.join(root, 'omnidex/events'))).sort()) {
  if (name.endsWith('.json') && ids.has(name.slice(0, -5))) bundles.push(JSON.parse(await readFile(path.join(root, 'omnidex/events', name), 'utf8')));
}
const data = computeObservedMatchups(bundles, taxonomy);
await writeJsonAtomic(path.join(root, 'analysis/observed-matchups.json'), data, 0);
console.log(`${data.events.length} events, ${data.events.reduce((n, e) => n + e.rows.length, 0)} event matchup rows`);

const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest['analysis-observed-matchups'] = data.generatedAt;
await writeJsonAtomic(manifestPath, manifest, 0);
