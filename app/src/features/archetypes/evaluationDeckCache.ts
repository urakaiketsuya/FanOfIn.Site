import type { DeckCardIndexData } from '@gatcg/shared';

/** Cache is optional. A network failure can use the same saved snapshot as other deck views. */
export async function loadEvaluationDecks(fetchIndex: () => Promise<DeckCardIndexData>, cache: {
    get: () => Promise<DeckCardIndexData | undefined>;
    put: (index: DeckCardIndexData) => Promise<unknown>;
}): Promise<{ index: DeckCardIndexData; cached: boolean }> {
    let index: DeckCardIndexData;
    try { index = await fetchIndex(); }
    catch (error) {
        const saved = await cache.get().catch(() => undefined);
        if (saved) return { index: saved, cached: true };
        throw error;
    }
    await cache.put(index).catch(() => undefined);
    return { index, cached: false };
}
