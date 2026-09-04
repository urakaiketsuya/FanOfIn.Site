import { useMemo } from "react";
import { useOmnidexIndex, useVenueGeocodes } from "../tournaments/data";
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
  /** Present only when Nominatim resolved this venue's address (see pipeline/src/omnidex/geocode.ts) — most venues have this, but a venue with no/unresolvable address won't. */
  lat?: number;
  lng?: number;
}

export interface RegionalVenuesResult {
  loading: boolean;
  rows: RegionalVenueRow[];
}

/**
 * Venues (Omnidex host records) hosting events in the selected region — grouped by `hostId`, same
 * "id, not name" join `EventDetail.tsx`'s own "More events at this venue" block already uses, since
 * some venues rename over time. Pure client-side pivot of the already-published Omnidex index,
 * joined against the pipeline's geocoded venues.json (Nominatim, see pipeline/src/omnidex/geocode.ts)
 * for lat/lng when available.
 */
export function useRegionalVenues(mode: RegionGroupMode, selectedRegion: string | null): RegionalVenuesResult {
  const index = useOmnidexIndex();
  const geocodes = useVenueGeocodes();

  return useMemo((): RegionalVenuesResult => {
    if (!index) return { loading: true, rows: [] };
    if (!selectedRegion) return { loading: false, rows: [] };

    const coordsByHost = new Map(geocodes?.venues.map((v) => [v.hostId, v]) ?? []);

    const byHost = new Map<number, RegionalVenueRow>();
    for (const e of index.events) {
      if (e.hostId === 0) continue;
      if (regionKeyForCountry(e.hostCountry, mode) !== selectedRegion) continue;
      let row = byHost.get(e.hostId);
      if (!row) {
        const coords = coordsByHost.get(e.hostId);
        row = {
          hostId: e.hostId,
          hostName: e.hostName,
          hostAddress: e.hostAddress,
          eventCount: 0,
          lastEventDate: e.date,
          events: [],
          lat: coords?.lat,
          lng: coords?.lng,
        };
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
  }, [index, geocodes, mode, selectedRegion]);
}
