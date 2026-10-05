import { resampleExpectedField } from '@gatcg/shared';
import type { ResamplingInput, ResamplingResponse } from './useFieldResampling';
const port = self as unknown as { onmessage: (event: MessageEvent<ResamplingInput>) => void; postMessage: (message: ResamplingResponse) => void };
port.onmessage = ({ data }) => {
  try {
    port.postMessage({ rows: resampleExpectedField(data.candidates, data.field, data.events, data.minMatchups) });
  } catch {
    port.postMessage({ error: 'Event resampling could not run. Try again.' });
  }
};
