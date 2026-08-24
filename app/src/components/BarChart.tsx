export interface BarChartBar {
  label: string;
  value: number;
  /** Native title-attribute tooltip, e.g. to name the real set(s) behind a merged/short x-axis label. */
  title?: string;
}

/** Simple vertical bar chart — categories on the x-axis, counts on the y-axis. Used for anything ordinal (memory cost curve, sightings per month) where a donut's part-of-whole framing doesn't fit. */
export default function BarChart({ title, bars }: { title?: string; bars: BarChartBar[] }) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (max === 0) return null;

  return (
    <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      {title && <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title}</h3>}
      <div className={`flex h-32 items-end gap-1.5 ${title ? "mt-4" : ""}`}>
        {bars.map((b, i) => {
          const pct = (b.value / max) * 100;
          return (
            // Keyed by index, not `b.label` — labels aren't guaranteed unique (e.g. two dated
            // buckets in the same month both format to "Jan 24"), and this list is a fixed,
            // freshly-computed array on every render, never reordered/filtered in place, so index
            // is a safe, stable key here.
            // `h-full` gives this column a definite height (100% of the fixed h-32 row above), so the
            // absolutely-positioned bar's percentage height actually resolves against something —
            // without an explicit height here, CSS treats a percentage height as `auto` and every bar
            // collapses to the same size regardless of value.
            <div key={i} className="relative h-full flex-1" title={b.title}>
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
        {bars.map((b, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-ctp-subtext1">
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
