import { runBuildComparison, type BuildComparisonInput, type BuildComparisonResponse } from './deckBuildComparisonJob';
const port = self as unknown as { onmessage: (event: MessageEvent<BuildComparisonInput>) => void; postMessage: (message: BuildComparisonResponse) => void };
port.onmessage = ({ data }) => {
  try { port.postMessage({ result: runBuildComparison(data) }); }
  catch { port.postMessage({ error: 'Comparison could not run. Try again.' }); }
};
