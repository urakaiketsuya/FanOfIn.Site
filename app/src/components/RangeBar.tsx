export interface RangeBarStats {
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
}

/**
 * Visualizes a spread of percentiles as a track spanning p10→p90 (the "typical" range) with
 * the p25–p75 band highlighted and a median tick — deliberately NOT a min→max linear bar.
 * Real price data here has extreme high-end outliers (a $15k+ deck against a ~$750 p90), so a
 * min→max scale would squeeze the entire typical range into a sliver at one end. Min/mean/max
 * are still shown as plain numbers below the bar — the outliers aren't hidden, just not
 * allowed to distort the one visual encoding everyone actually reads at a glance.
 */
export default function RangeBar({ title, subtitle, stats, format }: { title: string; subtitle?: string; stats: RangeBarStats; format: (n: number) => string }) {
  const span = stats.p90 - stats.p10;
  const pct = (v: number) => (span > 0 ? Math.min(100, Math.max(0, ((v - stats.p10) / span) * 100)) : 50);
  const bandLeft = pct(stats.p25);
  const bandRight = pct(stats.p75);
  const medianPct = pct(stats.median);

  return (
    <div data-component="RangeBar" className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-ctp-subtext0">{subtitle}</p>}

      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-ctp-subtext0">
          <span>p10 &middot; {format(stats.p10)}</span>
          <span>p90 &middot; {format(stats.p90)}</span>
        </div>
        <div className="relative mt-1 h-3 rounded-sm bg-ctp-surface0">
          <div
            className="absolute inset-y-0 rounded-sm bg-ctp-blue/40"
            style={{ left: `${bandLeft}%`, width: `${Math.max(bandRight - bandLeft, 1)}%` }}
          />
          <div className="absolute inset-y-[-3px] w-0.5 rounded-full bg-ctp-blue" style={{ left: `${medianPct}%` }} />
        </div>
        <p className="mt-1 text-center text-[10px] text-ctp-subtext0">
          middle 50%: {format(stats.p25)}&ndash;{format(stats.p75)} &middot; median {format(stats.median)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ctp-surface0 pt-3">
        <div>
          <div className="text-[10px] text-ctp-subtext0">Min</div>
          <div className="text-sm font-semibold text-ctp-text">{format(stats.min)}</div>
        </div>
        <div>
          <div className="text-[10px] text-ctp-subtext0">Mean</div>
          <div className="text-sm font-semibold text-ctp-text">{format(stats.mean)}</div>
        </div>
        <div>
          <div className="text-[10px] text-ctp-subtext0">Max</div>
          <div className="text-sm font-semibold text-ctp-text">{format(stats.max)}</div>
        </div>
      </div>
    </div>
  );
}
