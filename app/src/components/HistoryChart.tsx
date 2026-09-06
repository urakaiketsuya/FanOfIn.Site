export interface HistoryPoint {
  date: string;
  value: number;
  detail?: string;
}

export default function HistoryChart({
  points,
  label,
  formatValue = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  compact = false,
}: {
  points: HistoryPoint[];
  label: string;
  formatValue?: (value: number) => string;
  compact?: boolean;
}) {
  if (points.length < 2) return null;
  const width = 640;
  const height = compact ? 64 : 220;
  const margin = compact ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 12, right: 18, bottom: 34, left: 58 };
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.08, Math.abs(rawMax) * 0.01, 1);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = (index: number) => margin.left + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) => margin.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const linePoints = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const chart = (
    <svg data-component="HistoryChart" viewBox={`0 0 ${width} ${height}`} className={`w-full ${compact ? "" : "min-w-[36rem]"}`} role="img" aria-label={`${label} over time`}>
      {!compact && ticks.map((tick) => {
        const value = min + tick * (max - min);
        const py = y(value);
        return <g key={tick}><line x1={margin.left} x2={width - margin.right} y1={py} y2={py} stroke="var(--color-ctp-surface1)" /><text x={margin.left - 8} y={py + 4} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{formatValue(value)}</text></g>;
      })}
      <polyline points={linePoints} fill="none" stroke="var(--color-ctp-blue)" strokeWidth={compact ? 3 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.value)} r={compact ? 3.5 : 4} fill="var(--color-ctp-blue)" stroke="var(--color-ctp-mantle)" strokeWidth="2"><title>{point.detail ?? `${new Date(point.date).toLocaleDateString()}: ${formatValue(point.value)}`}</title></circle>)}
      {!compact && <>
        <text x={margin.left} y={height - 10} textAnchor="start" className="fill-ctp-subtext0 text-[10px]">{new Date(points[0].date).toLocaleDateString()}</text>
        <text x={width - margin.right} y={height - 10} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{new Date(points.at(-1)!.date).toLocaleDateString()}</text>
        <text x="12" y={margin.top + plotHeight / 2} transform={`rotate(-90 12 ${margin.top + plotHeight / 2})`} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">{label}</text>
      </>}
    </svg>
  );
  return compact ? chart : <div data-component="HistoryChart" className="overflow-x-auto">{chart}</div>;
}
