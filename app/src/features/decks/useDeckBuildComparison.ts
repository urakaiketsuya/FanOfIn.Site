import { useEffect, useState, useTransition } from 'react';
import type { BuildComparisonInput, BuildComparisonResponse } from './deckBuildComparisonJob';

export function useDeckBuildComparison(input: BuildComparisonInput | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ input: BuildComparisonInput; response: BuildComparisonResponse } | null>(null);
  const [rendering, startTransition] = useTransition();
  useEffect(() => {
    if (!input) return;
    let active = true;
    let worker: Worker | undefined;
    const fail = () => {
      worker?.terminate();
      if (active) setState({ input, response: { error: 'Comparison could not run. Try again.' } });
    };
    try {
      worker = new Worker(new URL('./deckBuildComparison.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<BuildComparisonResponse>) => {
        worker?.terminate();
        if (active) startTransition(() => setState({ input, response: event.data }));
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage(input);
    } catch { fail(); }
    return () => { active = false; worker?.terminate(); };
  }, [input, attempt]);
  const response = input && state?.input === input ? state.response : null;
  return { result: response?.result, error: response?.error, pending: !!input && (!response || rendering),
    retry: () => { setState(null); setAttempt(value => value + 1); } };
}
