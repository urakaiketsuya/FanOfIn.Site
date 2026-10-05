interface SwapMetricProps {
  label: string;
  before: number | null;
  after: number | null;
  empty: string;
}

export default function SwapMetric({ label, before, after, empty }: SwapMetricProps) {
  const difference = before === null || after === null ? null : (after - before) * 100;
  const rounded = difference === null ? null : Number(difference.toFixed(1));
  return <section aria-label={label} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-base/50 p-3">
    <h3 className="text-sm font-medium">{label}</h3>
    <p className="mt-1 text-sm font-semibold text-ctp-subtext1">{rounded === null ? before === null ? empty : 'Choose a swap' : rounded === 0 ? 'No change' : `${Math.abs(rounded).toFixed(1)} percentage points ${rounded > 0 ? 'more likely' : 'less likely'}`}</p>
    <div className="mt-3 space-y-3">{([['Current', before], ['After swap', after]] as const).map(([name, value]) => <div key={name}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs"><span>{name}</span><span className="font-semibold tabular-nums">{value === null ? '—' : `${(value * 100).toFixed(1)}%`}</span></div>
      <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${name === 'Current' ? 'bg-ctp-overlay1' : 'bg-ctp-blue'}`} style={{ width: `${(value ?? 0) * 100}%` }} /></div>
    </div>)}</div>
  </section>;
}
