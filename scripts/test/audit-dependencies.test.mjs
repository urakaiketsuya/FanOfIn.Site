import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAudit, exception, readAuditResult } from '../audit-dependencies.mjs';
const now = new Date('2026-11-18T12:00:00Z');
function fixture() {
  return {
    report: { auditReportVersion: 2, metadata: { vulnerabilities: {} }, vulnerabilities: {
      picomatch: { severity: 'high', nodes: ['node_modules/picomatch'], via: [{ name: 'picomatch', url: exception.advisory }] },
      vite: { severity: 'high', nodes: ['node_modules/vite'], via: ['picomatch'] },
    } },
    lock: { packages: { 'node_modules/picomatch': { dev: true }, 'node_modules/vite': { dev: true } } },
  };
}
test('approved advisory and its exclusively development dependency chain are accepted before expiry', () => {
  const { report, lock } = fixture();
  assert.deepEqual(assessAudit(report, lock, { now }), { blocked: [], accepted: ['picomatch', 'vite'] });
});
test('expiry is enforced at the boundary, including indirect dependents', () => {
  const { report, lock } = fixture();
  assert.deepEqual(assessAudit(report, lock, { now: new Date(exception.expires) }).blocked, ['picomatch', 'vite']);
});
test('production audit never applies the exception', () => {
  const { report, lock } = fixture();
  assert.deepEqual(assessAudit(report, lock, { now, production: true }).blocked, ['picomatch', 'vite']);
});
test('production, mixed, or unknown installed nodes are blocked', () => {
  for (const dev of [false, undefined]) {
    const { report, lock } = fixture();
    lock.packages['node_modules/picomatch'].dev = dev;
    assert.deepEqual(assessAudit(report, lock, { now }).blocked, ['picomatch', 'vite']);
  }
  const { report, lock } = fixture();
  report.vulnerabilities.picomatch.nodes.push('node_modules/other/picomatch');
  assert.deepEqual(assessAudit(report, lock, { now }).blocked, ['picomatch', 'vite']);
});
test('additional advisories, missing references and cycles cannot inherit the exception', () => {
  for (const via of [{ name: 'picomatch', url: 'https://github.com/advisories/another' }, 'missing', 'vite']) {
    const { report, lock } = fixture();
    report.vulnerabilities.picomatch.via.push(via);
    assert.deepEqual(assessAudit(report, lock, { now }).blocked, ['picomatch', 'vite']);
  }
});
test('unrelated high and critical findings block; existing moderate threshold is preserved', () => {
  const { report, lock } = fixture();
  for (const severity of ['high', 'critical', 'moderate']) {
    report.vulnerabilities.other = { severity, nodes: ['node_modules/other'], via: [] };
    assert.deepEqual(assessAudit(report, lock, { now }).blocked, severity === 'moderate' ? [] : ['other']);
  }
});
test('audit execution, network, malformed JSON and schema failures fail closed', () => {
  for (const result of [
    { status: 2, stdout: '{}' }, { status: 0, error: new Error('offline') },
    { status: 0, stdout: 'not json' }, { status: 1, stdout: JSON.stringify({ error: { code: 'ENOAUDIT' } }) },
    { status: 0, stdout: JSON.stringify({ auditReportVersion: 3 }) },
    { status: 1, stdout: JSON.stringify({ auditReportVersion: 2, metadata: { vulnerabilities: {} }, vulnerabilities: {} }) },
  ]) assert.throws(() => readAuditResult(result));
  const { report } = fixture();
  assert.deepEqual(readAuditResult({ status: 1, stdout: JSON.stringify(report) }), report);
});
