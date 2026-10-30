import type { OmnidexEvent, OmnidexPairingsResponse, OmnidexApiError } from '@gatcg/shared';
type Response = OmnidexPairingsResponse | OmnidexApiError;
const identity = (v: unknown): number | undefined => typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v && typeof v.id === 'number' ? v.id : undefined;
const total = (r: OmnidexPairingsResponse): number | undefined => {
  const value: unknown = r.round;
  return value && typeof value === 'object' && 'total' in value && typeof value.total === 'number' && Number.isInteger(value.total) && value.total > 0 ? value.total : undefined;
};
const key = (r: OmnidexPairingsResponse) => `${identity(r.stage)}:${identity(r.round)}`;
export function missingStagePairings(event: OmnidexEvent, rounds: Response[]): boolean {
  return (event.stages ?? []).filter(s => s.status === 'complete').some(stage => {
    const found = rounds.filter((r): r is OmnidexPairingsResponse => !('error' in r) && identity(r.stage) === stage.id);
    const expected = Math.max(0,...found.map(r => total(r) ?? 0));
    return !found.length || !expected || expected > 100 || Array.from({length:expected},(_,i)=>i+1).some(id => !found.some(r=>identity(r.round)===id));
  });
}
/** Fetch into memory first: a failed/misrouted request must never replace a saved event. */
export async function fetchStagePairings(event: OmnidexEvent, existing: Response[],
  get: (event: number, round: number, stage: number) => Promise<Response>, fast = false): Promise<Response[]> {
  const saved = new Map(existing.filter((r): r is OmnidexPairingsResponse => !('error' in r) && identity(r.stage)!==undefined && identity(r.round)!==undefined).map(r=>[key(r),r]));
  const stages = (event.stages ?? []).filter(s=>s.status==='complete');
  if (!stages.length) return existing;
  for (const stage of stages) {
    const fetchRound = async (round: number) => {
      const r = await get(event.id,round,stage.id);
      if ('error' in r) throw new Error(`Event ${event.id}, stage ${stage.id}, round ${round}: ${r.error}`);
      if (identity(r.stage)!==stage.id || identity(r.round)!==round || !Array.isArray(r.pairings)) throw new Error(`Mismatched stage/round for event ${event.id}: requested ${stage.id}/${round}`);
      saved.set(key(r),r);return r;
    };
    let first = saved.get(`${stage.id}:1`);
    if (!first || !total(first)) first = await fetchRound(1);
    const count = total(first);
    if (!count || count > 100) throw new Error(`Invalid round total for event ${event.id}, stage ${stage.id}`);
    for (let round=2;round<=(fast ? 1 : count);round++) if (!saved.has(`${stage.id}:${round}`)) await fetchRound(round);
  }
  return [...saved.values()].sort((a,b)=>(identity(a.stage)!-identity(b.stage)!) || (identity(a.round)!-identity(b.round)!));
}
