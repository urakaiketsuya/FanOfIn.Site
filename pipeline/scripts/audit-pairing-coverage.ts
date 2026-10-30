import { readFile } from 'node:fs/promises';
import type { OmnidexIndexData } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../src/omnidex/cache.js';
import { auditPairingCoverage } from '../src/omnidex/pairingCoverage.js';
import { omnidexApi } from '../src/omnidex/api.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import { sleep } from '../src/lib/http.js';
import { config } from '../src/config.js';

const root = new URL('../../', import.meta.url);
const index: OmnidexIndexData = JSON.parse(await readFile(new URL('data/omnidex/index.json', root), 'utf8'));
const live = process.argv.includes('--live');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9) ?? '/tmp/pairing-coverage.json';
const exceptions = [];
let eligible = 0, complete = 0, unknown = 0;
const statuses = { unverified: 0, 'available-at-source': 0, 'unavailable-at-source': 0 };
for (const event of index.events) {
  if (event.status !== 'complete' || event.setting !== 'physical' || Date.parse(event.date) > Date.parse(index.generatedAt)) continue;
  const bundle: OmnidexEventBundle = JSON.parse(await readFile(new URL(`data/omnidex/events/${event.id}.json`, root), 'utf8'));
  if (/team/i.test(bundle.event.format) || ('error' in bundle.teams ? bundle.teams.error !== 'Not a team event.' : bundle.teams.length > 0)) continue;
  eligible++;
  const report = await auditPairingCoverage(bundle, live ? async (id, round, stage) => {
    await sleep(config.crawlRequestDelayMs);
    return omnidexApi.getPairings(id, round, stage);
  } : undefined);
  if (report.stageMetadata === 'unknown') unknown++;
  else if (!report.gaps.length) complete++;
  if (report.stageMetadata === 'unknown' || report.gaps.length) exceptions.push(report);
  for (const gap of report.gaps) statuses[gap.status]++;
}
const summary = { eligible, complete, unknownStageMetadata: unknown, gapStatuses: statuses };
await writeJsonAtomic(output, { checkedAt: new Date().toISOString(), sourceGeneratedAt: index.generatedAt, live, summary, exceptions }, 2);
console.log(JSON.stringify({ output, ...summary }));
