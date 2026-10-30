import { readFile } from 'node:fs/promises';
import { buildRegionalStrength, type OmnidexIndexData, type OmnidexPlayersData, type EloHistoryData, type StrengthEvent } from '@gatcg/shared';
import { strengthEvidence } from '../src/analysis/regionalStrength.js';
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
const data = buildRegionalStrength(index,players,history,evidence,generatedAt);
data.generatedAt = new Date().toISOString();
await writeJsonAtomic(new URL('analysis/regional-strength.json',root).pathname,data,0);
const manifest = await read<Record<string,string>>('manifest.json');
manifest['regional-strength'] = data.generatedAt;
await writeJsonAtomic(new URL('manifest.json',root).pathname,manifest,0);
console.log(JSON.stringify(data.seasons.filter(s => s.format === 'standard').map(s => ({season:s.name,regions:s.regions.map(r=>({region:r.region,active:r.active,ratings:r.ratings.length,cuts:r.topCuts,entries:r.majorEntries})),pairs:s.pairs,majors:s.coveredMajorEvents})),null,2));
