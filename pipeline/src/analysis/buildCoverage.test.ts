import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssignmentDiagnostic, buildOutcomeCoverage } from './buildCoverage.js';
import { exactBuildKey } from './frozenBuilds.js';
import type { DeckSignature } from './decklists.js';

test('assignment diagnosis separates unseen material from main similarity and missing Champion', () => {
  const deck = { championName: 'C', mainCards: [{ name: 'A', quantity: 7 }], materialCards: [{ name: 'C', quantity: 1 }] } as DeckSignature;
  const diagnose = buildAssignmentDiagnostic([{ key: exactBuildKey(deck) }], 0.7);
  assert.equal(diagnose(deck), 'assigned');
  assert.equal(diagnose({ ...deck, championName: null }), 'missingChampion');
  assert.equal(diagnose({ ...deck, materialCards: [] }), 'unseenMaterial');
  assert.equal(diagnose({ ...deck, mainCards: [{ name: 'A', quantity: 10 }] }), 'assigned');
  assert.equal(diagnose({ ...deck, mainCards: [{ name: 'A', quantity: 11 }] }), 'mainBelowThreshold');
});

test('outcome partition retains unknown builds, absent cells and subthreshold evidence', () => {
  const row = (a: string, games: number) => ({ a, b: 'opponent', games, aWins: games, bWins: 0, ties: 0 });
  const result = buildOutcomeCoverage([row('thin', 4), row('ready', 5)], [row('new', 2), row('thin', 3), row('ready', 4)], 12, 5);
  assert.deepEqual(result, { unassignedBuild: 3, noPriorMatchup: 2, insufficientPriorMatches: 3, evaluated: 4 });
  assert.equal(Object.values(result).reduce((a, b) => a + b), 12);
  assert.throws(() => buildOutcomeCoverage([], [row('new', 2)], 1, 5));
});
