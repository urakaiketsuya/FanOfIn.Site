import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildRegionalStrength, competitionMatches, type StrengthEvent, type OmnidexIndexData, type OmnidexPlayersData, type EloHistoryData } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import { writeJsonAtomic } from '../lib/atomicWrite.js';

export function strengthEvidence(bundle: OmnidexEventBundle): StrengthEvent | null {
  if (bundle.event.status !== 'complete' || /team/i.test(bundle.event.format)
    || ('error' in bundle.teams ? bundle.teams.error !== 'Not a team event.' : bundle.teams.length > 0)) return null;
  const cut = bundle.event.singleEliminationCutSize;
  const entrants = new Set([...bundle.event.players, ...bundle.players.map(p => p.id)]);
  const standings = 'error' in bundle.standings ? [] : bundle.standings.standings;
  const complete = entrants.size > 0 && standings.length === entrants.size && new Set(standings.map(s => s.id)).size === entrants.size
    && standings.every(s => s.id !== undefined && entrants.has(s.id) && Number.isInteger(s.finalPlacement) && s.finalPlacement! > 0 && s.finalPlacement! <= entrants.size);
  const validCut = cut !== null && Number.isInteger(cut) && cut >= 2 && cut < entrants.size
    && bundle.event.stages.some(s => s.type === 'single-elimination' && s.status === 'complete');
  return { id:bundle.id,matches:competitionMatches(bundle.pairingsByRound),finishes:complete && validCut
    ? standings.map(s => ({playerId:s.id!,topCut:s.finalPlacement! <= cut!})) : null };
}

export async function writeRegionalStrength(directory: string, bundles: OmnidexEventBundle[], history: EloHistoryData) {
  const read = async <T>(file: string): Promise<T> => JSON.parse(await readFile(path.join(directory, '..', 'omnidex', file), 'utf8')) as T;
  const [index, players] = await Promise.all([read<OmnidexIndexData>('index.json'), read<OmnidexPlayersData>('players.json')]);
  const generatedAt = [index.generatedAt, players.generatedAt, history.generatedAt].sort()[0];
  const evidence = [...new Map(bundles.map(b => [b.id,b])).values()].flatMap(b => { const e = strengthEvidence(b); return e ? [e] : []; });
  const data = buildRegionalStrength(index,players,history,evidence,generatedAt);
  data.generatedAt = new Date().toISOString();
  await writeJsonAtomic(path.join(directory,'regional-strength.json'),data,0);
}
