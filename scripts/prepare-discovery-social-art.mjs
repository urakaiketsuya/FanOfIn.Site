// Source preparation only. Builds use bundled catalog images without network requests.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { championCard, materialChampion, eventEntry } from './build-discovery-pages.mjs';
import { SITEMAP_EVENT_CATEGORIES } from '../shared/src/discoverySeo.ts';
import { bundledCardArt } from './discovery-social-image.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = async file => JSON.parse(await readFile(path.join(root, 'data', file), 'utf8'));
const [{ cards }, { champions }, { clusters }, { events }] = await Promise.all([read('card-catalog.json'), read('analysis/champion-trends.json'), read('analysis/archetype-taxonomy.json'), read('omnidex/index.json')]);
const names = new Set([...champions.map(c => championCard(c.championName, cards)?.name), ...clusters.flatMap(c => [materialChampion((c.materialDefiningCards ?? []).map(card => card.name), c.championName, cards)?.name, (c.mainDefiningCards ?? c.definingCards)[0]?.name])]);
// Include the actual material champions from eligible event decks, not a different printing/level chosen by family.
for (const event of events.filter(e => SITEMAP_EVENT_CATEGORIES.has(e.category) && e.topPlayerIdentity)) {
  const bundle = await read(`omnidex/events/${event.id}.json`);
  for (const card of eventEntry(event, bundle, cards).image.cards) names.add(card.name);
}
const dir = path.join(root, 'scripts/assets/discovery-social');
const artDirs = [dir, ...['match-social', 'artist-social'].map(name => path.join(root, 'scripts/assets', name))];
await mkdir(dir, { recursive: true });
const sources = [];
for (const card of cards.filter(c => names.has(c.name))) {
  if (await bundledCardArt(card, artDirs.slice(1))) continue;
  const image = card.editions.find(e => /^\/cards\/images\/[\w-]+\.(jpg|png|webp|jpeg)$/.test(e.image ?? ''))?.image;
  if (!image) continue;
  const file = image.split('/').at(-1), url = `https://api.gatcg.com${image}`;
  if (!await bundledCardArt(card, [dir])) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        await writeFile(path.join(dir, file), Buffer.from(await response.arrayBuffer()));
        break;
      } catch (error) { if (attempt === 2) throw error; }
    }
  }
  sources.push({ card: card.name, file, url });
}
await writeFile(path.join(dir, 'sources.json'), JSON.stringify(sources, null, 2) + '\n');
for (const file of await readdir(dir)) if (file !== 'sources.json' && !sources.some(source => source.file === file)) await rm(path.join(dir, file));
console.log(`Bundled ${sources.length} discovery card images`);
