import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ruleDecks, parseStrategyStore, type ReferenceArchetypes, type DeckCardIndexData, type DeckSighting, type ArchetypeCluster, type CuratedStrategy } from '@gatcg/shared';
import { analyzeReferenceArchetypes } from './referenceArchetypes.js';
export async function writeReferenceArchetypes(dataDir: string, index: DeckCardIndexData, catalog: Parameters<typeof ruleDecks>[1], sightings: DeckSighting[], builds: ArchetypeCluster[], publicationFile?: string) {
    const reference: ReferenceArchetypes = JSON.parse(await readFile(path.join(dataDir, 'reference/fractal-archetypes.json'), 'utf8'));
    const decks = ruleDecks(index, catalog), generatedAt = new Date().toISOString();
    let curation: CuratedStrategy[] = [];
    const saved = path.join(dataDir, 'reference/curated-strategies.json');
    try {
        const store = parseStrategyStore(await readFile(publicationFile ?? saved, 'utf8'));
        curation = store.entries.filter(e => e.definition.reviewStatus === 'accepted');
    }
    catch (e) {
        if (publicationFile || (e as NodeJS.ErrnoException).code !== 'ENOENT')
            throw e;
    }
    if (curation.some(e => e.sourceHash !== reference.source.sha256))
        throw new Error('Review source changes before publishing accepted strategies.');
    const byId = new Map(curation.map(e => [e.definition.id, e]));
    for (const entry of curation) {
        const seen = new Set<string>();
        let current: CuratedStrategy | undefined = entry;
        while (current) {
            if (seen.has(current.definition.id))
                throw new Error('Cyclic strategy parents');
            seen.add(current.definition.id);
            const parent: string | null = current.definition.parentId;
            if (parent && !byId.has(parent))
                throw new Error('Accept parent definitions before publishing subtypes');
            current = parent ? byId.get(parent) : undefined;
        }
        if (!entry.coreCards.length || !entry.definition.rule.anyCards.length)
            throw new Error('Published strategies require preview and matching cards');
        const names = new Set(catalog.map(c => c.name));
        if ([...entry.coreCards, ...entry.definition.rule.anyCards, ...entry.definition.rule.allCards, ...entry.definition.rule.excludeCards, ...entry.definition.rule.comboGroups.flat()].some(c => !names.has(c)))
            throw new Error(`Unknown card in ${entry.definition.name}; resolve exact catalog names before publication`);
    }
    const original = analyzeReferenceArchetypes(reference, decks, sightings, builds, generatedAt);
    const curated = analyzeReferenceArchetypes({ ...reference, definitions: curation.map(e => e.definition) }, decks, sightings, builds, generatedAt);
    await writeFile(path.join(dataDir, 'analysis/reference-archetypes.json'), JSON.stringify(original));
    await writeFile(path.join(dataDir, 'analysis/curated-strategies.json'), JSON.stringify({ ...curated, curation, originalDefinitions: reference.definitions }));
    if (publicationFile)
        await writeFile(saved, JSON.stringify({ version: 1, entries: curation, drafts: [] }, null, 2) + '\n');
    return original;
}
