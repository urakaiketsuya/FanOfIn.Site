import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStoreDirectory, upcomingStoreEvents, type OmnidexEventSummary } from '@gatcg/shared';

const address = '1F, No. 9 Leli Street\nTaichung District, New Taipei City\nTaiwan';
function event(id: number, date: string): OmnidexEventSummary {
  return {
    id, name: '8號積分', date, format: 'standard', status: 'complete', structure: 'rounds', type: 'swiss', category: 'regular',
    ranked: true, decklists: false, playerCount: 8, seasonId: null, seasonName: null, seasonSlug: null,
    hostName: 'Card House No. 8', hostId: 441, hostAddress: address, hostCountry: 'TW', setting: 'physical', url: '',
  };
}

test('reviewed address corrections preserve weekly evidence from the matching source venue', () => {
  const stores = buildStoreDirectory([
    event(1, '2026-10-13T12:30:00.000Z'),
    event(2, '2026-10-06T12:30:00.000Z'),
    event(3, '2026-09-29T12:30:00.000Z'),
  ], [], {
    441: { kind: 'store', address: '1F, No. 9 Leli St, Tucheng District, New Taipei City 236, Taiwan', evidence: 'Verified address correction' },
  });

  assert.equal(stores[0].address, '1F, No. 9 Leli St, Tucheng District, New Taipei City 236, Taiwan');
  assert.equal(stores[0].kind, 'store');
  assert.equal(stores[0].weeklyEvidence?.length, 3);
  assert.deepEqual(upcomingStoreEvents(stores[0], Date.parse('2026-10-16T00:00:00.000Z')).map(item => item.date.slice(0, 10)), [
    '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10',
  ]);
});
