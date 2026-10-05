import { useEffect, useMemo, useState } from 'react';
import type { FieldEvent, FieldWeight, FieldResamplingResult } from '@gatcg/shared';
export interface ResamplingInput { candidates: string[]; field: FieldWeight[]; events: FieldEvent[]; minMatchups: number }
export type ResamplingResponse = { rows: FieldResamplingResult[]; error?: never } | { error: string; rows?: never };

export function useFieldResampling(enabled: boolean, input: ResamplingInput) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ input: ResamplingInput; response: ResamplingResponse } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let worker: Worker | undefined;
    setState(null);
    const fail = () => { if (active) setState({ input, response: { error: 'Event resampling could not run. Try again.' } }); };
    try {
      worker = new Worker(new URL('./fieldResampling.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<ResamplingResponse>) => { if (active) setState({ input, response: event.data }); worker?.terminate(); };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.postMessage(input);
    } catch { fail(); }
    return () => { active = false; worker?.terminate(); };
  }, [enabled, input, attempt]);
  const response = enabled && state?.input === input ? state.response : null;
  const rows = useMemo(() => new Map(response?.rows?.map(row => [row.champion, row]) ?? []), [response]);
  return { rows, pending: enabled && !response, error: response?.error, retry: () => { setState(null); setAttempt(value => value + 1); } };
}
