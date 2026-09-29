import { compareStrategyMembership, ruleDecks, type DeckCardIndexData, type RuleDeck } from '@gatcg/shared';
import { db } from '../../lib/db';
import { loadEvaluationDecks } from './evaluationDeckCache';
import type { EvaluationRequest, EvaluationResponse } from './strategyEvaluationProtocol';
const port = self as unknown as { onmessage: (event: MessageEvent<EvaluationRequest>) => void; postMessage: (message: EvaluationResponse) => void };
let decks: RuleDeck[] | null = null;
port.onmessage = async ({ data }) => {
    try {
        if (data.type === 'initialize') {
            const { index, cached } = await loadEvaluationDecks(async () => {
                const response = await fetch('/data/analysis/deck-card-index.json', { signal: AbortSignal.timeout(60_000), cache: 'no-cache' });
                if (!response.ok) throw new Error(`Decklists could not be loaded (${response.status}).`);
                return await response.json() as DeckCardIndexData;
            }, {
                get: async () => (await db.published.get('analysis-deck-card-index'))?.data as DeckCardIndexData | undefined,
                put: index => db.published.put({ key: 'analysis-deck-card-index', generatedAt: index.generatedAt, data: index }),
            });
            decks = ruleDecks(index, data.catalog);
            port.postMessage({ type: 'ready', warning: cached ? 'Using saved decklists. Connect and retry for current data.' : undefined });
        } else {
            if (!decks) throw new Error('Decklists are not ready. Retry evaluation.');
            port.postMessage({ type: 'result', id: data.id, comparison: compareStrategyMembership(decks, data.input.edited, data.input.definitions, data.input.originals) });
        }
    } catch (error) {
        port.postMessage({ type: 'error', id: data.type === 'compare' ? data.id : 0, message: error instanceof Error ? error.message : 'Evaluation failed. Retry evaluation.' });
    }
};
