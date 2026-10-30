import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPrices, writePrices } from '../src/pricing/build.js';
import { updatePriceHistory, writePriceHistory } from '../src/pricing/history.js';
import { computePublishedBudgetDecks } from './rebuild-budget-decks.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';

// Fetch a complete price snapshot and compute all affected budget outputs before replacing files.
// Manifest updates last. No tournament crawl or unrelated analysis rebuild.
const root = fileURLToPath(new URL('../../data/', import.meta.url));
const prices = await buildPrices();
const history = await updatePriceHistory(prices);
const budget = await computePublishedBudgetDecks(prices);
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, string>;
await writePrices(prices);
await writePriceHistory(history);
await writeJsonAtomic(path.join(root, 'analysis/budget-decks.json'), budget, 0);
await writeJsonAtomic(manifestPath, { ...manifest, prices: prices.generatedAt, 'price-history': history.generatedAt, 'analysis-budget-decks': budget.generatedAt }, 0);
console.log(JSON.stringify({ pricesAsOf: prices.generatedAt, editions: Object.keys(prices.prices).length, ...budget.audit }));
