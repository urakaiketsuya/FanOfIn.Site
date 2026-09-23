import type { OmnidexEventSummary } from "@gatcg/shared";

export type EventDecklistFilter = "any" | "available" | "unavailable";
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
  sort: EventSortMode;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

export function filterAndSortEvents(events: OmnidexEventSummary[], filters: EventBrowserFilters, categoryRank: (category: string) => number): OmnidexEventSummary[] {
  const needle = normalize(filters.search);
  const from = filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : "";
  const to = filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : "";
  return events.filter((event) =>
    event.playerCount >= filters.minPlayers
    && (!filters.category || event.category === filters.category)
    && (!filters.setting || event.setting === filters.setting)
    && (filters.seasonId === null || event.seasonId === filters.seasonId)
    && (!filters.country || event.hostCountry === filters.country)
    && (!from || event.date >= from)
    && (!to || event.date <= to)
    && (filters.decklists === "any" || (filters.decklists === "available" ? event.decklists : !event.decklists))
    && (!needle || [event.name, event.hostName, event.hostAddress, event.hostCountry, event.seasonName ?? ""].some((value) => normalize(value).includes(needle)))
  ).sort((a, b) => {
    if (filters.sort === "relevance" && needle) {
      const score = (event: OmnidexEventSummary) => {
        const name = normalize(event.name); const host = normalize(event.hostName); const address = normalize(event.hostAddress);
        return name === needle ? 4 : name.startsWith(needle) ? 3 : name.includes(needle) ? 2 : host.includes(needle) ? 1 : address.includes(needle) ? 0 : -1;
      };
      const difference = score(b) - score(a);
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
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups].map(([key, grouped]) => ({
    key,
    label: new Date(`${key}-02T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    events: grouped,
  }));
}
