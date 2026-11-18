/** Offline publication of tournament Staples, including matching adoption populations. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeJsonAtomic } from '../pipeline/src/lib/atomicWrite.js';
import { listCachedBundles } from '../pipeline/src/omnidex/cache.js';
import { buildCardIndex, type CardSignature } from '../pipeline/src/cards/catalog.js';
import { computeCardStaples } from '../pipeline/src/analysis/cardStaples.js';
const catalog = JSON.parse(await readFile(new URL('../pipeline/.cache/cards.json', import.meta.url), 'utf8')) as { cards: CardSignature[] };
const report = computeCardStaples(await listCachedBundles(), buildCardIndex(catalog.cards));
await writeJsonAtomic(fileURLToPath(new URL('../data/analysis/card-staples.json', import.meta.url)), report, 0);
const manifestUrl = new URL('../data/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
manifest['analysis-card-staples'] = report.generatedAt;
await writeJsonAtomic(fileURLToPath(manifestUrl), manifest, 0);
console.log(JSON.stringify({ cards: report.cards.length, cohorts: report.cohorts.length, periods: report.adoptionPeriods }));
