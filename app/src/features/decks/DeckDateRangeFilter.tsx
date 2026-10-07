import FilterGroup from "../../components/filters/FilterGroup";

export default function DeckDateRangeFilter({ label, from, to, onFrom, onTo }: {
  label: string; from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void;
}) {
  const invalid = Boolean(from && to && from > to);
  return <FilterGroup label={label}>
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1 text-xs">From
        <input aria-label={`${label} from`} type="date" value={from} max={to || undefined} aria-invalid={invalid} onInput={e => onFrom(e.currentTarget.value)} className="min-h-control min-w-0 max-w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-ctp-text" />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs">Through
        <input aria-label={`${label} through`} type="date" value={to} min={from || undefined} aria-invalid={invalid} onInput={e => onTo(e.currentTarget.value)} className="min-h-control min-w-0 max-w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-ctp-text" />
      </label>
    </div>
    {invalid && <p role="alert" className="mt-2 text-sm text-ctp-red">Choose an end date on or after the start date.</p>}
  </FilterGroup>;
}
