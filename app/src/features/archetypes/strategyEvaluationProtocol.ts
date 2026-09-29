import type { ReferenceDefinition, StrategyComparison, ruleDecks } from '@gatcg/shared';
export type EvaluationCatalog = Parameters<typeof ruleDecks>[1];
export interface ComparisonInput {
    edited: ReferenceDefinition;
    definitions: ReferenceDefinition[];
    originals: ReferenceDefinition[];
}
export type EvaluationRequest = { type: 'initialize'; catalog: EvaluationCatalog } | { type: 'compare'; id: number; input: ComparisonInput };
export type EvaluationResponse = { type: 'ready'; warning?: string } | { type: 'result'; id: number; comparison: StrategyComparison } | { type: 'error'; id: number; message: string };
export interface EvaluationState {
    key: string;
    phase: 'loading' | 'calculating' | 'ready' | 'error';
    comparison: StrategyComparison | null;
    error: string | null;
    warning?: string;
}
