import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { detectThemeDefinitions, summarizeDraftThemes } from '../../shared/src/draftThemes.js';
import { reviewedThemes } from '../../shared/src/reviewedThemes.js';

const root = new URL('../../', import.meta.url);
const indexRaw = await readFile(new URL('data/analysis/deck-card-index.json', root), 'utf8');
const catalogRaw = await readFile(new URL('pipeline/.cache/cards.json', root), 'utf8');
const result = detectThemeDefinitions(JSON.parse(indexRaw), JSON.parse(catalogRaw).cards, reviewedThemes);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const output = { ...result, status: 'reviewed', review: summarizeDraftThemes(result.evidence), sources: { indexSha256: sha256(indexRaw), catalogSha256: sha256(catalogRaw), definitionsSha256: sha256(JSON.stringify(reviewedThemes)) } };
const target = new URL('data/reference/reviewed-theme-evidence.json', root);
const temporary = new URL(`${target.href}.${randomUUID()}.tmp`);
try {
    await writeFile(temporary, JSON.stringify(output, null, 2) + '\n');
    await rename(temporary, target);
} finally {
    await rm(temporary, { force: true });
}
console.table(result.evidence.map(entry => ({ name: entry.name, decks: entry.matches.length })));
