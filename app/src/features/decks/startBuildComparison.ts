import type { BuildComparisonInput, BuildComparisonResponse } from './deckBuildComparisonJob';

type ComparisonWorker = Pick<Worker, 'onmessage' | 'onerror' | 'onmessageerror' | 'postMessage' | 'terminate'>;

/** One cancellable attempt. Only the first completion may publish a result. */
export function startBuildComparison(
  input: BuildComparisonInput,
  publish: (response: BuildComparisonResponse) => void,
  createWorker: () => ComparisonWorker,
): () => void {
  let active = true;
  let worker: ComparisonWorker | undefined;
  const cancel = () => {
    active = false;
    worker?.terminate();
  };
  const finish = (response: BuildComparisonResponse) => {
    if (!active) return;
    cancel();
    publish(response);
  };
  const fail = () => finish({ error: 'Comparison could not run. Try again.' });
  try {
    worker = createWorker();
    worker.onmessage = (event: MessageEvent<BuildComparisonResponse>) => finish(event.data);
    worker.onerror = fail;
    worker.onmessageerror = fail;
    worker.postMessage(input);
  } catch { fail(); }
  return cancel;
}
