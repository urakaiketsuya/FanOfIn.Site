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
/** Space-separated terms must all match; quotes keep a multi-word phrase together. */
export function searchTextTerms(query: string): string[] {
  return (query.toLowerCase().match(/"[^"]*"|[^\s"]+/g) ?? [])
    .map(term => term.replace(/^"|"$/g, '').trim()).filter(Boolean);
}
export function matchesSearchTerms(text: string, terms: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.every(term => normalized.includes(term));
}
export interface SearchTextClause {
  field: 'any' | 'name' | 'effect' | 'artist';
  value: string;
  exclude: boolean;
  exact: boolean;
}
export interface ParsedFilterQuery {
  /** Non-facet syntax, retained for existing URL and picker state. */
  text: string;
  facets: SearchFacets;
  clauses: SearchTextClause[];
  expression?: SearchExpression;
  numeric?: NumericSearchClause[];
  usedFacets?: SearchFacet[];
  error?: string;
}
const FIELD_ALIASES: Record<string, string> = {
  n: 'name', o: 'effect', oracle: 'effect', text: 'effect', a: 'artist',
  t: 'type', s: 'set', e: 'set', r: 'rarity',
};

export function matchesSearchClauses(fields: { name: readonly string[]; effect: readonly string[]; artist?: readonly string[] }, clauses: readonly SearchTextClause[]): boolean {
  return clauses.every(clause => {
    const values = clause.field === 'any' ? [[...fields.name, ...fields.effect].join(' ')] : fields[clause.field] ?? [];
    const matches = values.some(value => clause.exact
      ? value.toLowerCase() === clause.value.toLowerCase()
      : value.toLowerCase().includes(clause.value.toLowerCase()));
    return clause.exclude ? !matches : matches;
  });
}

