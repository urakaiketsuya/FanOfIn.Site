import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OmnidexEventBundle } from './cache.js';
import { auditPairingCoverage } from './pairingCoverage.js';
const bundle = { id: 1, event: { stages: [{ id: 1, status: 'complete' }, { id: 2, status: 'complete' }] }, pairingsByRound: [{ stage: { id: 1 }, round: { id: 1, total: 2 }, pairings: [] }] } as unknown as OmnidexEventBundle;
test('separates locally missing rounds from source-unavailable declarations without mutating the bundle', async () => {
  const before = JSON.stringify(bundle);
  const result = await auditPairingCoverage(bundle, async (_, round, stage) => stage === 2 ? { error: 'Round not found.' } : { stage, round, pairings: [] });
  assert.deepEqual(result.gaps.map(g => [g.stage, g.round, g.reason, g.status]), [[1, 2, 'missing-round', 'available-at-source'], [2, 1, 'missing-stage', 'unavailable-at-source']]);
  assert.equal(JSON.stringify(bundle), before);
});
test('offline, transport, other API errors and misrouted responses stay unverified', async () => {
  for (const probe of [undefined, async () => { throw Error('network'); }, async () => ({ error: 'Forbidden' }), async () => ({ stage: 99, round: 1, pairings: [] })]) {
    const result = await auditPairingCoverage(bundle, probe);
    assert(result.gaps.every(g => g.status === 'unverified'));
  }
});
test('unknown stages and invalid totals do not imply complete coverage', async () => {
  assert.equal((await auditPairingCoverage({ ...bundle, event: { ...bundle.event, stages: [] } })).stageMetadata, 'unknown');
  const invalid = { ...bundle, pairingsByRound: [{ stage: 1, round: 1, pairings: [] }] };
  assert.equal((await auditPairingCoverage(invalid)).gaps[0].reason, 'unknown-round-total');
});
