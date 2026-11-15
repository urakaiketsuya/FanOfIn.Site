/** Local-only card report refresh; leaves other analysis artifacts untouched. */
import { readFile } from 'node:fs/promises';
import { listCachedBundles } from '../pipeline/src/omnidex/cache.js';
import { buildCardIndex, type CardSignature } from '../pipeline/src/cards/catalog.js';
import { loadPriceByName, writeCardStats } from '../pipeline/src/analysis/build.js';
const catalog = JSON.parse(await readFile(new URL('../pipeline/.cache/cards.json', import.meta.url), 'utf8')) as { cards: CardSignature[] };
const index = buildCardIndex(catalog.cards);
const completed = (await listCachedBundles()).filter(b => b.event.status === 'complete');
const report = await writeCardStats(completed, index, await loadPriceByName(index));
console.log(JSON.stringify({ cards: report.cards.length, decks: report.decksConsidered, periods: report.adoptionPeriods }));
