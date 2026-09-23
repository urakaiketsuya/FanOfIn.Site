import assert from "node:assert/strict";
import test from "node:test";
import type { OmnidexEventSummary } from "@gatcg/shared";
import { filterAndSortEvents, groupEventsByMonth, type EventBrowserFilters } from "../src/features/tournaments/eventBrowser";

function event(overrides: Partial<OmnidexEventSummary>): OmnidexEventSummary {
  return { id: 1, name: "Event", date: "2025-02-01T12:00:00.000Z", format: "standard", status: "complete", structure: "rounds", type: "swiss", category: "regular", ranked: true, decklists: false, playerCount: 8, seasonId: 1, seasonName: "Season One", seasonSlug: "one", hostName: "Card Shop", hostId: 1, hostAddress: "Toronto, Canada", hostCountry: "CA", setting: "physical", url: "", ...overrides };
}

const defaults: EventBrowserFilters = { search: "", minPlayers: 0, category: null, setting: null, seasonId: null, country: null, dateFrom: "", dateTo: "", decklists: "any", coverage: "any", sort: "date" };

test("event browser searches location and filters date, country, and decklist availability", () => {
  const events = [event({ id: 1, name: "Alpha", decklists: true }), event({ id: 2, hostAddress: "Osaka, Japan", hostCountry: "JP", date: "2025-03-01T12:00:00.000Z" })];
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, search: "osaka" }, () => 0).map((item) => item.id), [2]);
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, country: "CA", decklists: "available", dateTo: "2025-02-02" }, () => 0).map((item) => item.id), [1]);
});

test("event browser sorts by attendance and groups the filtered result by month", () => {
  const events = [event({ id: 1, playerCount: 12 }), event({ id: 2, playerCount: 40, date: "2025-03-01T12:00:00.000Z" })];
  const sorted = filterAndSortEvents(events, { ...defaults, sort: "size" }, () => 0);
  assert.deepEqual(sorted.map((item) => item.id), [2, 1]);
  assert.deepEqual(groupEventsByMonth(sorted).map((group) => [group.key, group.events.length]), [["2025-03", 1], ["2025-02", 1]]);
});

test("relevance prioritizes an event-name match over organizer and address matches", () => {
  const events = [event({ id: 1, name: "Other", hostName: "Alpha Games" }), event({ id: 2, name: "Alpha Open" }), event({ id: 3, name: "Other", hostAddress: "Alpha Street" })];
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, search: "alpha", sort: "relevance" }, () => 0).map((item) => item.id), [2, 1, 3]);
});

test("event browser searches participants and champions and filters public coverage", () => {
  const events = [
    event({ id: 1, playerCount: 2, participantNames: ["Avery"], championNames: ["Diao Chan"], publicDecklistCount: 2 }),
    event({ id: 2, playerCount: 8, participantNames: ["Morgan"], championNames: ["Silvie"], publicDecklistCount: 1 }),
    event({ id: 3, playerCount: 8, publicDecklistCount: 0 }),
  ];
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, search: "diao" }, () => 0).map((item) => item.id), [1]);
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, search: "morgan" }, () => 0).map((item) => item.id), [2]);
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, coverage: "complete" }, () => 0).map((item) => item.id), [1]);
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, coverage: "some" }, () => 0).map((item) => item.id), [1, 2]);
  assert.deepEqual(filterAndSortEvents(events, { ...defaults, coverage: "none" }, () => 0).map((item) => item.id), [3]);
});
