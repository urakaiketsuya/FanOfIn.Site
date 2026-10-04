import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectDraftThemes, summarizeDraftThemes, summarizeThemeRecurrence, type DraftTheme } from '../../../shared/src/draftThemes.js';
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
    assert.deepEqual(summarizeDraftThemes(result.evidence), saved.review);
    const dante = result.evidence.find(e => e.id === 'draft-elysian-dante')!;
    assert.equal(dante.matches.filter(m => m.paths.every(p => p.path === 1)).length, 6);
});
test('review summaries distinguish label overlap from alternative path overlap', () => {
    const definition: DraftTheme = { id: 'a', name: 'A', kind: 'theme', status: 'draft', paths: [[], []] };
    const match = (deckId: string, ...paths: number[]) => ({ deckId, paths: paths.map(path => ({ path, cards: [] })) });
    const result = summarizeDraftThemes([
        { ...definition, matches: [match('1', 0), match('1', 0), match('2', 0, 1), match('3', 1)] },
        { ...definition, id: 'b', matches: [match('2', 0), match('4', 0)] },
        { ...definition, id: 'empty', matches: [] },
    ]);
    assert.deepEqual(result[0], { id: 'a', decks: 3, exclusiveDecks: 2,
        recurrence: { events: 0, players: 0, returningPlayers: 0, largestEventDecks: 0, unknownDecks: 3 },
        paths: [{ path: 0, decks: 2, exclusiveDecks: 1 }, { path: 1, decks: 2, exclusiveDecks: 1 }],
        overlaps: [{ id: 'b', decks: 1, jaccard: 0.25 }] });
    assert.equal(result[1].exclusiveDecks, 1);
    assert.deepEqual(result[1].overlaps, [{ id: 'a', decks: 1, jaccard: 0.25 }]);
    assert.equal(result[2].decks, 0);
    assert.deepEqual(result[2].overlaps, []);
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

test('recurrence separates repeated players, event concentration, duplicates and unknown IDs', () => {
    assert.deepEqual(summarizeThemeRecurrence(['10:a', '10:b', '11:a', '10:a', 'bad', ':a', '10:', '10:a:x']), {
        events: 2, players: 2, returningPlayers: 1, largestEventDecks: 2, unknownDecks: 4,
    });
    assert.deepEqual(summarizeThemeRecurrence([]), {
        events: 0, players: 0, returningPlayers: 0, largestEventDecks: 0, unknownDecks: 0,
    });
});
