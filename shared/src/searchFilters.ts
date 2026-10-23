import { canonicalCardTag } from "./cardTags.js";
/** Facet selections use a leading '-' for exclusion, including in saved URLs. */
export function filterValue(value: string): string { return value.startsWith('-') || value.startsWith('\\') ? value.slice(1) : value; }
export function includeFilterValue(value: string): string { return /^[-\\]/.test(value) ? `\\${value}` : value; }
export function excludeFilterValue(value: string): string { return `-${filterValue(value)}`; }
export function filterLabel(value: string): string { return value.startsWith('-') ? `Exclude: ${value.slice(1)}` : filterValue(value); }
export function toggleFilterValue(values: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(values);
  const existing = [...next].find(item => item.toLowerCase() === value.toLowerCase());
  if (existing !== undefined) next.delete(existing);
  else {
    for (const item of next) if (filterValue(item).toLowerCase() === filterValue(value).toLowerCase()) next.delete(item);
    next.add(value);
  }
  return next;
}
export function hasFilterValue(values: ReadonlySet<string>, value: string): boolean {
  return [...values].some(item => item.toLowerCase() === value.toLowerCase());
}
export function matchesFilterValues(actual: Iterable<string> | undefined, selected: ReadonlySet<string>, all = false): boolean {
  const present = new Set([...actual ?? []].map(v => v.toLowerCase()));
  const includes = [...selected].filter(v => !v.startsWith('-'));
  return ![...selected].some(v => v.startsWith('-') && present.has(v.slice(1).toLowerCase()))
    && (!includes.length || (all ? includes.every(v => present.has(filterValue(v).toLowerCase())) : includes.some(v => present.has(filterValue(v).toLowerCase()))));
}
export const SEARCH_FACETS = { class: 'classes', type: 'types', subtype: 'subtypes', element: 'elements', set: 'sets', edition: 'printingSets', rarity: 'rarities', tag: 'tags' } as const;
export type SearchFacet = typeof SEARCH_FACETS[keyof typeof SEARCH_FACETS];
export type SearchFacets = Partial<Record<SearchFacet, Set<string>>>;
/** Plain text keeps its historical phrase matching; only explicit field:value terms are parsed. */
export function parseFilterQuery(query: string): { text: string; facets: SearchFacets; error?: string } {
  const facets: SearchFacets = {}, plain: string[] = [];
  const tokens = query.match(/-?[a-z]+:(?:"[^"]*"|[^\s]*)|"[^"]*"|\S+/gi) ?? [];
  for (const token of tokens) {
    const match = token.match(/^(-?)([a-z]+):(.*)$/i);
    if (!match) { plain.push(token); continue; }
    const key = SEARCH_FACETS[match[2].toLowerCase() as keyof typeof SEARCH_FACETS];
    if (!key) return { text: query, facets: {}, error: `Unknown search field: ${match[2]}.` };
    const raw = match[3];
    if (!raw || raw.startsWith('"') && !raw.endsWith('"')) return { text: query, facets: {}, error: `Enter a value for ${match[2]}.` };
    let value = raw.replace(/^"|"$/g, '').trim().toUpperCase();
    if (key === "tags") value = canonicalCardTag(value.toLowerCase());
    if (!value) return { text: query, facets: {}, error: `Enter a value for ${match[2]}.` };
    const signed = match[1] ? `-${value}` : includeFilterValue(value), values = facets[key] ?? new Set<string>();
    if (values.has(match[1] ? includeFilterValue(value) : `-${value}`)) return { text: query, facets: {}, error: `Choose include or exclude for ${value}.` };
    values.add(signed); facets[key] = values;
  }
  return { text: plain.join(' '), facets };
}
export function formatFilterQuery(text: string, facets: SearchFacets): string {
  return [text, ...Object.entries(SEARCH_FACETS).flatMap(([field, key]) => [...facets[key] ?? []].map(value => {
    const raw = filterValue(value).toLowerCase();
    return `${value.startsWith('-') ? '-' : ''}${field}:${/\s/.test(raw) ? JSON.stringify(raw) : raw}`;
  }))].filter(Boolean).join(' ');
}
