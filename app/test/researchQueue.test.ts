import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { researchFindings, researchDraft, researchStatus } from '../src/features/packages/researchQueue';
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
