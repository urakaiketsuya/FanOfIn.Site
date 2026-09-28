import type { ReactNode } from "react";
import { TextInput } from "./ui/FormControl";

/** Common search and wrapping action layout; filters and sorting remain feature-owned. */
export default function CardResultsToolbar({ query, onQuery, label = "Search cards", onSubmit, children }: {
  query: string; onQuery: (value: string) => void; label?: string; onSubmit?: () => void; children: ReactNode;
}) {
  return <div data-component="CardResultsToolbar">
    <TextInput aria-label={label} value={query} onChange={event => onQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") onSubmit?.(); }} placeholder="Search names or rules text…" className="w-full text-base" />
    <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>
  </div>;
}
