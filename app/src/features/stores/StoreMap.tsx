import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { StoreRecord } from '@gatcg/shared';
import 'leaflet/dist/leaflet.css';
const icon = L.divIcon({ className: '', html: '<span class="block h-5 w-5 rounded-full bg-ctp-blue ring-2 ring-ctp-crust"></span>', iconSize: [48, 48], iconAnchor: [10, 10] });
function Bounds({ stores }: { stores: StoreRecord[] }) {
  const map = useMap();
  useEffect(() => { if (stores.length) map.fitBounds(stores.map(s => [s.coordinates!.lat, s.coordinates!.lng]), { padding: [30, 30], maxZoom: 14 }); }, [map, stores]);
  return null;
}
export default function StoreMap({ stores, onSelect }: { stores: StoreRecord[]; onSelect: (id: number) => void }) {
  const [error, setError] = useState(false);
  if (!stores.length) return <p role="status" className="p-4">No mapped locations in these results. Use the list to see all matches.</p>;
  return <div>
    {error && <p role="status" className="mb-2">Map tiles could not load. Store addresses and directions are available in the list.</p>}
    <div className="isolate h-96 overflow-hidden rounded-xl border border-ctp-surface1 [&_.leaflet-control-zoom_a]:!h-12 [&_.leaflet-control-zoom_a]:!w-12 [&_.leaflet-control-zoom_a]:!leading-[48px] [&_.leaflet-popup-close-button]:!h-12 [&_.leaflet-popup-close-button]:!w-12">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <Bounds stores={stores} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' eventHandlers={{ tileerror: () => setError(true) }} />
        {stores.map(store => <Marker key={store.id} position={[store.coordinates!.lat, store.coordinates!.lng]} icon={icon} title={store.name} alt={store.name} eventHandlers={{ popupopen: () => onSelect(store.id) }}><Popup><strong>{store.name}</strong><p>{store.address}</p><Link className="flex min-h-control items-center underline" to={`/stores/${store.id}`}>View venue and events</Link></Popup></Marker>)}
      </MapContainer>
    </div>
  </div>;
}
