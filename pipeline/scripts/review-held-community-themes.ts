import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodeCardLines, type DeckLine, type DeckCardIndexData } from '@gatcg/shared';
import { listCachedDecks } from '../src/shoutatyourdecks/cache.js';
import { listCachedTcgArchitectDecks } from '../src/tcgarchitect/cache.js';
import { shouldKeepDeck } from '../src/shoutatyourdecks/filter.js';
import { shouldKeepTcgArchitectDeck } from '../src/tcgarchitect/filter.js';
import { buildCardIndex, resolveCard, type CardSignature } from '../src/cards/catalog.js';
import { writeJsonAtomic } from '../src/lib/atomicWrite.js';
import { detectThemeDefinitions, type DraftThemeMatch } from '../../shared/src/draftThemes.js';
import { themeRefinements } from '../../shared/src/themeRefinements.js';

const root = new URL('../../', import.meta.url);
const catalogRaw = await readFile(new URL('pipeline/.cache/cards.json', root), 'utf8');
const catalog: CardSignature[] = JSON.parse(catalogRaw).cards;
const cardIndex = buildCardIndex(catalog);
const definitions = themeRefinements.filter(t => ['wolf-refinement', 'discorp-tower', 'discorp-officer'].includes(t.id));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// Aggregate duplicate lines and preserve sections so list diversity cannot be inflated by serialization.
const canonical = (lines: DeckLine[]) => {
    const counts = new Map<string, number>();
    for (const line of lines) if (line.quantity > 0) {
        const name = resolveCard(cardIndex, line.name)?.name ?? line.name;
        counts.set(name, (counts.get(name) ?? 0) + line.quantity);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, quantity]) => ({ name, quantity }));
};
interface CommunityWitness {
    deckId: string; url: string; title: string; author: string;
    format: string; formatConfidence: string; fetchedAt: string; declaredMainCount: number | null;
    main: DeckLine[]; material: DeckLine[]; paths: DraftThemeMatch['paths']; signature: string;
}
interface CommunitySourceReview {
    source: string; cachedRecords: number; excludedCountMismatches: string[];
    completeQualifyingLists: number; eligibleDecks: number; inputSha256: string;
    evidence: { id: string; matches: CommunityWitness[]; distinctLists: number; authorHandles: string[] }[];
}
const sources: CommunitySourceReview[] = [];
for (const source of ['tcgarchitect', 'shoutatyourdecks'] as const) {
    const records = source === 'tcgarchitect' ? await listCachedTcgArchitectDecks() : await listCachedDecks();
    const excludedCountMismatches: string[] = [];
    const decks = records.flatMap(record => {
        const deck = record.deck;
        if (!deck) return [];
        const keep = source === 'tcgarchitect' ? shouldKeepTcgArchitectDeck(deck as Parameters<typeof shouldKeepTcgArchitectDeck>[0]) : shouldKeepDeck(deck);
        const actualMainCount = deck.mainDeck.reduce((sum, c) => sum + Math.max(0, c.quantity), 0);
        if (!keep || actualMainCount < 60) return [];
        if (deck.mainCount !== actualMainCount) { excludedCountMismatches.push(deck.id); return []; }
        return [{ deckId: `${source}:${deck.id}`, url: deck.url, title: deck.title, author: deck.author,
            format: deck.format ?? 'UNKNOWN', formatConfidence: deck.formatConfidence ?? 'unknown', fetchedAt: deck.fetchedAt, declaredMainCount: deck.mainCount,
            main: canonical(deck.mainDeck), material: canonical(deck.materialDeck) }];
    }).sort((a, b) => a.deckId.localeCompare(b.deckId));
    const cardNames = [...new Set(decks.flatMap(d => [...d.main, ...d.material].map(c => c.name)))].sort();
    const nameIds = new Map(cardNames.map((name, i) => [name, i]));
    const encode = (lines: DeckLine[]): [number, number][] => lines.map(c => [nameIds.get(c.name)!, c.quantity]);
    const index: DeckCardIndexData = { generatedAt: new Date().toISOString(), cardNames,
        decks: decks.map(d => ({ deckId: d.deckId, main: encode(d.main), material: encode(d.material), sideboard: [] })) };
    const result = detectThemeDefinitions(index, catalog, definitions);
    const byId = new Map(decks.map(d => [d.deckId, d]));
    sources.push({ source, cachedRecords: records.length, excludedCountMismatches, completeQualifyingLists: decks.length,
        eligibleDecks: result.eligibleDecks, inputSha256: hash(JSON.stringify(decks)),
        evidence: result.evidence.map(entry => {
            const matches = entry.matches.map(match => {
                const deck = byId.get(match.deckId)!;
                return { ...deck, paths: match.paths, signature: hash(JSON.stringify({ main: deck.main, material: deck.material })) };
            });
            return { id: entry.id, matches, distinctLists: new Set(matches.map(m => m.signature)).size,
                authorHandles: [...new Set(matches.map(m => m.author.trim().toLowerCase()).filter(Boolean))].sort() };
        }) });
}
const tournamentIndexRaw = await readFile(new URL('data/analysis/deck-card-index.json', root), 'utf8');
const tournamentIndex: DeckCardIndexData = JSON.parse(tournamentIndexRaw);
const tournamentReview = JSON.parse(await readFile(new URL('data/reference/theme-refinement-review.json', root), 'utf8'));
const tournamentDecks = new Map(tournamentIndex.decks.map(d => [d.deckId, d]));
const tournamentComparison = definitions.map(definition => {
    const candidate = tournamentReview.candidates.find((c: { id: string }) => c.id === definition.id);
    const tournament = candidate.matches.map((match: { deckId: string }) => {
        const deck = tournamentDecks.get(match.deckId);
        if (!deck) throw new Error(`Missing historical tournament witness: ${match.deckId}`);
        const main = canonical(decodeCardLines(deck.main, tournamentIndex.cardNames));
        const material = canonical(decodeCardLines(deck.material, tournamentIndex.cardNames));
        return { deckId: deck.deckId, main, material, signature: hash(JSON.stringify({ main, material })) };
    });
    const community = sources.flatMap(s => s.evidence.find(e => e.id === definition.id)!.matches);
    return { id: definition.id, tournament,
        communityDistinctLists: new Set(community.map(m => m.signature)).size,
        combinedDistinctLists: new Set([...community, ...tournament].map(m => m.signature)).size,
        duplicateCommunityDeckIds: community.filter(m => tournament.some((t: { signature: string }) => t.signature === m.signature)).map(m => m.deckId) };
});
const output = { version: 1, tournamentIndexSha256: hash(tournamentIndexRaw), tournamentComparison, generatedAt: new Date().toISOString(), catalogSha256: hash(catalogRaw), definitions,
    limits: ['Community authors are handles, not verified independent people.', 'Formats retain cached source classification and confidence; membership does not establish legality.',
        'Cached lists retain individual fetch times; a listing refresh does not re-fetch every older deck.', 'Main and Material only; no tournament recurrence or win-rate claims.'], sources };
await writeJsonAtomic(fileURLToPath(new URL('data/reference/held-community-theme-review.json', root)), output);
console.log(JSON.stringify(sources.map(s => ({ source: s.source, lists: s.completeQualifyingLists,
    themes: s.evidence.map(e => ({ id: e.id, matches: e.matches.length, distinctLists: e.distinctLists, authorHandles: e.authorHandles.length })) })), null, 2));
