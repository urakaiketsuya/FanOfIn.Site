import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RegionalVenueRow } from "./useRegionalVenues";

/** Small filled dot, not Leaflet's default pin image — avoids the bundler-asset-path dance those need, and matches the site's flat/minimal style. */
const venueIcon = L.divIcon({
  className: "",
  html: '<span class="block h-3 w-3 rounded-full bg-ctp-blue ring-2 ring-ctp-crust"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

/**
 * Plots geocoded venues (see pipeline/src/omnidex/geocode.ts) on a map, alongside the existing
 * sortable venue list. Renders nothing when no venue in the current region has coordinates — a
 * graceful no-op, same convention the Products/Champion-cutout integrations already use.
 */
export default function VenueMap({ rows }: { rows: RegionalVenueRow[] }) {
  const points = useMemo(
    () => rows.filter((r): r is RegionalVenueRow & { lat: number; lng: number } => r.lat !== undefined && r.lng !== undefined),
    [rows],
  );

  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => (points.length > 0 ? points.map((p) => [p.lat, p.lng]) : null), [points]);

  if (!bounds) return null;

  return (
    <div className="mt-3 h-96 overflow-hidden rounded-lg border border-ctp-surface1 [&_.leaflet-popup-close-button]:text-ctp-subtext1 [&_.leaflet-popup-content-wrapper]:bg-ctp-mantle [&_.leaflet-popup-content-wrapper]:text-ctp-text [&_.leaflet-popup-tip]:bg-ctp-mantle [&_.leaflet-tile-pane]:brightness-[.6] [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180">
      <MapContainer
        key={points.map((p) => p.hostId).join(",")}
        bounds={bounds}
        boundsOptions={{ padding: [32, 32], maxZoom: 13 }}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "var(--color-ctp-mantle)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {points.map((p) => (
          <Marker key={p.hostId} position={[p.lat, p.lng]} icon={venueIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-medium text-ctp-text">{p.hostName}</p>
                {p.hostAddress && <p className="mt-0.5 text-xs text-ctp-subtext0">{p.hostAddress}</p>}
                <p className="mt-1 text-xs text-ctp-subtext1">
                  {p.eventCount} event{p.eventCount === 1 ? "" : "s"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
