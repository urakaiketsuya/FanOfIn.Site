/** Rebuild review-only artifacts. Does not update live references or publication. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ruleDecks, evaluateDefinition, parseStrategyStore, type ReferenceArchetypes, type StrategyStore } from '../../shared/src/archetypeRules.js';
const root = new URL('../../', import.meta.url);
const read = (path: string) => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));
const hash = (path: string) => createHash('sha256').update(fs.readFileSync(new URL(path, root))).digest('hex');
const write = (name: string, value: unknown) => fs.writeFileSync(new URL(`data/reference/review/${name}.json`, root), JSON.stringify(value, null, 2) + '\n');
const source: ReferenceArchetypes = read('data/reference/review/fractal-source.json');
const corrections: Record<string, string> = {
    'Soultrace Tesselation': 'Soultrace Tessellation',
    'Semiternal Sage': 'Sempiternal Sage',
    'Silvie, with the Pack': 'Silvie, With the Pack',
    'Bandersnatch, Fruminous Foe': 'Bandersnatch, Frumious Foe',
};
const reference = structuredClone(source);
for (const { rule } of reference.definitions) {
    const fix = (cards: string[]) => cards.map(c => corrections[c] ?? c);
    rule.anyCards = fix(rule.anyCards); rule.allCards = fix(rule.allCards);
    rule.excludeCards = fix(rule.excludeCards); rule.comboGroups = rule.comboGroups.map(fix);
}
const catalog = read('pipeline/.cache/cards.json').cards;
const review: {
    version: number; reviewDate: string; scope: string; catalogSha256: string; sourceSha256: string;
    candidates: { candidateId: string; kind: string; summary: string; requirements: string[]; cautions: string[]; supportingCards: string[] }[];
    strategies: Record<string, { coreCards: string[]; description: string; decision: string }>;
} = read('data/reference/review/mechanics-review.json');
// Human-authored findings must be rechecked if their source evidence changes.
assert.equal(review.version, 1);
assert.equal(review.catalogSha256, hash('pipeline/.cache/cards.json'), 'Catalog changed: refresh mechanics review before rebuilding.');
assert.equal(review.sourceSha256, source.source.sha256, 'Source changed: refresh mechanics review before rebuilding.');
const cardEvidence = (name: string) => {
    const card = catalog.find((c: { name: string }) => c.name === name);
    assert(card, `Missing mechanics evidence card: ${name}`);
    const { types, subtypes, classes, elements, level, cost_memory, cost_reserve, effect, legality } = card;
    return { name, types, subtypes, classes, elements, level, cost_memory, cost_reserve, effect, legality };
};
const known = new Set(catalog.map((c: { name: string }) => c.name));
for (const d of reference.definitions) for (const c of [...d.rule.anyCards, ...d.rule.allCards, ...d.rule.excludeCards, ...d.rule.comboGroups.flat()]) assert(known.has(c), `Unknown card: ${c}`);
const decks = ruleDecks(read('data/analysis/deck-card-index.json'), catalog);
const builds = read('data/analysis/archetype-taxonomy.json').clusters as { id: string; name: string; deckIds: string[] }[];
const evidence = (ids: string[]) => {
    const set = new Set(ids);
    return { decks: ids.length, deckIds: ids, builds: builds.map(b => ({ id: b.id, name: b.name, matched: new Set(b.deckIds.filter(id => set.has(id))).size, total: new Set(b.deckIds).size })).filter(b => b.matched).sort((a, b) => b.matched - a.matched || a.id.localeCompare(b.id)) };
};
const packages = reference.definitions.flatMap(d => d.rule.comboGroups.map((cards, i) => {
    const present = decks.filter(deck => cards.every(c => deck.cards.includes(c)));
    return { id: `${d.id}-combo-${i + 1}`, name: `${d.name}: ${cards.join(' + ')}`, status: 'unreviewed', mechanics: 'unverified', sourceDefinitionId: d.id, requiredCards: cards, membership: 'All required cards in main + material; independent of archetype membership; sideboard excluded.', presence: evidence(present.map(x => x.deckId)), qualified: evidence(present.filter(x => evaluateDefinition(d, reference.definitions, x).matches).map(x => x.deckId)), reviewQuestions: ['Verify costs, timing, targets, zones, champion/class bonuses and required board state against catalog text.', 'Identify missing enabling cards and whether this is an interaction, package, or executable combo.', 'Before a Combo Lab recipe, distinguish material access from opening-hand draw requirements.'] };
}));
assert.equal(packages.length, 15);
assert.equal(new Set(review.candidates.map(r => r.candidateId)).size, packages.length);
assert.equal(review.candidates.length, packages.length);
const reviewedPackages = packages.map(candidate => {
    const finding = review.candidates.find(r => r.candidateId === candidate.id);
    assert(finding, `Missing mechanics review: ${candidate.id}`);
    return { ...candidate, textReview: { ...finding, reviewDate: review.reviewDate, scope: review.scope,
        cardEvidence: [...new Set([...candidate.requiredCards, ...finding.supportingCards])].map(cardEvidence) } };
});
const selected = reference.definitions.filter(d => ['Herb Burn', 'Arcane Mage', 'Arcane Warrior', 'Psycho'].includes(d.name));
// Include parent as a draft dependency so Psycho can be reviewed without losing its gate.
for (const d of [...selected]) if (d.parentId) selected.push(reference.definitions.find(p => p.id === d.parentId)!);
const store: StrategyStore = { version: 1, entries: [], drafts: selected.map(definition => {
    const finding = review.strategies[definition.name];
    assert(finding, `Missing strategy review: ${definition.name}`);
    for (const card of finding.coreCards) assert(known.has(card), `Unknown core card: ${card}`);
    return { definition, coreCards: finding.coreCards, description: finding.description, packageIds: [], sourceHash: source.source.sha256,
        mechanics: 'unverified', mechanicsEvidence: `${review.scope} ${finding.decision} See mechanics-review.json for candidate conditions and evidence.` };
}) };
parseStrategyStore(JSON.stringify(store));
assert(store.drafts.every(d => d.definition.reviewStatus === 'unreviewed'));
write('strategy-drafts', store);
write('combo-candidates', { version: 1, source: source.source, mechanicsReview: { file: 'mechanics-review.json', sha256: hash('data/reference/review/mechanics-review.json'), catalogSha256: review.catalogSha256 }, packages: reviewedPackages });
write('assessment', { version: 1, source: source.source, population: decks.length, mechanicsReview: { file: 'mechanics-review.json', sha256: hash('data/reference/review/mechanics-review.json'), scope: review.scope, reviewedCandidates: reviewedPackages.length }, inputHashes: Object.fromEntries(['data/analysis/deck-card-index.json', 'data/analysis/deck-sightings.json', 'data/analysis/archetype-taxonomy.json', 'pipeline/.cache/cards.json'].map(p => [p, hash(p)])), corrections, instructions: ['Import strategy-drafts.json through the reference strategy curator to resume drafts. No entries are accepted.', 'The source hash intentionally differs from the live reference snapshot. Review and reconcile the source before publication.', 'Combo candidates are review records, not saved packages or runnable Combo Lab recipes. Candidate IDs are not linked as packageIds until real packages exist.', 'Use source rules plus listed exact-name corrections when reproducing qualified evidence.', 'Keep broad Exia and Overlord definitions pending boundary review; no live reference or taxonomy replacement is included.'], strategies: selected.map(d => ({ id: d.id, name: d.name, coreReview: review.strategies[d.name], packageCandidateIds: packages.filter(p => p.sourceDefinitionId === d.id).map(p => p.id), ...evidence(decks.filter(deck => evaluateDefinition(d, reference.definitions, deck).matches).map(deck => deck.deckId)) })) });
console.log(`Prepared ${store.drafts.length} strategy drafts (including parent dependency), ${packages.length} combo candidates; ${decks.length} decks.`);
