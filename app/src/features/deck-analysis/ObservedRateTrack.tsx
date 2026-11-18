import type { ObservedMatchupRow } from '@gatcg/shared';

type EventRange = ObservedMatchupRow['eventRange'];
const percent = (value: number) => `${Math.round(value * 100)}%`;
export const rangeLegend = 'Dot: overall · band: middle 50% of events · line: low–high';

export function EventRangeLabel({ range }: { range?: EventRange }) {
  if (!range || range.events < 2) return null;
  return <p className="flex flex-wrap gap-x-2 text-xs text-ctp-subtext0 tabular-nums">
    {range.middle && <span className="whitespace-nowrap">Middle 50% of events {percent(range.middle.low)}–{percent(range.middle.high)}</span>}
    <span className="whitespace-nowrap">{range.middle ? 'Full range' : 'Event range'} {percent(range.low)}–{percent(range.high)}</span>
  </p>;
}

/** Descriptive event distribution; the overall dot remains match-weighted. */
export default function ObservedRateTrack({ value, range }: { value: number | null; range?: EventRange }) {
  return <div className="relative" aria-hidden="true">
    <svg viewBox="0 0 300 28" preserveAspectRatio="none" className="h-7 w-full">
      <line x1="6" x2="294" y1="14" y2="14" className="stroke-ctp-surface2" />
      <line x1="150" x2="150" y1="2" y2="26" className="stroke-ctp-overlay1" strokeDasharray="2 2" />
      {value !== null && range && range.events > 1 && <>
        <line x1={6 + range.low * 288} x2={6 + range.high * 288} y1="14" y2="14" className="stroke-ctp-blue" strokeWidth="1.5" />
        {[range.low, range.high].map((endpoint, i) => <line key={i} x1={6 + endpoint * 288} x2={6 + endpoint * 288} y1="10" y2="18" className="stroke-ctp-blue" strokeWidth="1.5" />)}
        {range.middle && <rect data-event-middle x={6 + range.middle.low * 288} y="8" width={Math.max(1, (range.middle.high - range.middle.low) * 288)} height="12" className="fill-ctp-blue" />}
      </>}
    </svg>
    {value !== null && <span data-rate-dot className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ctp-text ring-2 ring-ctp-base" style={{ left: `${2 + value * 96}%` }} />}
  </div>;
}
