import { useMemo, useState } from "react";
import type { OptionValue } from "@gatcg/shared";

interface FilterSearchGroupProps {
  label: string;
  options: OptionValue[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}

/**
 * Same filter shape as FilterCheckboxGroup, but for option lists too long to show as a wall of
 * chips (Subtype alone has 150+ values — rendered as chips, it pushed the actual card results
 * below the fold). Shows only the currently-selected chips (small, stable regardless of how many
 * options exist) plus a type-to-add search box, same datalist-input convention already used
 * elsewhere on this page (artist search) and across the app (All Decks' card search, Guided Deck
 * Builder's card search).
 */
export default function FilterSearchGroup({ label, options, selected, onToggle }: FilterSearchGroupProps) {
  const [input, setInput] = useState("");
  const valueByText = useMemo(() => new Map(options.map((o) => [o.text, o.value])), [options]);
  const datalistId = `filter-search-${label.toLowerCase()}`;

  function tryAdd(text: string) {
    const value = valueByText.get(text);
    if (value === undefined || selected.has(value)) return;
    onToggle(value);
    setInput("");
  }

  return (
    <fieldset data-component="FilterSearchGroup">
      <legend className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options
          .filter((opt) => selected.has(opt.value))
          .map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-blue/20 px-2.5 py-1 text-xs text-ctp-blue"
            >
              {opt.text}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
      </div>
      <input
        type="text"
        list={datalistId}
        aria-label={`Search ${label.toLowerCase()}`}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (valueByText.has(e.target.value)) tryAdd(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valueByText.has(input)) tryAdd(input);
        }}
        placeholder={`Search ${label.toLowerCase()}…`}
        className="mt-1.5 w-full max-w-xs rounded-md border border-ctp-surface1 bg-ctp-mantle px-2.5 py-1 text-xs text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />
      <datalist id={datalistId}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.text} />
        ))}
      </datalist>
    </fieldset>
  );
}
