import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [action, profile, ...flags] = process.argv.slice(2);
if (!['grant', 'revoke'].includes(action) || !profile || flags.some(flag => !['--remote', '--local'].includes(flag)) || flags.length !== 1) {
  throw new Error('Usage: node scripts/admin-access.mjs grant|revoke PROFILE_SLUG --local|--remote');
}
if (!/^[a-zA-Z0-9_-]{1,80}$/.test(profile)) throw new Error('Pass the profile address segment, without the URL.');
const remote = flags[0] === '--remote';
const selector = `SELECT user_id FROM profile_aliases WHERE slug='${profile.toLowerCase()}'`;
const sql = action === 'grant'
  ? `INSERT INTO admin_users(user_id) ${selector} ON CONFLICT(user_id) DO NOTHING; SELECT count(*) AS administrators_matched FROM admin_users WHERE user_id IN (${selector});`
  : `DELETE FROM admin_users WHERE user_id IN (${selector}); SELECT count(*) AS administrators_matched FROM admin_users WHERE user_id IN (${selector});`;
const output = execFileSync(process.execPath, ['../node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', remote ? 'fanofin-accounts-production' : 'fanofin-accounts-dev', flags[0], ...(remote ? ['--env', 'production'] : []), '--command', sql, '--json'], { cwd: fileURLToPath(new URL('../account-worker/', import.meta.url)), encoding: 'utf8' });
const result = JSON.parse(output);
const count = result.at(-1)?.results?.[0]?.administrators_matched;
if (count !== (action === 'grant' ? 1 : 0)) throw new Error('Account access was not updated. Check the profile address and applied migrations.');
console.log(action === 'grant' ? 'Administrator access granted to the existing account.' : 'Administrator access revoked.');
