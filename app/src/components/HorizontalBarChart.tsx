import { Link } from "react-router-dom";

export interface HorizontalBarChartBar {
  key: string;
  label: string;
  value: number;
  /** Pre-formatted value shown at the bar's tip (e.g. "63.3%", "1,171 decks") — kept separate from `value` since the raw number drives bar length but the label often needs units/rounding. */
  valueLabel: string;
  href?: string;
}

/**
 * A ranked, single-measure magnitude comparison — every bar is the *same* hue (one
 * series; the title already names it, so no legend), with opacity scaled to each
 * bar's own value for a lightweight sequential feel. This is the right shape for
 * "which of these N things is bigger," which a donut/pie stops handling well past
 * a handful of slices and a plain number column makes harder to scan than it needs
 * to be. Renders bars in the order given — sort by value first if that's the intent.
 */
export default function HorizontalBarChart({ title, subtitle, bars }: { title?: string; subtitle?: string; bars: HorizontalBarChartBar[] }) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (max === 0) return null;

  return (
    <div data-component="HorizontalBarChart" className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      {title && <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{title}</h3>}
      {subtitle && <p className="mt-1 text-xs text-ctp-subtext0">{subtitle}</p>}
      <ul className={`space-y-1 ${title || subtitle ? "mt-3" : ""}`}>
        {bars.map((b) => {
          const pct = Math.max((b.value / max) * 100, 1.5);
          const opacity = 0.45 + 0.55 * (b.value / max);
          const label = b.href ? (
            <Link to={b.href} className="truncate text-ctp-text hover:text-ctp-blue" title={b.label}>
              {b.label}
            </Link>
          ) : (
            <span className="truncate text-ctp-text" title={b.label}>
              {b.label}
            </span>
          );
          return (
            <li key={b.key} className="flex items-center gap-2 text-xs">
              <div className="w-36 shrink-0 sm:w-44">{label}</div>
              <div className="h-4 flex-1 rounded-sm bg-ctp-surface0">
                <div
                  className="h-4 rounded-r-[4px]"
                  style={{ width: `${pct}%`, backgroundColor: "var(--color-ctp-blue)", opacity }}
                />
              </div>
              <div className="w-16 shrink-0 text-right text-ctp-subtext1 tabular-nums">{b.valueLabel}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