/** Strict bounded grammar: whitespace ANDs text clauses; facet inclusions remain any-of. */
function parseFlatQuery(query: string): ParsedFilterQuery {
  const numeric: NumericSearchClause[] = [];
  const facets: SearchFacets = {}, plain: string[] = [], clauses: SearchTextClause[] = [];
  const fail = (error: string): ParsedFilterQuery => ({ text: query, facets: {}, clauses: [], error });
  // Consume every character: malformed syntax must never silently become a partial query.
  const tokens: string[] = [];
  let token = '', quoted = false, escaped = false;
  for (const char of query) {
    if (escaped) { token += char; escaped = false; continue; }
    if (quoted && char === '\\') { token += char; escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    if (!quoted && /\s/.test(char)) { if (token) tokens.push(token); token = ''; }
    else token += char;
  }
  if (quoted || escaped) return fail('Close the quoted search value.');
  if (token) tokens.push(token);
  for (const token of tokens) {
    const exclude = token.startsWith('-');
    const unsigned = exclude ? token.slice(1) : token;
    const comparison = unsigned.match(/^([a-z_]+)(:|!=|>=|<=|=|>|<)(.*)$/i);
    if (comparison && Object.hasOwn(NUMERIC_FIELDS, comparison[1].toLowerCase())) {
      if (!/^-?\d+(?:\.\d+)?$/.test(comparison[3]) || !Number.isFinite(Number(comparison[3]))) return fail('Enter a finite numeric value.');
      numeric.push({ field: NUMERIC_FIELDS[comparison[1].toLowerCase()], operator: comparison[2], value: Number(comparison[3]), exclude });
      plain.push(token);
      continue;
    }
    const match = unsigned.match(/^([a-z]+):(.*)$/i);
    const inputField = match?.[1].toLowerCase() ?? 'any';
    const field = Object.hasOwn(FIELD_ALIASES, inputField) ? FIELD_ALIASES[inputField] : inputField;
    const exact = !match && unsigned.startsWith('!');
    const raw = match ? match[2] : exact ? unsigned.slice(1) : unsigned;
    const key = Object.hasOwn(SEARCH_FACETS, field) ? SEARCH_FACETS[field as keyof typeof SEARCH_FACETS] : undefined;
    if (!key && !(match ? ['name', 'effect', 'artist'] : ['any']).includes(field)) return fail(`Unknown search field: ${match![1]}.`);
    if (!raw) return fail(`Enter a value${match ? ` for ${match[1]}` : ''}.`);
    let value: string;
    if (raw.startsWith('"')) {
      try { value = JSON.parse(raw); } catch { return fail('Use a complete quoted value, separated by spaces.'); }
    } else {
      if (/^(AND|OR|NOT)$/i.test(raw) || /[():<>=!|&"\\]/.test(raw) || raw.startsWith('/')) {
        return fail('Invalid search syntax. Quote literal text; regex is not supported.');
      }
      value = raw;
    }
    value = value.trim();
    if (!value) return fail(`Enter a value${match ? ` for ${match[1]}` : ''}.`);
    if (!key) {
      clauses.push({ field: exact ? 'name' : field as SearchTextClause['field'], value, exclude, exact });
      plain.push(token);
      continue;
    }
    value = key === 'tags' ? canonicalCardTag(value.toLowerCase()) : value.toUpperCase();
    const signed = exclude ? `-${value}` : includeFilterValue(value), values = facets[key] ?? new Set<string>();
    if (values.has(exclude ? includeFilterValue(value) : `-${value}`)) return fail(`Choose include or exclude for ${value}.`);
    values.add(signed); facets[key] = values;
  }
  return { text: plain.join(' '), facets, clauses, ...(numeric.length ? { numeric } : {}) };
}
export function formatFilterQuery(text: string, facets: SearchFacets): string {
  const prefix = text && Object.values(facets).some(values => values?.size) && parseFilterQuery(text).expression ? `(${text})` : text;
  return [prefix, ...Object.entries(SEARCH_FACETS).flatMap(([field, key]) => [...facets[key] ?? []].map(value => {
    const raw = filterValue(value).toLowerCase();
    return `${value.startsWith('-') ? '-' : ''}${field}:${/^[a-z0-9_-]+$/i.test(raw) && !/^(and|or|not)$/i.test(raw) ? raw : JSON.stringify(raw)}`;
  }))].filter(Boolean).join(' ');
}

export const NUMERIC_FIELDS: Record<string, 'cost_memory' | 'cost_reserve' | 'power' | 'life' | 'level' | 'durability'> = {
  memory: 'cost_memory', mem: 'cost_memory', cost_memory: 'cost_memory',
  reserve: 'cost_reserve', res: 'cost_reserve', cost_reserve: 'cost_reserve',
  power: 'power', pow: 'power', life: 'life', hp: 'life', level: 'level', lv: 'level', durability: 'durability', dur: 'durability',
};
export interface NumericSearchClause { field: typeof NUMERIC_FIELDS[string]; operator: string; value: number; exclude: boolean }
export function matchesNumericSearch(fields: Partial<Record<NumericSearchClause['field'], number | null>>, clauses: readonly NumericSearchClause[]): boolean {
  return clauses.every(({ field, operator, value, exclude }) => {
    const actual = fields[field];
    // The catalog uses negative sentinels for variable printed values.
    const matches = actual != null && Number.isFinite(actual) && actual >= 0 && (
      operator === '>' ? actual > value : operator === '>=' ? actual >= value :
      operator === '<' ? actual < value : operator === '<=' ? actual <= value :
      operator === '!=' ? actual !== value : actual === value);
    return exclude ? !matches : matches;
  });
}
export type SearchExpression = { kind: 'leaf'; query: string } | { kind: 'not'; child: SearchExpression } | { kind: 'and' | 'or'; left: SearchExpression; right: SearchExpression };
export function matchesSearchExpression(expression: SearchExpression, match: (query: string) => boolean): boolean {
  if (expression.kind === 'leaf') return match(expression.query);
  if (expression.kind === 'not') return !matchesSearchExpression(expression.child, match);
  return expression.kind === 'and'
    ? matchesSearchExpression(expression.left, match) && matchesSearchExpression(expression.right, match)
    : matchesSearchExpression(expression.left, match) || matchesSearchExpression(expression.right, match);
}

/** Explicit AND binds tighter than OR; adjacent flat terms retain legacy facet any-of. */
export function parseFilterQuery(query: string): ParsedFilterQuery {
  const tokens: string[] = [];
  let token = '', quoted = false, escaped = false;
  for (const char of query) {
    if (escaped) { token += char; escaped = false; continue; }
    if (quoted && char === '\\') { token += char; escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    if (!quoted && (/\s/.test(char) || char === '(' || char === ')')) {
      if (token) tokens.push(token);
      token = '';
      if (char === '(' || char === ')') tokens.push(char);
    } else token += char;
  }
  if (token) tokens.push(token);
  const fail = (error: string): ParsedFilterQuery => ({ text: query, facets: {}, clauses: [], error });
  if (quoted || escaped) return fail('Close the quoted search value.');
  if (!tokens.some(t => /^(AND|OR|NOT|\(|\))$/i.test(t))) return parseFlatQuery(query);
  let index = 0, depth = 0;
  const usedFacets = new Set<SearchFacet>();
  const peek = () => tokens[index]?.toUpperCase();
  const primary = (): SearchExpression => {
    if (++depth > 64) throw new Error('Search groups are nested too deeply.');
    try {
      if (peek() === 'NOT' || (peek() === '-' && tokens[index + 1] === '(')) {
        index++; return { kind: 'not', child: primary() };
      }
      if (peek() === '(') {
        index++;
        const result = or();
        if (peek() !== ')') throw new Error('Close the search group.');
        index++; return result;
      }
      const start = index;
      while (index < tokens.length && !/^(AND|OR|NOT|\(|\))$/i.test(tokens[index]) && !(tokens[index] === '-' && tokens[index + 1] === '(')) index++;
      if (index === start) throw new Error('Enter a search term between operators and groups.');
      const text = tokens.slice(start, index).join(' '), parsed = parseFlatQuery(text);
      if (parsed.error) throw new Error(parsed.error);
      Object.keys(parsed.facets).forEach(key => usedFacets.add(key as SearchFacet));
      return { kind: 'leaf', query: text };
    } finally { depth--; }
  };
  const and = (): SearchExpression => {
    let left = primary();
    while (index < tokens.length && peek() !== ')' && peek() !== 'OR') {
      if (peek() === 'AND') index++;
      left = { kind: 'and', left, right: primary() };
    }
    return left;
  };
  const or = (): SearchExpression => {
    let left = and();
    while (peek() === 'OR') { index++; left = { kind: 'or', left, right: and() }; }
    return left;
  };
  try {
    if (tokens.length > 512) return fail('Search expression is too long.');
    const expression = or();
    if (index !== tokens.length) return fail('Unexpected closing parenthesis.');
    return { text: query.trim(), facets: {}, clauses: [], expression, usedFacets: [...usedFacets] };
  } catch (error) { return fail((error as Error).message); }
}
