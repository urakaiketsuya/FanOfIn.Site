interface ForecastCheckpoint {
  label: string;
  seen: number;
}

export function ForecastCheckpointSelector({ checkpoints, selected, onSelect }: {
  checkpoints: readonly ForecastCheckpoint[];
  selected: number;
  onSelect: (seen: number) => void;
}) {
  return <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-ctp-surface1 bg-ctp-mantle p-0.5" aria-label="Cards seen checkpoint">
    {checkpoints.map((checkpoint) => {
      const active = selected === checkpoint.seen;
      return <button key={checkpoint.seen} type="button" aria-pressed={active} onClick={() => onSelect(checkpoint.seen)} className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue ${active ? "bg-ctp-blue text-ctp-crust shadow-sm" : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}>{active && <span aria-hidden="true" className="mr-1">✓</span>}{checkpoint.label}</button>;
    })}
  </div>;
}

export function ForecastChart({ values, low, high, height = 56, selectedIndex }: {
  values: number[];
  low?: number[];
  high?: number[];
  height?: number;
  selectedIndex?: number;
}) {
  if (values.length < 2) return null;
  const width = 640;
  const allValues = [...values, ...(low ?? []), ...(high ?? [])];
  const max = Math.max(...allValues, 1);
  const stepX = width / (values.length - 1);
  const point = (value: number, index: number) => `${index * stepX},${height - (value / max) * height}`;
  const linePoints = values.map(point).join(" ");
  const bandPoints = low && high
    ? [...high.map(point), ...low.map((value, index) => point(value, index)).reverse()].join(" ")
    : null;
  return <div className="rounded-xl bg-ctp-mantle/70 px-3 py-3">
    <svg data-component="ForecastChart" viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" role="img" aria-label="Forecast trend">
      {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={0} x2={width} y1={height * ratio} y2={height * ratio} className="stroke-ctp-surface1" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
      {bandPoints && <polygon points={bandPoints} className="fill-ctp-mauve/20 transition-all duration-200 motion-reduce:transition-none" />}
      <polyline points={linePoints} fill="none" className="stroke-ctp-blue transition-all duration-200 motion-reduce:transition-none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {values.length <= 8 && values.map((value, index) => <circle key={index} cx={index * stepX} cy={height - (value / max) * height} r={index === selectedIndex ? 6 : 4} className={index === selectedIndex ? "fill-ctp-crust stroke-ctp-blue" : "fill-ctp-blue stroke-ctp-mantle"} strokeWidth={index === selectedIndex ? 3 : 2} vectorEffect="non-scaling-stroke" />)}
      {values.length > 8 && selectedIndex !== undefined && values[selectedIndex] !== undefined && <circle cx={selectedIndex * stepX} cy={height - (values[selectedIndex] / max) * height} r={6} className="fill-ctp-crust stroke-ctp-blue" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
    </svg>
  </div>;
}

export function ForecastHeadline({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="flex flex-wrap items-end justify-between gap-3">
    <div><p className="text-xs text-ctp-subtext0">{label}</p>{detail && <p className="mt-0.5 text-xs text-ctp-subtext1">{detail}</p>}</div>
    <span className="text-3xl font-bold leading-none tabular-nums text-ctp-blue transition-opacity duration-200 motion-reduce:transition-none">{value}</span>
  </div>;
}

export function ForecastMetricBar({ label, value, displayValue }: { label: string; value: number; displayValue?: string }) {
  const percent = Math.round(value * 100);
  return <div className="rounded-xl bg-ctp-surface0/70 px-3 py-2.5 text-xs">
    <div className="flex items-center justify-between gap-3"><span className="font-medium text-ctp-subtext1">{label}</span><span className="font-semibold tabular-nums text-ctp-text">{displayValue ?? `${percent}%`}</span></div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ctp-mantle"><div className="h-full rounded-full bg-ctp-mauve transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} /></div>
  </div>;
}
