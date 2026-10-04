import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectDraftThemes } from '../../../shared/src/draftThemes.js';
import type { DeckCardIndexData } from '../../../shared/src/analysis-types.js';
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = read('../../.cache/cards.json').cards;
const index: DeckCardIndexData = read('../../../data/analysis/deck-card-index.json');
const counts = [5, 3, 17, 1, 13, 139, 8, 489, 215, 57, 77, 1, 78, 162, 155];
test('reviewed population and all draft memberships remain reproducible', () => {
    const result = detectDraftThemes(index, catalog);
    assert.equal(result.population, 58750);
    assert.equal(result.eligibleDecks, 58659);
    assert.deepEqual(result.evidence.map(e => e.matches.length), counts);
    const saved = read('../../../data/reference/draft-theme-evidence.json');
    assert.deepEqual(result.evidence, saved.evidence);
    const dante = result.evidence.find(e => e.id === 'draft-elysian-dante')!;
    assert.equal(dante.matches.filter(m => m.paths.every(p => p.path === 1)).length, 6);
});
test('sideboard, zero copies, duplicate names, and wrong sections cannot create token packages', () => {
    const base = index.decks[0];
    const fixture = (main: [number, number][], material: [number, number][], sideboard: [number, number][]) => ({ ...index, cardNames: ['Direwolf Alpha', 'Dire Requiem'], decks: [{ ...base, main, material, sideboard }] });
    const wolves = (value: DeckCardIndexData) => detectDraftThemes(value, catalog).evidence.find(e => e.id === 'draft-wolf-tokens')!.matches;
    assert.equal(wolves(fixture([[0, 1]], [], [[1, 1]])).length, 0);
    assert.equal(wolves(fixture([[0, 1], [1, 0]], [], [])).length, 0);
    assert.equal(wolves(fixture([[0, 1], [0, 3]], [], [])).length, 0);
    assert.equal(wolves(fixture([[0, 1]], [[1, 1]], [])).length, 0);
    const valid = fixture([[0, 1], [1, 1]], [], []);
    valid.decks.push(valid.decks[0]);
    assert.equal(wolves(valid).length, 1);
    assert.equal(wolves(fixture([[0, 1], [1, 1]], Array.from({ length: 13 }, () => [0, 1]), [])).length, 0);
});
test('missing curated anchors fail explicitly', () => {
    assert.throws(() => detectDraftThemes({ ...index, decks: [] }, []), /Missing draft-theme anchor/);
});
