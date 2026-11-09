import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combinedResearchDraft, researchFindings, researchDraft, researchStatus, type ResearchFinding } from '../src/features/packages/researchQueue';
const report = JSON.parse(readFileSync(new URL('../../data/experiments/package-mechanics.json', import.meta.url), 'utf8'));
test('stable research identities survive evidence refresh and flag changed evidence', async () => {
  const first = (await researchFindings('experimental', { ...report, candidates: [report.candidates[0]] }))[0];
  const updatedReport = structuredClone(report); updatedReport.candidates[0].usage.togetherDecks++;
  const updated = (await researchFindings('experimental', { ...updatedReport, candidates: [updatedReport.candidates[0]] }))[0];
  assert.equal(first.research.key, updated.research.key);
  assert.notEqual(first.research.fingerprint, updated.research.fingerprint);
  const draft = researchDraft(first, new Map());
  assert.equal(researchStatus(undefined, first), 'Needs review');
  assert.equal(researchStatus(draft, first), 'Draft');
  assert.equal(researchStatus({ ...draft, status: 'published' }, first), 'Approved');
  assert.equal(researchStatus({ ...draft, status: 'published' }, updated), 'Updated evidence');
  assert.equal(researchStatus({ ...draft, research: { ...draft.research!, dismissed: true } }, first), 'Dismissed');
  assert.ok(first.href.startsWith('/cards/packages?review=1'));
});
test('all published research sources adapt without converting pools into asserted tested ratios', async () => {
  for (const [kind, path] of [['suggested', 'analysis/package-candidates.json'], ['win-rate', 'analysis/win-rate-packages.json'], ['construction', 'experiments/package-construction.json']] as const) {
    const data = JSON.parse(readFileSync(new URL(`../../data/${path}`, import.meta.url), 'utf8'));
    const findings = await researchFindings(kind, data);
    assert.ok(findings.length > 0);
    assert.equal(new Set(findings.map(f => f.research.key)).size, findings.length);
    for (const finding of findings) {
      const draft = researchDraft(finding, new Map());
      assert.equal(draft.status, 'draft');
      assert.ok(draft.definition.name.length <= 80);
      assert.ok(draft.definition.cards.every(card => card.quantity === 1 && finding.cards.includes(card.name)));
    }
  }
});

const finding = (key: string, cards: string[], initialCards = cards): ResearchFinding => ({
  research: { kind: 'experimental', key, fingerprint: key, dismissed: false },
  name: key, cards, initialCards, summary: '', evidence: [], href: '/cards/packages',
});
test('combined findings deduplicate full pools and start an independent unapproved draft', () => {
  const a = finding('a', ['Shared', 'Optional', 'A'], ['A']);
  const b = { ...finding('b', ['Shared', 'B']), sections: new Map([['B', 'material' as const]]) };
  const draft = combinedResearchDraft([a, b], new Map(), 'new-package');
  assert.deepEqual(draft.definition.cards, [
    { name: 'A', quantity: 1, section: 'main' }, { name: 'B', quantity: 1, section: 'material' },
    { name: 'Optional', quantity: 1, section: 'main' }, { name: 'Shared', quantity: 1, section: 'main' },
  ]);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.revision, 0);
  assert.equal(draft.research, undefined);
  assert.deepEqual(combinedResearchDraft([b, a], new Map(), 'new-package'), draft);
  assert.deepEqual(a.initialCards, ['A']);
});
test('combination rejects duplicate selections, oversized pools and conflicting sections without truncation', () => {
  const a = finding('a', ['Shared']);
  assert.throws(() => combinedResearchDraft([a, a], new Map(), 'id'), /at least two/);
  assert.throws(() => combinedResearchDraft([a, finding('b', Array.from({ length: 60 }, (_, i) => `Card ${i}`))], new Map(), 'id'), /up to 60/);
  assert.throws(() => combinedResearchDraft([
    { ...a, sections: new Map([['Shared', 'main']]) },
    { ...finding('b', ['Shared']), sections: new Map([['Shared', 'material']]) },
  ], new Map(), 'id'), /Conflicting sections/);
});
