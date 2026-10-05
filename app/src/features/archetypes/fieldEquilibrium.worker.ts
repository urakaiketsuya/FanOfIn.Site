import { analyzeCoveredField, type BattleChartEntry, type FieldWeight } from '@gatcg/shared';
export interface EquilibriumInput { field: FieldWeight[]; chart: BattleChartEntry[] }
export type EquilibriumResponse = { result: ReturnType<typeof analyzeCoveredField>; error?: never } | { error: string; result?: never };
const port = self as unknown as { onmessage: (event: MessageEvent<EquilibriumInput>) => void; postMessage: (message: EquilibriumResponse) => void };
port.onmessage = ({ data }) => {
  try { port.postMessage({ result: analyzeCoveredField(data.field, data.chart) }); }
  catch { port.postMessage({ error: 'Equilibrium benchmark could not run. Try again.' }); }
};
