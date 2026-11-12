import { chromium } from 'playwright';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import type { ShoutAtYourDecksDeck } from '@gatcg/shared';
import { writeJsonAtomic } from '../lib/atomicWrite.js';
import { BASE_URL, parseDeckFlight, transformDeck, shouldKeepAriDeck } from './transform.js';

const cache = new URL('../../.cache/arisapothecary/', import.meta.url);
const published = new URL('../../../data/arisapothecary/decks/', import.meta.url);
export async function listAriDecks(directory = published): Promise<ShoutAtYourDecksDeck[]> {
  let files: string[];
  try { files = await readdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  return Promise.all(files.filter(f => f.endsWith('.json')).sort().map(async f => JSON.parse(await readFile(new URL(f, directory), 'utf8')) as ShoutAtYourDecksDeck));
}
export async function runAri(mode: string): Promise<void> {
  if (mode === 'build') {
    await mkdir(published, { recursive: true });
    const decks = (await listAriDecks(cache)).filter(shouldKeepAriDeck);
    if (!decks.length) throw new Error('No cached Ari decks; harvest first');
    for (const deck of decks) await writeJsonAtomic(new URL(`${deck.id}.json`, published).pathname, deck, 0);
    console.log(`arisapothecary: published ${decks.length} decks`);
    return;
  }
  if (mode !== 'harvest') throw new Error('GATCG_ARI_MODE must be harvest or build');
  await mkdir(cache, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const listing = await browser.newPage();
    const detail = await browser.newPage();
    const ids = new Set<string>();
    let total = Infinity;
    for (let page = 1; ids.size < total; page++) {
      const response = listing.waitForResponse(r => new URL(r.url()).pathname === '/api/browse' && new URL(r.url()).searchParams.get('view') === 'community' && new URL(r.url()).searchParams.get('page') === String(page), { timeout: 30000 });
      if (page === 1) await listing.goto(`${BASE_URL}/decks`, { waitUntil: 'domcontentloaded' });
      else await listing.getByRole('button', { name: 'Next page', exact: true }).click();
      const r = await response;
      if (!r.ok()) throw new Error(`Ari listing HTTP ${r.status()}`);
      const data = await r.json() as { rows: Array<{ id: string; is_public: boolean; updated_at: string }>; total: number };
      if (!Array.isArray(data.rows) || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid Ari listing');
      total = data.total;
      const previous = ids.size;
      for (const row of data.rows) {
        if (typeof row.id !== 'string' || !/^[a-z0-9-]+$/i.test(row.id) || row.is_public !== true) throw new Error('Invalid Ari public listing row');
        if (ids.has(row.id)) continue;
        ids.add(row.id);
        const destination = new URL(`${row.id}.json`, cache);
        let existing: (ShoutAtYourDecksDeck & { sourceUpdatedAt?: string }) | undefined;
        try { existing = JSON.parse(await readFile(destination, 'utf8')); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (row.updated_at && existing?.sourceUpdatedAt === row.updated_at) continue;
        await detail.goto(`${BASE_URL}/decks/${row.id}`, { waitUntil: 'load' });
        const scripts = await detail.locator('script').allTextContents();
        const chunks = scripts.flatMap(script => {
          const match = script.match(/^self\.__next_f\.push\((.*)\)$/s);
          if (!match) return [];
          const value = JSON.parse(match[1]) as [number, string];
          return value[0] === 1 ? [value[1]] : [];
        });
        const deck = transformDeck(parseDeckFlight(chunks, row.id));
        await writeJsonAtomic(destination.pathname, { ...deck, fetchedAt: existing?.fetchedAt ?? deck.fetchedAt, sourceUpdatedAt: row.updated_at }, 0);
        console.log(`arisapothecary: ${ids.size}/${total} ${deck.id}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (process.env.GATCG_FAST_MODE === '1') return;
      }
      if (ids.size === previous && ids.size < total) throw new Error('Ari pagination stalled');
    }
  } finally { await browser.close(); }
}
