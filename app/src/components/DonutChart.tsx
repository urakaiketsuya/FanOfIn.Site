const RADIUS = 40;
const STROKE_WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Cycled by segment rank (largest first) so charts have a consistent, distinguishable look across different decks. */
export const CHART_PALETTE = [
  "var(--color-ctp-blue)",
  "var(--color-ctp-green)",
  "var(--color-ctp-yellow)",
  "var(--color-ctp-red)",
  "var(--color-ctp-mauve)",
  "var(--color-ctp-teal)",
  "var(--color-ctp-peach)",
  "var(--color-ctp-sapphire)",
  "var(--color-ctp-lavender)",
  "var(--color-ctp-rosewater)",
];

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** Ranks a raw count map into chart segments, largest first, colors assigned by rank from the shared palette. */
export function buildChartSegments(counts: Map<string, number>): DonutSegment[] {
  return Array.from(counts.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
}

export default function DonutChart({ title, segments }: { title: string; segments: DonutSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumulative = 0;

  return (
    <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-ctp-surface0)" strokeWidth={STROKE_WIDTH} />
            {segments.map((s) => {
              const fraction = s.value / total;
              const offset = -(cumulative * CIRCUMFERENCE);
              cumulative += fraction;
              return (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-ctp-mauve">Total</span>
            <span className="text-lg font-bold text-ctp-text">{total}</span>
          </div>
        </div>

        <ul className="min-w-[8rem] flex-1 space-y-1 text-xs">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-ctp-subtext1">{s.label}</span>
              <span className="text-ctp-subtext0">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
