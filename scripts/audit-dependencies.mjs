import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const exception = Object.freeze({
  advisory: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  package: 'picomatch',
  expires: '2026-12-02T00:00:00Z',
});

// Approved 2026-11-18: build/test dependencies only, while no upstream fix exists.
// Keep production auditing independent; never suppress unrelated advisories.
export function assessAudit(report, lock, { now = new Date(), production = false } = {}) {
  assert.equal(report.auditReportVersion, 2, 'Unsupported audit response');
  assert.ok(!report.error && report.vulnerabilities && report.metadata?.vulnerabilities, 'Invalid audit response');
  assert.ok(Number.isFinite(now.getTime()), 'Invalid audit date');
  const vulnerabilities = report.vulnerabilities;
  const active = now.getTime() < Date.parse(exception.expires);
  function exempt(name, visiting = new Set()) {
    const item = vulnerabilities[name];
    if (production || !active || !item || visiting.has(name)) return false;
    if (!Array.isArray(item.nodes) || !item.nodes.length || !item.nodes.every(node => lock.packages?.[node]?.dev === true)) return false;
    if (!Array.isArray(item.via) || !item.via.length) return false;
    const seen = new Set([...visiting, name]);
    return item.via.every(via => typeof via === 'string'
      ? exempt(via, seen)
      : name === exception.package && via.name === exception.package && via.url === exception.advisory);
  }
  const blocked = [], accepted = [];
  for (const [name, item] of Object.entries(vulnerabilities)) {
    assert.ok(['info', 'low', 'moderate', 'high', 'critical'].includes(item.severity), `Invalid severity: ${name}`);
    if (!['high', 'critical'].includes(item.severity)) continue;
    (exempt(name) ? accepted : blocked).push(name);
  }
  return { blocked, accepted };
}

export function readAuditResult(result) {
  assert.ok(!result.error && !result.signal && [0, 1].includes(result.status), 'npm audit failed to run');
  const report = JSON.parse(result.stdout);
  assert.equal(report.auditReportVersion, 2, 'Unsupported audit response');
  assert.ok(!report.error && report.metadata?.vulnerabilities && report.vulnerabilities, 'Invalid audit response');
  // A failing process with no reported vulnerabilities is not a successful audit.
  assert.ok(result.status === 0 || Object.keys(report.vulnerabilities).length > 0, 'npm audit failed without findings');
  return report;
}

export function auditDependencies() {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const production of [true, false]) {
    const args = ['audit', '--json', '--audit-level=high', ...(production ? ['--omit=dev'] : [])];
    const report = readAuditResult(spawnSync('npm', args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 }));
    const { blocked, accepted } = assessAudit(report, lock, { production });
    if (accepted.length) console.warn(`Temporary development-only exception ${exception.advisory}, expires ${exception.expires}: ${accepted.join(', ')}`);
    assert.equal(blocked.length, 0, `Dependency audit blocked: ${blocked.join(', ')}`);
    console.log(`${production ? 'Production' : 'Full'} dependency audit passed`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) auditDependencies();
