import { Link } from "react-router-dom";
import { useEffect, useId, useState, type ReactNode } from "react";
import { formatFilterQuery, parseFilterQuery, SEARCH_FACETS, filterValue, filterLabel, type SearchFacets, type SearchFacet } from "@gatcg/shared";
import Button from "../ui/Button";

/** One query and picker state; invalid drafts never replace the last applied filters. */
export default function FilterQuery({ text, facets, onChange, allowed = Object.values(SEARCH_FACETS), allowText = true, actions, compact = false }: {
  actions?: ReactNode;
  compact?: boolean;
  text: string; facets: SearchFacets; onChange: (text: string, facets: SearchFacets) => void; allowed?: SearchFacet[]; allowText?: boolean;
}) {
  const errorId = useId();
  const value = formatFilterQuery(text, facets);
  const [draft, setDraft] = useState(value), [error, setError] = useState("");
  useEffect(() => { setDraft(value); setError(""); }, [value]);
  function submit() {
    const parsed = parseFilterQuery(draft);
    if (!allowText && parsed.text.trim()) { setError("Use a field such as subtype:harmony, or choose cards below."); return; }
    const unsupported = [...Object.keys(parsed.facets), ...parsed.usedFacets ?? []].find(key => !allowed.includes(key as SearchFacet));
    if (parsed.error || unsupported) { setError(parsed.error ?? `${unsupported} is not available in this view.`); return; }
    setError("");
    onChange(parsed.text, Object.fromEntries(allowed.map(key => [key, parsed.facets[key] ?? new Set()])));
  }
  return <div className="my-3" data-component="FilterQuery">
    <div className="flex gap-2"><input aria-label="Search cards and filters" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }} placeholder={allowText ? (compact ? "Search names or rules text…" : "Card name or -subtype:harmony") : "Filter deck contents: -subtype:harmony"} className="min-h-12 min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-base" /><Button onClick={submit}>Search</Button></div>
    {!compact && <div className="flex flex-wrap items-center gap-2">{actions}<Link to="/cards/search-reference" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded text-sm text-ctp-blue underline focus-visible:outline-2">Search reference<span className="sr-only"> (opens in a new tab)</span></Link></div>}
    {error && <p id={errorId} role="alert" className="mt-2 text-sm text-ctp-red">{error}</p>}
    <div className="flex flex-wrap gap-2 empty:hidden [&:not(:empty)]:mt-2" aria-label="Active search filters">{Object.entries(SEARCH_FACETS).flatMap(([label, key]) => [...facets[key] ?? []].map(v => <Button size="sm" key={`${key}:${v}`} aria-label={`Remove ${label} ${filterLabel(v)}`} onClick={() => onChange(text, { ...facets, [key]: new Set([...facets[key] ?? []].filter(item => item !== v)) })}>{v.startsWith('-') ? 'Exclude' : 'Include'} {label}: {filterValue(v)} ×</Button>))}</div>
  </div>;
}
