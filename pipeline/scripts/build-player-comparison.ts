import { readFile } from 'node:fs/promises';
import { type OmnidexIndexData, type OmnidexPlayersData, type EloHistoryData, type StrengthEvent } from '@gatcg/shared';
import { strengthEvidence, writePlayerComparison } from '../src/analysis/regionalStrength.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';
const root = new URL('../../data/',import.meta.url);
const read = async <T>(file: string): Promise<T> => JSON.parse(await readFile(new URL(file,root),'utf8'));
const [index,players,history] = await Promise.all([read<OmnidexIndexData>('omnidex/index.json'),read<OmnidexPlayersData>('omnidex/players.json'),read<EloHistoryData>('analysis/elo-history.json')]);
const evidence: StrengthEvent[] = [];
for (const event of index.events) {
  if (event.status !== 'complete' || event.setting !== 'physical') continue;
  const result = strengthEvidence(await read<OmnidexEventBundle>(`omnidex/events/${event.id}.json`));
  if (result) evidence.push(result);
}
const generatedAt = [index.generatedAt,players.generatedAt,history.generatedAt].sort()[0];
const publishedAt = new Date().toISOString();
const eligible = new Set(index.events.filter(e => Date.parse(e.date) <= Date.parse(generatedAt)).map(e => e.id));
await writePlayerComparison(new URL('analysis/',root).pathname, evidence.filter(e => eligible.has(e.id)), publishedAt);
const manifest = await read<Record<string,string>>('manifest.json');
manifest['player-comparison'] = publishedAt;
await writeJsonAtomic(new URL('manifest.json',root).pathname,manifest,0);
console.log(`${evidence.length} events indexed`);
