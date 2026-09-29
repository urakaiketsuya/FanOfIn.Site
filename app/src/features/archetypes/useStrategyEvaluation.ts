import { useEffect, useMemo, useRef, useState } from 'react';
import { StrategyEvaluationClient } from './strategyEvaluationClient';
import type { ComparisonInput, EvaluationCatalog, EvaluationState } from './strategyEvaluationProtocol';

export function useStrategyEvaluation(enabled: boolean, catalog: EvaluationCatalog, input: ComparisonInput | null) {
    const client = useRef<StrategyEvaluationClient | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<EvaluationState>({ key: '', phase: 'loading', comparison: null, error: null });
    // Only the fields used by ruleDecks cross the worker boundary; no image/edition catalog payload.
    const compactCatalog = useMemo(() => catalog.map(({ name, types, elements, level }) => ({ name, types, elements, level })), [catalog]);
    // Labels and review status do not change membership or need a new comparison.
    const key = input ? JSON.stringify({ ...input, edited: { ...input.edited, name: '', sourceLine: 0, reviewStatus: 'unreviewed' } }) : '';
    useEffect(() => {
        if (!enabled || !compactCatalog.length) return;
        let worker: Worker | null = null;
        try {
            worker = new Worker(new URL('./strategyEvaluation.worker.ts', import.meta.url), { type: 'module' });
            client.current = new StrategyEvaluationClient(worker, compactCatalog, setState);
        } catch {
            worker?.terminate();
            setState({ key: '', phase: 'error', comparison: null, error: 'Evaluation could not start. Retry or reopen this page.' });
        }
        return () => { client.current?.dispose(); client.current = null; };
    }, [enabled, compactCatalog, attempt]);
    useEffect(() => {
        if (enabled && key) client.current?.compare(key, JSON.parse(key) as ComparisonInput);
    }, [enabled, key, compactCatalog, attempt]);
    const current = state.key === key || state.phase === 'error' && !state.key;
    return {
        phase: current ? state.phase : 'loading',
        error: current ? state.error : null,
        warning: enabled && current ? state.warning : undefined,
        comparison: enabled && current && state.phase === 'ready' ? state.comparison : null,
        retry: () => { setState({ key: '', phase: 'loading', comparison: null, error: null }); setAttempt(value => value + 1); },
    };
}
