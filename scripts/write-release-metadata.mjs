import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
writeFileSync(new URL('../app/dist/release.json', import.meta.url), JSON.stringify({ revision, dirty, builtAt: new Date().toISOString() }) + '\n');
console.log(`Release metadata: ${revision}${dirty ? ' (uncommitted changes)' : ''}`);
