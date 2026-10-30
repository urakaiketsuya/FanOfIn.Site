import { useEffect, useState, useTransition } from 'react';
import type { BuildComparisonInput, BuildComparisonResponse } from './deckBuildComparisonJob';
import { startBuildComparison } from './startBuildComparison';

export function useDeckBuildComparison(input: BuildComparisonInput | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ input: BuildComparisonInput; response: BuildComparisonResponse } | null>(null);
  const [rendering, startTransition] = useTransition();
  useEffect(() => {
    if (!input) return;
    return startBuildComparison(input,
      response => startTransition(() => setState({ input, response })),
      () => new Worker(new URL('./deckBuildComparison.worker.ts', import.meta.url), { type: 'module' }),
    );
  }, [input, attempt]);
  const response = input && state?.input === input ? state.response : null;
  return { result: response?.result, error: response?.error, pending: !!input && (!response || rendering),
    retry: () => { setState(null); setAttempt(value => value + 1); } };
}
