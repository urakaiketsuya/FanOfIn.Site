import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { detectThemeDefinitions, summarizeDraftThemes } from '../../../shared/src/draftThemes.js';
import { reviewedThemes } from '../../../shared/src/reviewedThemes.js';

test('reviewed publication reproduces the Dante decision and source-bound evidence', () => {
    const raw = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const index = raw('../../../data/analysis/deck-card-index.json');
    const catalog = raw('../../.cache/cards.json');
    const saved = JSON.parse(raw('../../../data/reference/reviewed-theme-evidence.json'));
    const decision = JSON.parse(raw('../../../data/reference/elysian-dante-review.json'));
    const result = detectThemeDefinitions(JSON.parse(index), JSON.parse(catalog).cards, reviewedThemes);
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    assert.equal(result.evidence.length, 1);
    assert.equal(result.evidence[0].kind, 'theme');
    assert.equal(result.evidence[0].status, 'reviewed');
    assert.equal(result.evidence[0].matches.length, 17);
    assert.equal(result.evidence[0].matches.some(m => m.deckId === '64701:14399'), false);
    assert.deepEqual(result.evidence[0].matches.map(m => m.deckId).sort(), [...decision.comparison.retainedDeckIds, ...decision.comparison.addedDeckIds].sort());
    assert.deepEqual(result.evidence[0].paths, decision.comparison.proposed.paths);
    assert.deepEqual(saved, { ...result, status: 'reviewed', review: summarizeDraftThemes(result.evidence), sources: { indexSha256: hash(index), catalogSha256: hash(catalog), definitionsSha256: hash(JSON.stringify(reviewedThemes)) } });
});
