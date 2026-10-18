import { lazy, Suspense, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { upcomingStoreEvents, filterStores, type StoreDirectory, type StoreRecord } from '@gatcg/shared';
import PageLayout from '../../components/layout/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import DialogSheet from '../../components/ui/DialogSheet';
import Button from '../../components/ui/Button';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import { usePublishedData, usePublishedDataStatus } from '../../lib/sync/usePublishedData';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatCountry } from '../../lib/format';
const StoreMap = lazy(() => import('./StoreMap'));
const control = 'min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue';
const link = 'inline-flex min-h-control items-center rounded-lg px-3 text-ctp-blue underline focus-visible:outline-2 focus-visible:outline-ctp-blue';
const date = (value: string) => new Date(value).toLocaleDateString();
function Directions({ store }: { store: StoreRecord }) {
  return store.address ? <a className={link} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`} target="_blank" rel="noreferrer">Directions<span className="sr-only"> (new tab)</span></a> : null;
}
function StoreCard({ store, distance, selected, onMap, search = "" }: { store: StoreRecord; distance?: number; selected: boolean; onMap?: () => void; search?: string }) {
  const nextEvent = upcomingStoreEvents(store)[0];
  return <article id={`store-${store.id}`} aria-label={store.name} className={`min-w-0 rounded-xl border bg-ctp-mantle p-4 ${selected ? 'border-ctp-blue ring-2 ring-ctp-blue' : 'border-ctp-surface1'}`}>
    {selected && <p className="text-sm text-ctp-blue">Selected on map</p>}
    <h2 className="break-words text-lg font-semibold"><Link className="inline-flex min-h-control items-center text-ctp-blue hover:underline focus-visible:outline-2" to={`/stores/${store.id}${search}`} onClick={() => { sessionStorage.setItem("storeBrowseScroll", String(window.scrollY)); sessionStorage.setItem("storeBrowseLimit", String(document.querySelectorAll("article").length)); }}>{store.name}</Link></h2>
    <p className="text-sm text-ctp-subtext1">{store.kind === 'store' ? 'Store' : store.kind === 'venue' ? 'Event venue' : 'Store or venue'}{distance !== undefined ? ` · ${distance.toFixed(1)} km away` : ''}</p>
    <p className="mt-2 break-words">{store.address || 'Address unavailable'}</p>

    {nextEvent && <p className="mt-2 text-sm text-ctp-green">Expected from recent events · {date(nextEvent.date)}</p>}
    {!store.coordinates && <p className="mt-1 text-sm text-ctp-subtext1">Map location unavailable</p>}
    <p className="mt-2 text-sm font-medium">{store.review?.scheduleStatus === 'Published weekly' ? 'Published weekly schedule' : store.review?.scheduleStatus === 'Published fortnightly' ? 'Published fortnightly schedule' : 'Schedule unconfirmed'}</p>
    {store.review?.scheduleSummary && <p className="mt-1 text-sm">{store.review.scheduleSummary} · Store-local time unless noted</p>}
    {store.review?.scheduleUrl && <a className={link} href={store.review.scheduleUrl} target="_blank" rel="noreferrer">Check schedule<span className="sr-only"> (new tab)</span></a>}
    {store.review && <p className="text-xs text-ctp-subtext1">Schedule checked {store.review.checkedAt}</p>}
    <p className="mt-2 text-xs text-ctp-subtext1">Last recorded event · {date(store.lastEventDate)}</p>
    <div className="mt-2 flex flex-wrap items-center gap-1"><Directions store={store} />
    {store.review?.website && <a className={link} href={store.review.website} target="_blank" rel="noreferrer">Website<span className="sr-only"> (new tab)</span></a>}
    {onMap && store.coordinates && <Button variant="ghost" onClick={onMap}>Show on map</Button>}
    <Link className={link} to={`/stores/${store.id}${search}`} onClick={() => { sessionStorage.setItem("storeBrowseScroll", String(window.scrollY)); sessionStorage.setItem("storeBrowseLimit", String(document.querySelectorAll("article").length)); }}>View events</Link></div>
  </article>;
}
export default function Stores() {
  const { id } = useParams();
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [pending, startTransition] = useTransition();
  const requestedParams = useRef(params);
  useEffect(() => { if (!pending) requestedParams.current = params; }, [params, pending]);
  const data = usePublishedData<StoreDirectory>('store-directory', '/data/omnidex/stores.json');
  const status = usePublishedDataStatus('store-directory', '/data/omnidex/stores.json');
  const [position, setPosition] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selected, setSelected] = useState<number | undefined>(() => Number(params.get("selected")) || undefined);
  const [limit, setLimit] = useState(() => Math.max(30, Number(sessionStorage.getItem("storeBrowseLimit")) || 30));
  const query = params.get('q') ?? '';
  const country = params.get('country') ?? '';
  const region = params.get('region') ?? '';
  const days = ['30', '90', '365'].includes(params.get('days') ?? '') ? Number(params.get('days')) : 0;
  const radius = ['25', '50', '100', '250'].includes(params.get('radius') ?? '') ? Number(params.get('radius')) : 0;
  const view = params.get('view') === 'map' ? 'map' : 'list';
  const kind = params.get('kind') ?? '';
  const weekly = params.get('weekly') === '1';
  const search = params.size ? `?${params}` : '';
  useEffect(() => { if (id) window.scrollTo(0, 0); if (!id && data) { const y = sessionStorage.getItem('storeBrowseScroll'); if (y) { requestAnimationFrame(() => window.scrollTo(0, Number(y))); sessionStorage.removeItem('storeBrowseScroll'); } } }, [id, data]);
  const current = data?.stores.find(s => String(s.id) === id);
  useDocumentTitle(id ? current?.name ?? 'Store' : 'Store Locator');
  function change(key: string, value: string) {
    const next = new URLSearchParams(requestedParams.current);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'view') next.delete('selected');
    if (key === 'country') next.delete('region');
    requestedParams.current = next;
    startTransition(() => setParams(next, { replace: key === 'q' }));
    setLimit(30); if (key !== "view") setSelected(undefined);
  }
  function locate() {
    setLocationError('');
    if (!navigator.geolocation) { setLocationError('Location is unavailable. Search by city or postal code instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(result => { setPosition({ lat: result.coords.latitude, lng: result.coords.longitude }); setLocating(false); setLimit(30); if (!requestedParams.current.get('radius')) change('radius', '50'); }, () => { setLocationError('Could not access your location. Search by city or postal code instead.'); setLocating(false); }, { timeout: 12000, maximumAge: 300000 });
  }
  const eligible = useMemo(() => (data?.stores ?? []).filter(s => (!kind || s.kind === kind) && (!weekly || s.review?.scheduleStatus === 'Published weekly')), [data, kind, weekly]);
  const rows = useMemo(() => filterStores(eligible, { query, country, region, days, radius, position }), [eligible, query, country, region, days, radius, position]);
  const unmapped = useMemo(() => position && radius ? filterStores(eligible.filter(s => !s.coordinates), { query, country, region, days, radius: 0 }) : [], [eligible, position, radius, query, country, region, days]);
  const nearbyEvents = useMemo(() => position ? rows.flatMap(({ store, distance }) => {
    const event = upcomingStoreEvents(store)[0];
    return event && distance !== undefined && distance <= (radius || 50) ? [{ store, distance, event }] : [];
  }).slice(0, 6) : [], [rows, position, radius]);
  const mapped = useMemo(() => rows.filter(r => r.store.coordinates).map(r => r.store), [rows]);
  const countries = [...new Set(data?.stores.map(s => s.country).filter(c => c !== '??' && c) ?? [])].sort((a,b) => (formatCountry(a) ?? a).localeCompare(formatCountry(b) ?? b));
  const regions = [...new Set(data?.stores.filter(s => !country || s.country === country).flatMap(s => s.region ? [s.region] : []) ?? [])].sort();
  function selectStore(value: number) {
    setSelected(value);
    const next = new URLSearchParams(requestedParams.current); next.set('selected', String(value));
    requestedParams.current = next; setParams(next, { replace: true });
    const index = rows.findIndex(r => r.store.id === value);
    setLimit(previous => Math.max(previous, index + 1));
    if (desktop) requestAnimationFrame(() => document.getElementById(`store-${value}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  }
  const map = <Suspense fallback={<p role="status">Loading map…</p>}><StoreMap stores={mapped} search={search} selected={selected} onSelect={selectStore} /></Suspense>;
  return <PageLayout width="wide">
    <PageHeader title={id ? current?.name ?? 'Store' : 'Store Locator'} description={id ? undefined : 'Find Grand Archive stores and event venues.'} />
    {status.phase === 'error' && <div role="alert" className="mb-4"><p>{data ? 'Could not refresh locations. Showing saved results.' : 'Locations could not be loaded.'}</p><Button onClick={status.retry}>Retry</Button></div>}
    {!data && status.phase !== 'error' && <p role="status">Loading locations…</p>}
    {data && (id ? current ? <>
      <Link className={link} to={`/stores${search}`}>All stores and venues</Link>
      <StoreCard store={current} selected={false} />
      <section className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="upcoming-events">
        <h2 id="upcoming-events" className="text-xl font-semibold">Expected weekly dates</h2>
        {upcomingStoreEvents(current).length ? <>
          <p className="mt-2 text-sm text-ctp-subtext1">Expected dates based on recent weekly events. Confirm with the store. Dates shown in your time zone.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">{upcomingStoreEvents(current).map(event => <li key={event.date} className="rounded-lg bg-ctp-base p-3">
            <p className="font-medium">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <p className="text-sm text-ctp-subtext1">Expected · Weekly Grand Archive</p>
            <Link className={link} to={`/events/${event.sourceEventId}`}>Previous event</Link>
          </li>)}</ul>
        </> : <p className="mt-2 text-ctp-subtext1">No recent weekly schedule found.</p>}
      </section>
      {current.review && <section className="mt-4 rounded-xl border border-ctp-surface1 p-4"><h2 className="text-xl font-semibold">Published information</h2><p>{current.review.scheduleStatus} · Checked {current.review.checkedAt}</p><div className="flex flex-wrap">{current.review.sources.map(source => <a key={source.url} className={`${link} break-words`} href={source.url} target="_blank" rel="noreferrer">{source.label}<span className="sr-only"> (new tab)</span></a>)}</div></section>}
      {current.coordinates && <div className="mt-4"><Suspense fallback={<p>Loading map…</p>}><StoreMap stores={[current]} onSelect={() => {}} /></Suspense></div>}
      <h2 className="mt-6 text-xl font-semibold">Recent events</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">{current.eventCount.toLocaleString()} recorded {current.eventCount === 1 ? "event" : "events"} · Address from {date(current.addressDate)}</p>
      <ul className="mt-3 space-y-2">{current.recentEvents.map(event => <li key={event.id}><Link className={`${link} break-words`} to={`/events/${event.id}`}>{event.name} · {date(event.date)}</Link></li>)}</ul>
    </> : <><p role="status">Store or venue not found.</p><Link className={link} to="/stores">Browse locations</Link></> : <>
      <label className="block">Search stores, cities, or postal codes<input type="search" className={`${control} mt-2`} value={query} onChange={e => change('q', e.target.value)} /></label>
      <div className="my-3 flex flex-wrap gap-2"><Button variant="primary" onClick={locate} disabled={locating}>{locating ? 'Finding location…' : 'Near me'}</Button><Button onClick={() => setFiltersOpen(true)}>Filters{[country, region, days, kind, weekly, radius].filter(Boolean).length ? ` (${[country, region, days, kind, weekly, radius].filter(Boolean).length})` : ''}</Button></div>
      <div className="flex flex-wrap gap-2">{[['country', country && (formatCountry(country) ?? country)], ['region', region], ['days', days && `Activity: ${days} days`], ['kind', kind], ['weekly', weekly && 'Published weekly'], ['radius', radius && `${radius} km`]].filter(([,v]) => v).map(([key,label]) => <Button key={String(key)} aria-label={`Remove ${label} filter`} onClick={() => change(String(key), '')}>{label} ×</Button>)}</div>
      {filtersOpen && <DialogSheet title="Filter stores" onDismiss={() => setFiltersOpen(false)} footer={<Button className="w-full" variant="primary" onClick={() => setFiltersOpen(false)}>Show {rows.length} locations</Button>}><div className="grid gap-4">
        <label>Location type<select className={control} value={kind} onChange={e => change('kind', e.target.value)}><option value="">All locations</option><option value="store">Stores</option><option value="venue">Event venues</option></select></label>
        <label className="flex min-h-control items-center gap-3"><input type="checkbox" checked={weekly} onChange={e => change('weekly', e.target.checked ? '1' : '')} />Published weekly schedule</label>
        <label>Country<select className={control} value={country} onChange={e => change('country', e.target.value)}><option value="">All countries</option>{countries.map(c => <option key={c} value={c}>{formatCountry(c) ?? c}</option>)}</select></label>
        {!!regions.length && <label>Region<select className={control} value={region} onChange={e => change('region', e.target.value)}><option value="">All regions</option>{regions.map(r => <option key={r}>{r}</option>)}</select></label>}
        <label>Recorded activity<select className={control} value={days || ''} onChange={e => change('days', e.target.value)}><option value="">Any time</option>{[30,90,365].map(d => <option key={d} value={d}>Last {d} days</option>)}</select></label>
        {position && <label>Distance<select className={control} disabled={!position} value={radius || ''} onChange={e => change('radius', e.target.value)}><option value="">Any distance</option>{[25,50,100,250].map(km => <option key={km} value={km}>Within {km} km</option>)}</select></label>}
      </div></DialogSheet>}
      {position && <Button variant="ghost" onClick={() => { setPosition(undefined); change('radius', ''); }}>Clear location</Button>}
      {[country, region, days, kind, weekly, radius, query].some(Boolean) && <Button variant="ghost" onClick={() => { requestedParams.current = new URLSearchParams(); startTransition(() => setParams({})); setLimit(30); setSelected(undefined); }}>Clear filters</Button>}
      <p className="mb-3 text-sm text-ctp-subtext1">Location stays in this page. Search also works without location access.</p>
      {position && <section aria-labelledby="nearby-events" className="my-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
        <h2 id="nearby-events" className="text-xl font-semibold">Expected weekly dates nearby</h2>
        <p className="mt-1 text-sm text-ctp-subtext1">Within {radius || 50} km · Nearest venues first · Matching your filters</p>
        {nearbyEvents.length ? <>
          <p className="mt-2 text-sm text-ctp-subtext1">Expected dates, in your time zone. Confirm with the store.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">{nearbyEvents.map(({store, distance, event}) => <li key={store.id} className="min-w-0 rounded-lg bg-ctp-base p-3">
            <p className="font-medium">{new Date(event.date).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})} · Expected</p>
            <Link className={`${link} break-words`} to={`/stores/${store.id}${search}`} onClick={() => { sessionStorage.setItem("storeBrowseScroll", String(window.scrollY)); sessionStorage.setItem("storeBrowseLimit", String(document.querySelectorAll("article").length)); }}>{store.name}</Link>
            <p className="text-sm text-ctp-subtext1">{distance.toFixed(1)} km away</p>
            <Directions store={store} />
          </li>)}</ul>
        </> : <p className="mt-3" role="status">No expected weekly events match nearby. Try a wider distance or clear your filters.</p>}
      </section>}
      {locationError && <p role="alert" className="mb-3">{locationError}</p>}
      {radius > 0 && !position && <p className="mb-3" role="status">Use my location to apply the distance filter.</p>}
      <p role="status" className="my-3">{pending ? "Updating… · " : ""}{rows.length} {rows.length === 1 ? "location" : "locations"} · {mapped.length} on map{position ? ' · Nearest first' : ''}</p>
      {!rows.length && <p className="my-4">No locations match. Try another place or clear the filters.</p>}
      <div className="lg:hidden"><Tabs tabs={[{key:'list',label:'List'},{key:'map',label:'Map'}]} active={view} onChange={v => change('view',v)} baseId="store-view" variant="pill" /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={view === 'map' ? 'hidden lg:block' : ''}><TabPanel baseId="store-view" tab="list" active={desktop ? "list" : view}><div className="space-y-3">{rows.slice(0,limit).map(({store,distance}) => <StoreCard key={store.id} store={store} distance={distance} selected={store.id===selected} search={search} onMap={() => { change('view', 'map'); selectStore(store.id); }} />)}</div>{rows.length>limit && <Button className="mt-4 w-full" onClick={() => setLimit(limit+30)}>Show more locations</Button>}{unmapped.length > 0 && <section className="mt-6"><h2 className="text-lg font-semibold">Other matching stores · distance unavailable</h2><p className="mb-3 text-sm">These locations may be outside your selected distance.</p><div className="space-y-3">{unmapped.map(({store}) => <StoreCard key={store.id} store={store} search={search} selected={false} />)}</div></section>}</TabPanel></div>
        <div className={view === 'list' ? 'hidden lg:block lg:sticky lg:top-24 lg:self-start' : 'lg:sticky lg:top-24 lg:self-start'}><TabPanel baseId="store-view" tab="map" active={desktop ? "map" : view}>{map}{selected && rows.find(r=>r.store.id===selected) && <div className="mt-3 lg:hidden"><StoreCard store={rows.find(r=>r.store.id===selected)!.store} distance={rows.find(r=>r.store.id===selected)!.distance} selected search={search} /></div>}</TabPanel></div>
      </div>
    </>)}
  </PageLayout>;
}
