import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { StoreRecord } from '@gatcg/shared';
import 'leaflet/dist/leaflet.css';
const icon = L.divIcon({ className: '', html: '<span class="block h-5 w-5 rounded-full bg-ctp-blue ring-2 ring-ctp-crust"></span>', iconSize: [48, 48], iconAnchor: [10, 10] });
function Bounds({ stores, selected }: { stores: StoreRecord[]; selected?: number }) {
  const map = useMap();
  useEffect(() => { if (stores.length) map.fitBounds(stores.map(s => [s.coordinates!.lat, s.coordinates!.lng]), { padding: [30, 30], maxZoom: 14, animate: false }); }, [map, stores]);
  useEffect(() => { const store = stores.find(s => s.id === selected); if (store?.coordinates) map.setView([store.coordinates.lat, store.coordinates.lng], 14, { animate: false }); }, [map, stores, selected]);
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect(); }, [map]);
  return null;
}
function StoreMarkers({ stores, selected, onSelect, search }: { stores: StoreRecord[]; selected?: number; onSelect: (id: number) => void; search: string }) {
  const [zoom, setZoom] = useState(2);
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = new Map<string, StoreRecord[]>();
  for (const store of stores) {
    const point = map.project([store.coordinates!.lat, store.coordinates!.lng], zoom);
    const key = store.id === selected || zoom >= 14 ? String(store.id) : `${Math.floor(point.x / 64)}:${Math.floor(point.y / 64)}`;
    groups.set(key, [...(groups.get(key) ?? []), store]);
  }
  return <>{[...groups.entries()].map(([key, group]) => {
    const store = group[0];
    const location: [number, number] = [store.coordinates!.lat, store.coordinates!.lng];
    if (group.length > 1) return <Marker key={key} position={location} title={`${group.length} locations — zoom in`} icon={L.divIcon({ className: '', html: `<span class="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-blue font-bold text-ctp-base">${group.length}</span>`, iconSize: [48,48], iconAnchor: [24,24] })} eventHandlers={{ click: () => map.setView(location, zoom + 2) }} />;
    return <Marker key={key} position={location} title={store.name} alt={store.name} icon={store.id === selected ? L.divIcon({className: '', html: '<span class="block h-7 w-7 rounded-full border-4 border-white bg-ctp-blue"></span>', iconSize:[48,48],iconAnchor:[14,14]}) : icon} eventHandlers={{ click: () => onSelect(store.id) }}><Popup><strong>{store.name}</strong><p>{store.address}</p><Link className="flex min-h-control items-center underline" to={`/stores/${store.id}${search}`}>View venue and events</Link></Popup></Marker>;
  })}</>;
}
export default function StoreMap({ stores, selected, onSelect, search = "" }: { search?: string; stores: StoreRecord[]; selected?: number; onSelect: (id: number) => void }) {
  const [error, setError] = useState(false);
  if (!stores.length) return <p role="status" className="p-4">No mapped locations in these results. Use the list to see all matches.</p>;
  return <div>
    {error && <p role="status" className="mb-2">Map tiles could not load. Store addresses and directions are available in the list.</p>}
    <div className="isolate h-72 lg:h-[calc(100dvh-8rem)] lg:max-h-[48rem] overflow-hidden rounded-xl border border-ctp-surface1 [&_.leaflet-control-zoom_a]:!h-12 [&_.leaflet-control-zoom_a]:!w-12 [&_.leaflet-control-zoom_a]:!leading-[48px] [&_.leaflet-popup-close-button]:!h-12 [&_.leaflet-popup-close-button]:!w-12">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <Bounds stores={stores} selected={selected} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' eventHandlers={{ tileerror: () => setError(true) }} />
        <StoreMarkers stores={stores} selected={selected} onSelect={onSelect} search={search} />
      </MapContainer>
    </div>
  </div>;
}
