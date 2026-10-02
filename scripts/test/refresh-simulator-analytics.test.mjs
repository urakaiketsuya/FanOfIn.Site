import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const script = resolve('scripts/refresh-simulator-analytics.sh');
function fixture(t, mode) {
  const root = mkdtempSync(join(tmpdir(), 'analytics-race-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git'), runner = join(root, 'runner'), competitor = join(root, 'competitor');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(root, 'init', '--bare', '--initial-branch=main', remote);
  git(root, 'clone', remote, runner);
  git(runner, 'config', 'user.name', 'Test'); git(runner, 'config', 'user.email', 'test@example.com');
  mkdirSync(join(runner, 'data/simulator'), { recursive: true });
  writeFileSync(join(runner, 'data/simulator/summary.json'), 'old');
  writeFileSync(join(runner, 'data/manifest.json'), 'old');
  writeFileSync(join(runner, 'data/other.json'), 'old-other');
  git(runner, 'add', '.'); git(runner, 'commit', '-m', 'initial'); git(runner, 'push', 'origin', 'main');
  git(root, 'clone', remote, competitor);
  git(competitor, 'config', 'user.name', 'Other'); git(competitor, 'config', 'user.email', 'other@example.com');
  const bin = join(root, 'bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'npm'), `#!/usr/bin/env node
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
if (process.argv[2] === 'ci') process.exit(0);
const marker = ${JSON.stringify(join(root, 'attempts'))};
const n = fs.existsSync(marker) ? Number(fs.readFileSync(marker)) + 1 : 1;
fs.writeFileSync(marker, String(n));
const mode = ${JSON.stringify(mode)};
if (mode === 'race' && n === 1 || mode === 'exhaust') {
 const cwd = ${JSON.stringify(competitor)};
 const git = (...args) => execFileSync('git', args, {cwd, stdio:'pipe'});
 fs.writeFileSync(cwd+'/data/other.json', 'new-other-'+n);
 fs.writeFileSync(cwd+'/data/manifest.json', 'competing-manifest-'+n);
 git('add','.'); git('commit','-m','other refresh'); git('push','origin','main');
}
if(mode === 'noop') process.exit(0);
fs.writeFileSync('data/simulator/summary.json','fresh');
fs.writeFileSync('data/manifest.json',JSON.stringify({simulator:'fresh',other:fs.readFileSync('data/other.json','utf8')}));
`, { mode: 0o755 });
  if (mode === 'denied') writeFileSync(join(remote, 'hooks/pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const result = spawnSync('bash', [script], { cwd: runner, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', PATH: `${bin}:${process.env.PATH}` } });
  return { result, git, remote, runner, root };
}

test('rebuilds a conflicting manifest after a competing data push', t => {
  const f = fixture(t, 'race');
  assert.equal(f.result.status, 0, f.result.stderr);
  assert.equal(readFileSync(join(f.root, 'attempts'), 'utf8'), '2');
  assert.deepEqual(JSON.parse(f.git(f.remote, 'show', 'main:data/manifest.json')), {simulator:'fresh',other:'new-other-1'});
  assert.equal(f.git(f.runner, 'status', '--porcelain'), '');
});
test('unchanged snapshots succeed without a commit', t => {
  const f = fixture(t, 'noop');
  assert.equal(f.result.status, 0, f.result.stderr);
  assert.equal(f.git(f.remote, 'rev-list', '--count', 'main'), '1');
});
test('permission rejection fails without pointless retries', t => {
  const f = fixture(t, 'denied');
  assert.notEqual(f.result.status, 0);
  assert.equal(readFileSync(join(f.root, 'attempts'), 'utf8'), '1');
  assert.match(f.result.stderr, /Push failed without a remote update/);
});
test('continued competing pushes stop after five attempts without overwriting remote data', t => {
  const f = fixture(t, 'exhaust');
  assert.notEqual(f.result.status, 0);
  assert.equal(readFileSync(join(f.root, 'attempts'), 'utf8'), '5');
  assert.equal(f.git(f.remote, 'show', 'main:data/other.json'), 'new-other-5');
  assert.equal(f.git(f.remote, 'show', 'main:data/simulator/summary.json'), 'old');
});
