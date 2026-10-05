import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildCardIndex, type CardSignature } from '../src/cards/catalog.js';
import { createAnalysisContext } from '../src/analysis/context.js';
import { computeFieldHistory } from '../src/analysis/fieldHistory.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import { config } from '../src/config.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';

const root = new URL('../../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('pipeline/.cache/cards.json', root), 'utf8')) as { cards: CardSignature[] };
const bundles: OmnidexEventBundle[] = [];
const directory = new URL('data/omnidex/events/', root);
for (const name of (await readdir(directory)).filter(name => name.endsWith('.json')).sort()) {
  const bundle = JSON.parse(await readFile(new URL(name, directory), 'utf8')) as OmnidexEventBundle;
  if (bundle.event.status === 'complete' && Array.isArray(bundle.decklists) && bundle.decklists.length) bundles.push(bundle);
}
const data = computeFieldHistory(bundles, createAnalysisContext(buildCardIndex(catalog.cards)), config.minBattleChartSampleSize);
await writeJsonAtomic(fileURLToPath(new URL('data/analysis/field-history.json', root)), data, 0);
const manifestPath = fileURLToPath(new URL('data/manifest.json', root));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, string>;
manifest['analysis-field-history'] = data.generatedAt;
await writeJsonAtomic(manifestPath, manifest, 0);
console.log(JSON.stringify({ events: data.events.length, backtests: data.backtests }, null, 2));
