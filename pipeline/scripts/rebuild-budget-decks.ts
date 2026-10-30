import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Card, OmnidexIndexData, PriceData } from '@gatcg/shared';
import { buildCardIndex, type CardSignature } from '../src/cards/catalog.js';
import { createAnalysisContext } from '../src/analysis/context.js';
import { computeBudgetDecks } from '../src/analysis/budgetDecks.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';

// Local-only rebuild from published inputs, without crawling or changing other analytics.
const root = fileURLToPath(new URL('../../data/', import.meta.url));
const read = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(root, name), 'utf8')) as T;
const catalog = await read<{ cards: Card[] }>('card-catalog.json');
const cards: CardSignature[] = catalog.cards.map(card => ({ ...card, editions: card.editions.map(ed => ({ setPrefix: ed.set.prefix, collectorNumber: ed.collector_number, releaseDate: ed.set.release_date })) }));
const index = await read<OmnidexIndexData>('omnidex/index.json');
const generatedAt = new Date().toISOString();
const cutoff = Date.parse(generatedAt) - 180 * 86_400_000;
const bundles: OmnidexEventBundle[] = [];
for (const event of index.events) {
  if (event.status === 'complete' && event.format.toLowerCase() === 'standard' && event.publicDecklistCount > 0 && Date.parse(event.date) >= cutoff) bundles.push(await read<OmnidexEventBundle>(`omnidex/events/${event.id}.json`));
}
const data = computeBudgetDecks(bundles, createAnalysisContext(buildCardIndex(cards)), await read<PriceData>('prices.json'), generatedAt);
await writeJsonAtomic(path.join(root, 'analysis/budget-decks.json'), data, 0);
const manifest = await read<Record<string, string>>('manifest.json');
manifest['analysis-budget-decks'] = data.generatedAt;
await writeJsonAtomic(path.join(root, 'manifest.json'), manifest, 0);
console.log(JSON.stringify({ pricesAsOf: data.pricesAsOf, ...data.audit }));
