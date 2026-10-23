import { useId, useState } from "react";
import { excludeFilterValue, hasFilterValue, filterValue, type OptionValue } from "@gatcg/shared";
import FilterGroup from "./FilterGroup";
import Button from "../ui/Button";

export default function SearchSelectFilter({ label, options, selected, onToggle }: {
  label: string; options: OptionValue[]; selected: ReadonlySet<string>; onToggle: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const id = useId();
  const matches = options.filter(option => option.text.toLowerCase().includes(input.trim().toLowerCase()));
  return <FilterGroup label={label}>
    <div className="flex flex-wrap gap-2">{[...selected].map(value => <Button key={value} size="sm" aria-label={`Remove ${value.startsWith('-') ? 'exclude' : 'include'} ${filterValue(value)}`} onClick={() => onToggle(value)}>
      {value.startsWith('-') ? 'Exclude' : 'Include'}: {options.find(o => o.value.toLowerCase() === filterValue(value).toLowerCase())?.text ?? filterValue(value)} ×
    </Button>)}</div>
    <label className="sr-only" htmlFor={id}>Search {label.toLowerCase()}</label>
    <input id={id} type="search" value={input} onChange={event => setInput(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="mt-2 min-h-12 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-base" />
    {input.trim() && <div className="mt-2 max-h-72 overflow-y-auto">
      {matches.slice(0, 50).map(option => <div key={option.value} className="flex flex-wrap items-center justify-between gap-2 border-b border-ctp-surface0 py-2">
        <span className="min-w-0 break-words text-sm">{option.text}</span>
        <div className="flex gap-2" role="group" aria-label={option.text}>
          <Button className="aria-pressed:border-ctp-blue aria-pressed:bg-ctp-blue/15" size="sm" aria-label={`Include ${option.text}`} aria-pressed={hasFilterValue(selected, option.value)} onClick={() => onToggle(option.value)}>Include</Button>
          <Button className="aria-pressed:border-ctp-peach aria-pressed:bg-ctp-peach/15" size="sm" aria-label={`Exclude ${option.text}`} aria-pressed={hasFilterValue(selected, excludeFilterValue(option.value))} onClick={() => onToggle(excludeFilterValue(option.value))}>Exclude</Button>
        </div>
      </div>)}
      {matches.length > 50 && <p className="py-2 text-sm text-ctp-subtext1">{matches.length - 50} more matches. Keep typing to narrow the list.</p>}
      {!matches.length && <p role="status" className="py-3 text-sm">No matching {label.toLowerCase()}.</p>}
    </div>}
  </FilterGroup>;
}
