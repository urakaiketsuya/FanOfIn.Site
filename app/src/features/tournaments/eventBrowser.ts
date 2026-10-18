import type { OmnidexEventSummary } from "@gatcg/shared";

export type EventDecklistFilter = "any" | "available" | "unavailable";
export type EventCoverageFilter = "any" | "some" | "complete" | "none";
export type EventSortMode = "date" | "size" | "type" | "relevance";

export interface EventBrowserFilters {
  search: string;
  minPlayers: number;
  category: string | null;
  setting: string | null;
  seasonId: number | null;
  country: string | null;
  dateFrom: string;
  dateTo: string;
  decklists: EventDecklistFilter;
  coverage: EventCoverageFilter;
  sort: EventSortMode;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

// Published events are immutable. Weak keys let a replaced dataset be collected.
const searchFields = new WeakMap<OmnidexEventSummary, ReturnType<typeof prepareSearchFields>>();
function prepareSearchFields(event: OmnidexEventSummary) {
  const name = normalize(event.name), host = normalize(event.hostName), address = normalize(event.hostAddress);
  const people = (event.participantNames ?? []).map(normalize);
  const champions = (event.championNames ?? []).map(normalize);
  return { name, host, address, people, champions,
    all: [name, host, address, normalize(event.hostCountry), normalize(event.seasonName ?? ""), ...people, ...champions] };
}
function fieldsFor(event: OmnidexEventSummary) {
  let fields = searchFields.get(event);
  if (!fields) { fields = prepareSearchFields(event); searchFields.set(event, fields); }
  return fields;
}
function relevance(event: OmnidexEventSummary, needle: string): number {
  const { name, host, address, people, champions } = fieldsFor(event);
  return name === needle ? 6 : name.startsWith(needle) ? 5 : people.includes(needle) ? 4 : champions.includes(needle) ? 3 : name.includes(needle) ? 2 : people.some((value) => value.includes(needle)) || champions.some((value) => value.includes(needle)) || host.includes(needle) ? 1 : address.includes(needle) ? 0 : -1;
}

export function filterAndSortEvents(events: OmnidexEventSummary[], filters: EventBrowserFilters, categoryRank: (category: string) => number): OmnidexEventSummary[] {
  const needle = normalize(filters.search);
  const from = filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : "";
  const to = filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : "";
  const matches = events.filter((event) =>
    event.playerCount >= filters.minPlayers
    && (!filters.category || event.category === filters.category)
    && (!filters.setting || event.setting === filters.setting)
    && (filters.seasonId === null || event.seasonId === filters.seasonId)
    && (!filters.country || event.hostCountry === filters.country)
    && (!from || event.date >= from)
    && (!to || event.date <= to)
    && (filters.decklists === "any" || (filters.decklists === "available" ? event.decklists : !event.decklists))
    && (filters.coverage === "any" || (() => {
      const count = event.publicDecklistCount ?? 0;
      if (filters.coverage === "none") return count === 0;
      if (filters.coverage === "complete") return event.playerCount > 0 && count >= event.playerCount;
      return count > 0;
    })())
    && (!needle || fieldsFor(event).all.some((value) => value.includes(needle)))
  );
  const scores = filters.sort === "relevance" && needle
    ? new Map(matches.map((event) => [event, relevance(event, needle)])) : null;
  return matches.sort((a, b) => {
    if (scores) {
      const difference = scores.get(b)! - scores.get(a)!;
      if (difference !== 0) return difference;
    }
    if (filters.sort === "size" && b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
    if (filters.sort === "type") {
      const difference = categoryRank(a.category) - categoryRank(b.category);
      if (difference !== 0) return difference;
    }
    return b.date.localeCompare(a.date);
  });
}

export function groupEventsByMonth(events: OmnidexEventSummary[]): { key: string; label: string; events: OmnidexEventSummary[] }[] {
  const groups = new Map<string, OmnidexEventSummary[]>();
  for (const event of events) {
    const key = event.date.slice(0, 7);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  return [...groups].map(([key, grouped]) => ({
    key,
    label: new Date(`${key}-02T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    events: grouped,
  }));
}
