import { useMemo } from "react";
import { useOmnidexIndex } from "../tournaments/data";
import { regionKeyForCountry, type RegionGroupMode } from "../../lib/regions";

export interface RegionalVenueEvent {
  id: number;
  name: string;
  date: string;
}

export interface RegionalVenueRow {
  hostId: number;
  hostName: string;
  hostAddress: string;
  eventCount: number;
  lastEventDate: string;
  events: RegionalVenueEvent[];
}

export interface RegionalVenuesResult {
  loading: boolean;
  rows: RegionalVenueRow[];
}

/**
 * Venues (Omnidex host records) hosting events in the selected region — grouped by `hostId`, same
 * "id, not name" join `EventDetail.tsx`'s own "More events at this venue" block already uses, since
 * some venues rename over time. Pure client-side pivot of the already-published Omnidex index; no
 * geocoding data exists anywhere in the pipeline, so this is a sortable list, not a map.
 */
export function useRegionalVenues(mode: RegionGroupMode, selectedRegion: string | null): RegionalVenuesResult {
  const index = useOmnidexIndex();

  return useMemo((): RegionalVenuesResult => {
    if (!index) return { loading: true, rows: [] };
    if (!selectedRegion) return { loading: false, rows: [] };

    const byHost = new Map<number, RegionalVenueRow>();
    for (const e of index.events) {
      if (e.hostId === 0) continue;
      if (regionKeyForCountry(e.hostCountry, mode) !== selectedRegion) continue;
      let row = byHost.get(e.hostId);
      if (!row) {
        row = { hostId: e.hostId, hostName: e.hostName, hostAddress: e.hostAddress, eventCount: 0, lastEventDate: e.date, events: [] };
        byHost.set(e.hostId, row);
      }
      row.eventCount += 1;
      if (e.date > row.lastEventDate) row.lastEventDate = e.date;
      row.events.push({ id: e.id, name: e.name, date: e.date });
    }

    const rows = Array.from(byHost.values())
      .map((row) => ({ ...row, events: row.events.sort((a, b) => b.date.localeCompare(a.date)) }))
      .sort((a, b) => b.eventCount - a.eventCount);

    return { loading: false, rows };
  }, [index, mode, selectedRegion]);
}
