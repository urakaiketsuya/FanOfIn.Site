import { useMemo } from 'react';
import { computeRaiDrawReport, type AnalyticsDeck, type Card } from '@gatcg/shared';
import Panel from '../../components/ui/Panel';
import ForecastResult, { ForecastRange } from './ForecastResult';

export default function RaiDrawReport({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const report = useMemo(() => computeRaiDrawReport(deck, cardsByName), [deck, cardsByName]);
  if (!report) return null;
  return <Panel data-component="RaiDrawReport">{report.status !== 'ready' ? <><h3 className="text-lg font-semibold">Draw</h3><p role="status" className="mt-3 text-sm">{report.status === 'missing' ? 'Card data incomplete' : 'Requires a supported Rai lineage'}</p></> : <ForecastResult title="Draw" context="Unopposed · going first" cards={report.sources} cardsByName={cardsByName}>
    <p className="text-sm">Cards seen</p><ForecastRange early={report.points[2].seenRange} late={report.points[4].seenRange} unit="cards" />
    <dl className="mt-4 space-y-2 text-xs">{(['hand', 'memory'] as const).map(zone => <div key={zone} className="flex flex-wrap justify-between gap-2"><dt>{zone === 'hand' ? 'Hand' : 'Memory'} · turn 5 avg.</dt><dd className="tabular-nums">{report.points[4][zone].toFixed(1)}</dd></div>)}</dl>
  </ForecastResult>}</Panel>;
}
