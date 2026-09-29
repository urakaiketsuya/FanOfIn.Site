import assert from 'node:assert/strict';
import test from 'node:test';
import { compareStrategyMembership, type ReferenceDefinition, type RuleDeck } from '@gatcg/shared';
import { StrategyEvaluationClient } from '../src/features/archetypes/strategyEvaluationClient';
import type { EvaluationRequest, EvaluationResponse, EvaluationState } from '../src/features/archetypes/strategyEvaluationProtocol';
const definition: ReferenceDefinition = { id: 'root', name: 'Example', parentId: null, sourceLine: 1, reviewStatus: 'unreviewed', rule: { anyCards: ['A'], allCards: [], excludeCards: [], comboGroups: [], element: null, typeCounts: {} } };
const deck = (id: string, cards: string[]): RuleDeck => ({ deckId: id, cards, elements: ['NORM'], typeCounts: {}, materialEntries: 1, unknownCards: [] });
const edited = { ...definition, rule: { ...definition.rule, allCards: ['B'] } };
const input = { edited, definitions: [definition], originals: [definition] };
const result = compareStrategyMembership([deck('1', ['A']), deck('2', ['A', 'B'])], edited, [definition], [definition]);

test('comparison preserves exact before/after counts, membership changes and parent semantics', () => {
    assert.deepEqual(result, { beforeCount: 2, afterCount: 1, addedCount: 0, removedCount: 1, sampleMatches: ['2'], sampleAdded: [], sampleRemoved: ['1'], boundary: [{ id: '1', failures: ['Missing required card: B'] }] });
    const child = { ...edited, id: 'new', parentId: 'root', rule: { ...edited.rule, anyCards: ['B'] } };
    const decks = [deck('1', ['B']), deck('2', ['A', 'B'])];
    const comparison = compareStrategyMembership(decks, child, [definition], [definition]);
    assert.equal(comparison.beforeCount, 0);
    assert.deepEqual(comparison.sampleAdded, ['2']);
    assert.match(comparison.boundary[0].failures[0], /^Parent:/);
    assert.equal(compareStrategyMembership(decks, child, [], []).afterCount, 0);
});
test('comparison bounds display samples while counting all decks and leaves inputs unchanged', () => {
    const decks = Array.from({ length: 30 }, (_, i) => deck(String(i), i % 2 ? ['A', 'B'] : ['A']));
    const snapshot = JSON.stringify(decks);
    const comparison = compareStrategyMembership(decks, edited, [definition], [definition]);
    assert.equal(comparison.beforeCount, 30);
    assert.equal(comparison.afterCount, 15);
    assert.equal(comparison.removedCount, 15);
    assert.equal(comparison.sampleMatches.length, 8);
    assert.equal(comparison.sampleRemoved.length, 8);
    assert.equal(comparison.boundary.length, 6);
    assert.equal(JSON.stringify(decks), snapshot);
});
class Port {
    requests: EvaluationRequest[] = [];
    onmessage: ((event: MessageEvent<EvaluationResponse>) => void) | null = null;
    onerror: ((event: ErrorEvent) => unknown) | null = null;
    terminated = false;
    postMessage(message: EvaluationRequest) { this.requests.push(message); }
    terminate() { this.terminated = true; }
    emit(data: EvaluationResponse) { this.onmessage?.({ data } as MessageEvent<EvaluationResponse>); }
}
test('worker client queues newest draft, ignores stale responses, and disposes on close', () => {
    const port = new Port(), states: EvaluationState[] = [];
    const client = new StrategyEvaluationClient(port, [], state => states.push(state));
    client.compare('first', input);
    client.compare('second', input);
    assert.equal(port.requests.length, 1, 'No comparison before deck preparation');
    port.emit({ type: 'ready' });
    assert.deepEqual(port.requests[1], { type: 'compare', id: 2, input });
    client.compare('third', input);
    port.emit({ type: 'result', id: 2, comparison: result });
    assert.equal(states.at(-1)?.phase, 'calculating');
    port.emit({ type: 'result', id: 3, comparison: result });
    assert.equal(states.at(-1)?.key, 'third');
    assert.equal(states.at(-1)?.phase, 'ready');
    const count = states.length;
    client.dispose();
    port.emit({ type: 'result', id: 3, comparison: result });
    client.compare('closed', input);
    assert.equal(states.length, count);
    assert.equal(port.terminated, true);
});
test('worker initialization errors are visible and stale request errors are ignored', () => {
    const port = new Port(), states: EvaluationState[] = [];
    const client = new StrategyEvaluationClient(port, [], state => states.push(state));
    client.compare('draft', input);
    port.emit({ type: 'error', id: 0, message: 'Decklists could not be loaded (503).' });
    assert.equal(states.at(-1)?.phase, 'error');
    client.compare('edited', input);
    assert.equal(states.at(-1)?.error, 'Decklists could not be loaded (503).');
    assert.equal(port.requests.length, 1);
    client.dispose();
    const retry = new StrategyEvaluationClient(port, [], state => states.push(state));
    retry.compare('retry', input);
    port.emit({ type: 'ready' });
    port.emit({ type: 'error', id: 42, message: 'Old failure' });
    assert.equal(states.at(-1)?.phase, 'calculating');
    port.emit({ type: 'result', id: 1, comparison: result });
    assert.equal(states.at(-1)?.phase, 'ready');
    retry.dispose();
});

test('offline evaluation uses saved decklists and blocked cache writes do not break live evaluation', async () => {
    const { loadEvaluationDecks } = await import('../src/features/archetypes/evaluationDeckCache');
    const index = { generatedAt: '2026-09-29', cardNames: ['A'], decks: [] };
    const offline = async () => { throw new Error('Offline'); };
    const cache = { get: async () => index, put: async () => { throw new Error('Quota exceeded'); } };
    assert.deepEqual(await loadEvaluationDecks(offline, cache), { index, cached: true });
    assert.deepEqual(await loadEvaluationDecks(async () => index, cache), { index, cached: false });
    await assert.rejects(loadEvaluationDecks(offline, { ...cache, get: async () => undefined }), /Offline/);
    await assert.rejects(loadEvaluationDecks(offline, { ...cache, get: async () => { throw new Error('Storage blocked'); } }), /Offline/);
});

test('cached evaluation retains the freshness warning alongside exact results', () => {
    const port = new Port(), states: EvaluationState[] = [];
    const client = new StrategyEvaluationClient(port, [], state => states.push(state));
    client.compare('draft', input);
    port.emit({ type: 'ready', warning: 'Using saved decklists.' });
    port.emit({ type: 'result', id: 1, comparison: result });
    assert.equal(states.at(-1)?.warning, 'Using saved decklists.');
    assert.equal(states.at(-1)?.comparison, result);
    client.dispose();
});
