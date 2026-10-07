import { useState, type ReactNode } from "react";
import type { CardStaplesData, StapleFilters } from "@gatcg/shared";
import Button from "../../../components/ui/Button";
import DialogSheet from "../../../components/ui/DialogSheet";
import { fieldClass, titleCase } from "./staplesPresentation";

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1 text-sm text-ctp-subtext1"><span>{label}</span>{children}</label>;
}

export default function StaplesFilters({ data, filters, champion, format, period, onChange, onDismiss }: {
  data: CardStaplesData | undefined; filters: StapleFilters; champion: string; format: string; period: string;
  onChange: (key: string, value: string | string[]) => void; onDismiss: () => void;
}) {
  const [keywordSearch, setKeywordSearch] = useState("");
  const unique = (values: string[]) => [...new Set(values)].sort();
  const keywords = unique([...(data?.cards.flatMap(card => card.keywords) ?? []), ...filters.keywords]);
  const champions = unique([...(data?.cohorts.flatMap(cohort => cohort.champion ? [cohort.champion] : []) ?? []), ...(champion ? [champion] : [])]);
  const formats = unique([...(data?.cohorts.flatMap(cohort => cohort.format ? [cohort.format] : []) ?? ["standard"]), ...(format ? [format] : [])]);
  const levels = [...new Set([...(data?.cards.flatMap(card => card.championLevel === null ? [] : [card.championLevel]) ?? []), ...(filters.level ? [Number(filters.level)] : [])])].sort((a, b) => a - b);
  return <DialogSheet title="Filter staples" onDismiss={onDismiss} footer={<Button variant="primary" className="w-full" onClick={onDismiss}>Show cards</Button>}>
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FilterField label="Format"><select className={fieldClass} value={format} onChange={e => onChange("format", e.target.value)}><option value="">All formats</option>{formats.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></FilterField>
        <FilterField label="Results period"><select className={fieldClass} value={period} onChange={e => onChange("period", e.target.value)}><option value="90">Last 90 days</option><option value="30">Last 30 days</option><option value="all">All recorded results</option></select></FilterField>
      </div>
      <FilterField label="Champion decks"><select className={fieldClass} value={champion} onChange={event => onChange("champion", event.target.value)}><option value="">All champions</option>{champions.map(name => <option key={name}>{name}</option>)}</select></FilterField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FilterField label="Card type"><select className={fieldClass} value={filters.type} onChange={e => onChange("type", e.target.value)}><option value="">All types</option>{unique([...(data?.cards.flatMap(card => card.types) ?? []), ...(filters.type ? [filters.type] : [])]).map(type => <option key={type} value={type}>{titleCase(type)}</option>)}</select></FilterField>
        <FilterField label="Card class"><select className={fieldClass} value={filters.cardClass} onChange={e => onChange("class", e.target.value)}><option value="">All classes</option>{unique([...(data?.cards.flatMap(card => card.classes) ?? []), ...(filters.cardClass ? [filters.cardClass] : [])]).map(type => <option key={type} value={type}>{titleCase(type)}</option>)}</select></FilterField>
        <FilterField label="Champion card level"><select className={fieldClass} value={filters.level} onChange={e => onChange("level", e.target.value)}><option value="">Any card</option>{levels.map(level => <option key={level} value={level}>Level {level} champions</option>)}</select></FilterField>
        <FilterField label="Minimum decks"><select className={fieldClass} value={filters.minDecks} onChange={e => onChange("min", e.target.value)}>{[1, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n} {n === 1 ? "deck" : "decks"}</option>)}</select></FilterField>
        <FilterField label="Cost type"><select className={fieldClass} value={filters.costKind} onChange={e => onChange("cost", e.target.value)}><option value="reserve">Reserve</option><option value="memory">Memory</option></select></FilterField>
        <FilterField label="Maximum cost"><select className={fieldClass} value={filters.maxCost} onChange={e => onChange("max", e.target.value)}><option value="">Any cost</option>{Array.from({ length: 16 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></FilterField>
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-2 font-semibold">Keywords</legend>
        <FilterField label="Find a keyword"><input type="search" className={fieldClass} value={keywordSearch} onChange={e => setKeywordSearch(e.target.value)} placeholder="Keyword name" /></FilterField>
        <FilterField label="Match keywords"><select className={fieldClass} value={filters.keywordMode} onChange={e => onChange("match", e.target.value)}><option value="any">Any selected keyword</option><option value="all">All selected keywords</option></select></FilterField>
        <div className="grid grid-cols-2 gap-2">{keywords.filter(keyword => keyword.toLowerCase().includes(keywordSearch.trim().toLowerCase())).map(keyword => <label key={keyword} className="flex min-h-control cursor-pointer items-center gap-2 rounded-lg border border-ctp-surface1 px-2 text-sm has-[:checked]:border-ctp-blue has-[:checked]:bg-ctp-blue/10">
          <input type="checkbox" className="size-5 shrink-0 accent-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" checked={filters.keywords.includes(keyword)} onChange={e => onChange("keyword", e.target.checked ? [...filters.keywords, keyword] : filters.keywords.filter(value => value !== keyword))} />
          <span className="min-w-0 break-words">{keyword}</span>
        </label>)}</div>
        {!keywords.length && <p className="text-sm text-ctp-subtext0">Keywords become available when staple data loads.</p>}
      </fieldset>
    </div>
  </DialogSheet>;
}
