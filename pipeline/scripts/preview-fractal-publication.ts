/** Exercise the real publisher against temporary files; never publish to live data. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseStrategyStore } from '../../shared/src/archetypeRules.js';
import { writeReferenceArchetypes } from '../src/analysis/writeReferenceArchetypes.js';

const root = new URL('../../', import.meta.url);
const read = async (file: string) => readFile(new URL(file, root), 'utf8');
const json = async (file: string) => JSON.parse(await read(file));
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const protectedFiles = ['data/reference/fractal-archetypes.json', 'data/analysis/reference-archetypes.json',
    'data/analysis/curated-strategies.json', 'data/analysis/archetype-taxonomy.json', 'data/manifest.json'];
const before = await Promise.all(protectedFiles.map(read));
const draftText = await read('data/reference/review/strategy-drafts.json');
const store = parseStrategyStore(draftText);
assert.equal(store.entries.length, 0, 'Trial expects unaccepted review drafts.');
assert.equal(store.drafts.length, 5);
const review = await json('data/reference/review/mechanics-review.json');
assert.equal(hash(before[0]), review.publicationBase.sha256, 'Reconcile changed live reference before trial.');
const reconciliation = await json('data/reference/review/source-reconciliation.json');
assert.equal(hash(await read('data/reference/review/mechanics-review.json')), reconciliation.reviewSha256);
assert(reconciliation.definitions.every((d: { existingRuleIdentical: boolean | null }) => d.existingRuleIdentical !== false), 'Existing parent changed.');
const index = await json('data/analysis/deck-card-index.json');
const catalog = (await json('pipeline/.cache/cards.json')).cards;
const sightings = (await json('data/analysis/deck-sightings.json')).sightings;
const builds = (await json('data/analysis/archetype-taxonomy.json')).clusters;
const assessment = await json('data/reference/review/assessment.json');
for (const [file, expected] of Object.entries(assessment.inputHashes))
    assert.equal(hash(await read(file)), expected, `Rebuild stale assessment: ${file}`);
const temp = await mkdtemp(path.join(tmpdir(), 'foi-publication-trial-'));
try {
    await mkdir(path.join(temp, 'reference'));
    await mkdir(path.join(temp, 'analysis'));
    await writeFile(path.join(temp, 'reference/fractal-archetypes.json'), before[0]);
    const trial = { version: 1, entries: store.drafts.map(entry => ({ ...entry,
        definition: { ...entry.definition, reviewStatus: 'accepted' } })), drafts: [] };
    const publication = path.join(temp, 'trial.json');
    await writeFile(publication, JSON.stringify(trial));
    await writeReferenceArchetypes(temp, index, catalog, sightings, builds, publication);
    const result = JSON.parse(await readFile(path.join(temp, 'analysis/curated-strategies.json'), 'utf8'));
    assert.equal(result.definitions.length, 5);
    for (const evidence of result.evidence) {
        const expected = assessment.strategies.find((s: { id: string }) => s.id === evidence.id);
        assert(expected, `Unexpected published definition: ${evidence.id}`);
        assert.deepEqual([...evidence.deckIds].sort(), [...expected.deckIds].sort(), `Membership changed: ${evidence.id}`);
    }
    for (let i = 0; i < protectedFiles.length; i++) assert.equal(await read(protectedFiles[i]), before[i]);
    const report = {
        version: 1, status: 'trial-passed', published: false,
        draftSha256: hash(draftText), baseFileSha256: hash(before[0]), inputHashes: assessment.inputHashes,
        scope: 'Actual publisher run in temporary files with trial-only acceptance. Drafts remain unreviewed; live data unchanged. Mechanics remain unverified.',
        checks: ['Source hash matches reconciled curator base', 'Parent dependency accepted within trial',
            'Preview and matching card names pass publisher validation', 'All five memberships equal prior review evidence',
            'Live reference, analyses, taxonomy, and manifest remain byte-identical'],
        strategies: result.evidence.map((e: { id: string; deckIds: string[]; players: number; events: number; confidence: string }) => ({
            id: e.id, name: store.drafts.find(d => d.definition.id === e.id)!.definition.name,
            decks: e.deckIds.length, players: e.players, events: e.events, confidence: e.confidence,
        })),
    };
    await writeFile(new URL('data/reference/review/publication-preview.json', root), JSON.stringify(report, null, 2) + '\n');
    console.log('Publication trial passed for all five strategies; live artifacts unchanged.');
} finally {
    await rm(temp, { recursive: true, force: true });
}
