export interface BarChartBar {
  label: string;
  value: number;
}

/** Simple vertical bar chart — categories on the x-axis, counts on the y-axis. Used for anything ordinal (memory cost curve, sightings per month) where a donut's part-of-whole framing doesn't fit. */
export default function BarChart({ title, bars }: { title: string; bars: BarChartBar[] }) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (max === 0) return null;

  return (
    <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title}</h3>
      <div className="mt-4 flex h-32 items-end gap-1.5">
        {bars.map((b) => {
          const pct = (b.value / max) * 100;
          return (
            // `h-full` gives this column a definite height (100% of the fixed h-32 row above), so the
            // absolutely-positioned bar's percentage height actually resolves against something —
            // without an explicit height here, CSS treats a percentage height as `auto` and every bar
            // collapses to the same size regardless of value.
            <div key={b.label} className="relative h-full flex-1">
              {b.value > 0 && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-ctp-subtext0"
                  style={{ bottom: `calc(${pct}% + 2px)` }}
                >
                  {b.value}
                </span>
              )}
              <div
                className="absolute bottom-0 w-full rounded-t bg-ctp-blue"
                style={{ height: `${pct}%`, minHeight: b.value > 0 ? "2px" : "0" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">
        {bars.map((b) => (
          <div key={b.label} className="flex-1 text-center text-[10px] text-ctp-subtext1">
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
