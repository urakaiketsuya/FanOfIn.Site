import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { detectThemeDefinitions } from '../../../shared/src/draftThemes.js';
import { themeRefinements } from '../../../shared/src/themeRefinements.js';
import type { DeckCardIndexData } from '@gatcg/shared';

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = read('../../../pipeline/.cache/cards.json').cards;
const tournament = read('../../../data/reference/held-tournament-refresh.json');
const community = read('../../../data/reference/held-community-theme-review.json');
const definitions = themeRefinements.filter(t => ['wolf-refinement', 'discorp-tower', 'discorp-officer'].includes(t.id));

test('tournament lookback accounts for every ID and reproduces new-list membership', () => {
    assert.equal(tournament.results.length + tournament.publishedEventsSkipped, tournament.endId - tournament.startId + 1);
    assert.equal(new Set(tournament.results.map((r: { id: number }) => r.id)).size, tournament.results.length);
    for (const result of tournament.results) {
        assert.ok(result.id >= tournament.startId && result.id <= tournament.endId);
        assert.equal(result.error, undefined);
    }
    assert.equal(tournament.index.decks.length, tournament.results.reduce((n: number, r: { decklistsFetched?: number }) => n + (r.decklistsFetched ?? 0), 0));
    assert.deepEqual(detectThemeDefinitions(tournament.index, catalog, definitions), tournament.review);
    assert.deepEqual(tournament.unmatched, []);
});

test('community witnesses reproduce membership and count distinct lists without treating handles as players', () => {
    assert.deepEqual(community.definitions, definitions);
    for (const source of community.sources) for (const entry of source.evidence) {
        const cardNames: string[] = [...new Set<string>(entry.matches.flatMap((m: any) => [...m.main, ...m.material].map(c => c.name)))];
        const encode = (lines: { name: string; quantity: number }[]): [number, number][] => lines.map(c => [cardNames.indexOf(c.name), c.quantity]);
        const index: DeckCardIndexData = { generatedAt: community.generatedAt, cardNames,
            decks: entry.matches.map((m: any) => ({ deckId: m.deckId, main: encode(m.main), material: encode(m.material), sideboard: [] })) };
        const detected = detectThemeDefinitions(index, catalog, definitions.filter(t => t.id === entry.id));
        assert.deepEqual(detected.evidence[0].matches, entry.matches.map((m: any) => ({ deckId: m.deckId, paths: m.paths })));
        for (const match of entry.matches) {
            assert.ok(match.declaredMainCount >= 60);
            assert.equal(match.main.reduce((n: number, c: { quantity: number }) => n + c.quantity, 0), match.declaredMainCount);
            assert.equal(new Set(match.main.map((c: { name: string }) => c.name)).size, match.main.length);
            assert.equal(match.signature, createHash('sha256').update(JSON.stringify({ main: match.main, material: match.material })).digest('hex'));
        }
        assert.equal(entry.distinctLists, new Set(entry.matches.map((m: any) => m.signature)).size);
        assert.deepEqual(entry.authorHandles, [...new Set(entry.matches.map((m: any) => m.author.trim().toLowerCase()).filter(Boolean))].sort());
    }
});

test('cross-source diversity excludes exact community copies of tournament lists', () => {
    for (const comparison of community.tournamentComparison) {
        const matches = community.sources.flatMap((s: any) => s.evidence.find((e: any) => e.id === comparison.id).matches);
        for (const deck of comparison.tournament) {
            assert.equal(deck.signature, createHash('sha256').update(JSON.stringify({ main: deck.main, material: deck.material })).digest('hex'));
        }
        assert.equal(comparison.communityDistinctLists, new Set(matches.map((m: any) => m.signature)).size);
        assert.equal(comparison.combinedDistinctLists, new Set([...matches, ...comparison.tournament].map((m: any) => m.signature)).size);
        assert.deepEqual(comparison.duplicateCommunityDeckIds, matches.filter((m: any) => comparison.tournament.some((t: any) => t.signature === m.signature)).map((m: any) => m.deckId));
    }
    const tower = community.tournamentComparison.find((c: any) => c.id === 'discorp-tower');
    assert.ok(tower.duplicateCommunityDeckIds.length > 0, 'fixture must exercise a real duplicate across sources');
});
