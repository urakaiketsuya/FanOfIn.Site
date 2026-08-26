import { Link } from "react-router-dom";

export interface DivergingBarRow {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  href?: string;
  detail?: string;
}

export default function DivergingBarChart({
  labelA,
  labelB,
  rows,
  format = (value) => `${(value * 100).toFixed(1)}%`,
}: {
  labelA: string;
  labelB: string;
  rows: DivergingBarRow[];
  format?: (value: number) => string;
}) {
  const max = Math.max(0, ...rows.flatMap((row) => [row.valueA, row.valueB]));
  if (max === 0) return null;

  return (
    <figure className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4" aria-label={`${labelA} vs ${labelB}`}>
      <div className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-2 text-[10px] text-ctp-subtext0 sm:grid-cols-[minmax(8rem,12rem)_1fr]">
        <span />
        <div className="grid grid-cols-2">
          <span className="pr-2 text-right text-ctp-blue">{labelA}</span>
          <span className="pl-2 text-ctp-mauve">{labelB}</span>
        </div>
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <div className="truncate py-1 text-xs text-ctp-text" title={row.detail ?? row.label}>
              {row.href ? <Link to={row.href} className="hover:text-ctp-blue">{row.label}</Link> : row.label}
            </div>
            <div className="grid grid-cols-2 py-1 text-[9px] tabular-nums">
              <div className="relative flex h-5 items-center justify-end border-r border-ctp-surface2">
                <span className="absolute right-1 z-10 text-ctp-text">{format(row.valueA)}</span>
                <span className="h-full rounded-l-sm bg-ctp-blue/55" style={{ width: `${(row.valueA / max) * 100}%` }} />
              </div>
              <div className="relative flex h-5 items-center">
                <span className="h-full rounded-r-sm bg-ctp-mauve/55" style={{ width: `${(row.valueB / max) * 100}%` }} />
                <span className="absolute left-1 z-10 text-ctp-text">{format(row.valueB)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
