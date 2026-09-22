import { useMemo, useState } from "react";
import type { OptionValue } from "@gatcg/shared";
import FilterGroup from "./FilterGroup";

export default function SearchSelectFilter({ label, options, selected, onToggle }: {
  label: string;
  options: OptionValue[];
  selected: ReadonlySet<string>;
  onToggle: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const valueByText = useMemo(() => new Map(options.map((option) => [option.text, option.value])), [options]);
  const datalistId = `filter-search-${label.toLowerCase().replaceAll(" ", "-")}`;

  function tryAdd(text: string) {
    const value = valueByText.get(text);
    if (value === undefined || selected.has(value)) return;
    onToggle(value);
    setInput("");
  }

  return (
    <FilterGroup label={label} onClear={selected.size > 0 ? () => [...selected].forEach(onToggle) : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {options.filter((option) => selected.has(option.value)).map((option) => (
          <button key={option.value} type="button" onClick={() => onToggle(option.value)} className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-blue/20 px-2.5 py-1 text-xs text-ctp-blue">
            {option.text}<span aria-hidden="true">&times;</span>
          </button>
        ))}
      </div>
      <input type="text" list={datalistId} aria-label={`Search ${label.toLowerCase()}`} value={input} onChange={(event) => { setInput(event.target.value); if (valueByText.has(event.target.value)) tryAdd(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") tryAdd(input); }} placeholder={`Search ${label.toLowerCase()}…`} className="mt-1.5 w-full max-w-xs rounded-md border border-ctp-surface1 bg-ctp-mantle px-2.5 py-1 text-xs text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none" />
      <datalist id={datalistId}>{options.map((option) => <option key={option.value} value={option.text} />)}</datalist>
    </FilterGroup>
  );
}
