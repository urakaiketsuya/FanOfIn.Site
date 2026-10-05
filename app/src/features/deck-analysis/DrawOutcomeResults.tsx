interface DrawOutcomeResultsProps {
  label: string;
  empty: string;
  rows: { label: string; probability: number | null; detail?: string }[];
}

export default function DrawOutcomeResults({ label, empty, rows }: DrawOutcomeResultsProps) {
  const ready = rows.every((row) => row.probability !== null);
  return <section aria-label={label} className="rounded-xl bg-ctp-base/50 p-4">
    <h3 className="text-sm font-semibold">{label}</h3>
    {!ready && <p className="mt-2 text-sm text-ctp-subtext1">{empty}</p>}
    <div className="mt-4 space-y-4">{rows.map((row, index) => <div key={row.label}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm">{row.label}</span>
        <span className="text-xl font-semibold tabular-nums">{row.probability === null ? '—' : `${(row.probability * 100).toFixed(1)}%`}</span>
      </div>
      <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-ctp-surface0">
        <div className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${index === 0 ? 'bg-ctp-blue' : 'bg-ctp-overlay1'}`} style={{ width: `${(row.probability ?? 0) * 100}%` }} />
      </div>
      {row.detail && <p className="mt-1 text-xs text-ctp-subtext0">{row.detail}</p>}
    </div>)}</div>
  </section>;
}
