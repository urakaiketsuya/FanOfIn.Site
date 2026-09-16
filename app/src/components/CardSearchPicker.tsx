import { useMemo } from "react";

interface CardSearchPickerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  maxResults?: number;
  className?: string;
}

/** Shared type-ahead card selector. Selection is immediate so mobile users do not
 * need to choose a result and then find a second confirmation control. */
export default function CardSearchPicker({
  options,
  value,
  onChange,
  onSelect,
  placeholder = "Search cards…",
  ariaLabel = "Search cards",
  maxResults = 8,
  className = "",
}: CardSearchPickerProps) {
  const optionSet = useMemo(() => new Set(options), [options]);
  const results = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query || optionSet.has(value)) return [];
    return options.filter((name) => name.toLowerCase().includes(query)).slice(0, maxResults);
  }, [maxResults, optionSet, options, value]);

  function choose(name: string) {
    onSelect(name);
    onChange("");
  }

  return <div className={`relative min-w-0 ${className}`}>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const selection = optionSet.has(value) ? value : results[0];
        if (!selection) return;
        event.preventDefault();
        choose(selection);
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete="off"
      className="min-h-11 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30 sm:text-sm"
    />
    {results.length > 0 && <div role="listbox" aria-label="Matching cards" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ctp-surface1 bg-ctp-base p-1 shadow-xl">
      {results.map((name) => <button key={name} type="button" role="option" aria-selected="false" onClick={() => choose(name)} className="block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-ctp-text hover:bg-ctp-surface0 focus:bg-ctp-surface0 focus:outline-none">{name}</button>)}
    </div>}
  </div>;
}
