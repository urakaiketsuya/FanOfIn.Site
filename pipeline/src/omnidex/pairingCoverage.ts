import type { OmnidexApiError, OmnidexPairingsResponse } from '@gatcg/shared';
import type { OmnidexEventBundle } from './cache.js';

type Response = OmnidexPairingsResponse | OmnidexApiError;
export interface CoverageGap {
  stage: number;
  round: number;
  reason: 'missing-stage' | 'missing-round' | 'unknown-round-total';
  status: 'unverified' | 'available-at-source' | 'unavailable-at-source';
  error?: string;
}
const id = (value: unknown): number | undefined => typeof value === 'number' ? value
  : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number' ? value.id : undefined;

/** Reporting only: source absence does not prove a round was never played. */
export async function auditPairingCoverage(bundle: OmnidexEventBundle,
  probe?: (event: number, round: number, stage: number) => Promise<Response>) {
  const stages = (bundle.event.stages ?? []).filter(stage => stage.status === 'complete');
  const gaps: CoverageGap[] = [];
  for (const stage of stages) {
    const saved = bundle.pairingsByRound.filter((r): r is OmnidexPairingsResponse => !('error' in r) && id(r.stage) === stage.id);
    const totals = saved.map(r => {
      const round: unknown = r.round;
      return round && typeof round === 'object' && 'total' in round ? round.total : undefined;
    });
    const valid = totals.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 100);
    const total = Math.max(0, ...valid);
    if (!saved.length || !total || valid.length !== totals.length) {
      gaps.push({ stage: stage.id, round: 1, reason: saved.length ? 'unknown-round-total' : 'missing-stage', status: 'unverified' });
    } else {
      for (let round = 1; round <= total; round++) {
        if (!saved.some(r => id(r.round) === round)) gaps.push({ stage: stage.id, round, reason: 'missing-round', status: 'unverified' });
      }
    }
  }
  if (probe) for (const gap of gaps) {
    try {
      const response = await probe(bundle.id, gap.round, gap.stage);
      if ('error' in response) {
        gap.error = response.error;
        if (response.error === 'Round not found.') gap.status = 'unavailable-at-source';
      } else if (id(response.stage) === gap.stage && id(response.round) === gap.round && Array.isArray(response.pairings)) {
        gap.status = 'available-at-source';
      } else gap.error = 'Mismatched or malformed stage/round response';
    } catch (error) { gap.error = String(error); }
  }
  return { id: bundle.id, stageMetadata: stages.length ? 'known' : 'unknown', gaps };
}
