import { useId, useMemo, useRef, useState } from "react";
import { CARD_TAG_CATEGORIES, canonicalCardTag, cardTagCategory, cardTagKey, type CardTagCategory } from "@gatcg/shared";
import { tagControl } from "./tagUi";

export interface TagOption { name: string; cardCount: number }
type Row = { kind: "tag"; name: string; cardCount: number; category: CardTagCategory } | { kind: "create"; name: string };

const MAX_OPTIONS = 24;
// Loose key: ignores case, spacing, punctuation and a trailing plural "s", so "Dragons" and "dragon" collide.
const looseKey = (name: string) => cardTagKey(name).replace(/[^\p{L}\p{N}]+/gu, "").replace(/s$/, "");

/** An existing tag that is almost the same as `value`, but not an exact match. */
export function nearDuplicateTag(value: string, tags: readonly TagOption[]): string | undefined {
  const key = looseKey(value);
  if (!key || tags.some(tag => cardTagKey(tag.name) === cardTagKey(value))) return undefined;
  return tags.find(tag => looseKey(tag.name) === key)?.name;
}

/** Searchable tag picker. Results are grouped by category and show how many cards use each tag. */
export default function TagCombobox({ value, onChange, tags, allowCreate, disabled, label = "Tag", describedBy }: {
  value: string; onChange: (value: string) => void; tags: readonly TagOption[];
  allowCreate: boolean; disabled?: boolean; label?: string; describedBy?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = cardTagKey(value);
  const rows = useMemo<Row[]>(() => {
    const matches = tags
      .filter(tag => !query || cardTagKey(tag.name).includes(query))
      .sort((a, b) => Number(cardTagKey(b.name).startsWith(query)) - Number(cardTagKey(a.name).startsWith(query)) || b.cardCount - a.cardCount || a.name.localeCompare(b.name))
      .slice(0, MAX_OPTIONS)
      .map(tag => ({ kind: "tag" as const, name: tag.name, cardCount: tag.cardCount, category: cardTagCategory(tag.name) }));
    // Group by category, keeping the relevance order inside each group.
    const grouped = CARD_TAG_CATEGORIES.flatMap(category => matches.filter(row => row.category === category));
    const exact = tags.some(tag => cardTagKey(tag.name) === query);
    const create: Row[] = allowCreate && value.trim() && !exact ? [{ kind: "create", name: canonicalCardTag(value) }] : [];
    return [...create, ...grouped];
  }, [tags, query, value, allowCreate]);
  const current = Math.min(active, Math.max(rows.length - 1, 0));
  const optionId = (index: number) => `${id}-option-${index}`;
  function choose(row: Row) { onChange(row.name); setOpen(false); inputRef.current?.focus(); }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive(rows.length ? (current + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length : 0);
    } else if (event.key === "Enter" && open && rows[current]) { event.preventDefault(); choose(rows[current]); }
    else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  }
  return <div className="relative flex flex-col gap-1 text-sm">
    <label htmlFor={id}>{label}</label>
    <input ref={inputRef} id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && rows[current] ? optionId(current) : undefined} aria-describedby={describedBy}
      autoComplete="off" disabled={disabled} className={`${tagControl} w-full`} value={value} maxLength={100} placeholder={allowCreate ? "Search or create a tag" : "Search existing tags"}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
    <ul id={listId} role="listbox" aria-label={`${label} suggestions`} hidden={!open || rows.length === 0}
      className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-ctp-surface1 bg-ctp-base py-1 shadow-lg">
      {rows.map((row, index) => {
        const heading = row.kind === "tag" && (index === 0 || (rows[index - 1].kind === "tag" ? (rows[index - 1] as Extract<Row, { kind: "tag" }>).category : "") !== row.category);
        return <li key={`${row.kind}:${row.name}`} role="presentation">
          {heading && <p className="px-3 pt-2 pb-1 text-xs font-semibold text-ctp-subtext0">{row.category}</p>}
          {/* mousedown keeps focus in the input so blur does not close the list before the click lands. */}
          <div id={optionId(index)} role="option" aria-selected={index === current} onMouseDown={event => event.preventDefault()} onClick={() => choose(row)} onMouseMove={() => setActive(index)}
            className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-3 py-2 transition-colors duration-200 ${index === current ? "bg-ctp-blue/10 font-semibold text-ctp-blue" : "hover:bg-ctp-surface0"}`}>
            {row.kind === "create"
              ? <span className="break-words"><span aria-hidden="true">＋ </span>Create new tag “{row.name}”</span>
              : <><span className="break-words">{index === current && <span aria-hidden="true">› </span>}{row.name}</span><span className="shrink-0 text-xs text-ctp-subtext0">{row.cardCount} {row.cardCount === 1 ? "card" : "cards"}</span></>}
          </div>
        </li>;
      })}
    </ul>
  </div>;
}
