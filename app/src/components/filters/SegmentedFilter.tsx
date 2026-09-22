import FilterGroup from "./FilterGroup";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export default function SegmentedFilter<T extends string | number>({ label, options, value, onChange }: {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <FilterGroup label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`rounded-md border px-2 py-1 text-xs ${value === option.value ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>
            {option.label}
          </button>
        ))}
      </div>
    </FilterGroup>
  );
}
