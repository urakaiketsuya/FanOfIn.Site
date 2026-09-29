import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
function run(label, command, args, workspace = '.', env = {}) {
  console.log(`\nRelease check: ${label}`);
  const result = spawnSync(command, args, { cwd: path.join(root, workspace), stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function tests(workspace, folder, env = {}) {
  const files = readdirSync(path.join(root, workspace, folder), { recursive: true })
    .filter(file => /\.test\.tsx?$/.test(file)).sort().map(file => path.join(folder, file));
  if (!files.length) throw new Error(`No tests discovered in ${workspace}`);
  run(`${workspace} tests`, process.execPath, ['--import', 'tsx', '--test', ...files], workspace, env);
}
for (const workspace of ['shared', 'pipeline', 'worker', 'account-worker', 'account-bff', 'api-worker']) {
  run(`${workspace} typecheck`, 'npx', ['--no-install', 'tsc', '--noEmit', '-p', '.'], workspace);
}
run('release tooling tests', process.execPath, ['--test', 'scripts/test/smoke-release.test.mjs']);
run('dependency audit', 'npm', ['audit', '--audit-level=high']);
run('app lint', 'npm', ['run', 'lint', '-w', 'app']);
tests('app', 'test', { TSX_TSCONFIG_PATH: 'tsconfig.app.json' });
tests('pipeline', 'src');
tests('account-worker', 'test');
run('ingestion tests', 'npm', ['run', 'worker:test']);
run('public API tests', 'npm', ['run', 'api:test']);
run('published artifacts', process.execPath, ['--import', 'tsx', 'scripts/check-release-data.ts']);
run('production build and app typecheck', 'npm', ['run', 'build']);
run('release identity', process.execPath, ['scripts/write-release-metadata.mjs']);
console.log('\nAutomated release checks passed. Complete the manual launch checklist before release.');
