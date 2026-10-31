import { useState } from 'react';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import { countryFlag, eventLocation } from './eventLocations';

export interface EventChoice { key: string; name: string; id?: number; date?: string; season?: string; count: number }

export default function EventPicker({ events, selected, region, onRegion, onSelect, timeline }: {
  events: EventChoice[]; selected: string; region: string; onRegion: (region: string) => void;
  onSelect: (key: string) => void; timeline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const visible = events.filter(e => !region || eventLocation(e.name, e.id).region === region);
  const selectedChoice = events.find(e => e.key === selected);
  const recent = visible.slice(0, 3);
  if (selectedChoice && !recent.some(e => e.key === selected)) recent.splice(2, 1, selectedChoice);
  const found = visible.filter(e => `${e.name} ${eventLocation(e.name, e.id).city} ${e.date?.slice(0, 4) ?? ''} ${e.season ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const seasonLabel = (e: EventChoice) => e.season ? `${e.season} · ${e.date?.slice(0, 4) ?? ''}` : e.date?.slice(0, 4) || 'More events';
  const seasons = [...new Set(found.map(seasonLabel))];
  const regions = ['Americas', 'Europe', 'Asia-Pacific', ...(events.some(e => eventLocation(e.name, e.id).region === 'Other') ? ['Other'] : [])];
  function choose(key: string) { onSelect(key); setOpen(false); setSearch(''); }
  function card(e: EventChoice, compact = false) {
    const location = eventLocation(e.name, e.id);
    const active = selected === e.key;
    return <Button key={e.key} aria-pressed={active} onClick={() => choose(e.key)} className={`min-w-0 text-left ${active ? 'border-ctp-blue bg-ctp-blue/10 text-ctp-text ring-1 ring-ctp-blue' : 'bg-ctp-mantle'} ${compact ? '' : 'min-h-28'}`}>
      <span className="flex items-start justify-between gap-2"><span className="text-base font-semibold"><span aria-hidden="true">{countryFlag(location.country)} </span>{location.city}</span>{active && <span aria-hidden="true">✓</span>}</span>
      {e.name !== location.city && <span className="mt-1 block text-xs text-ctp-subtext1">{e.name}</span>}
      <span className="mt-2 block text-xs text-ctp-subtext0">{e.date && <>{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · </>}{e.count} {e.count === 1 ? 'match' : 'matches'}</span>
    </Button>;
  }
  const regionControls = <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Event regions">
      {['', ...regions].map(value => <Button key={value} size="sm" aria-pressed={region === value} className={region === value ? 'border-ctp-blue bg-ctp-blue/10 text-ctp-text' : ''} onClick={() => onRegion(value)}>{value || 'All'}{region === value && <span aria-hidden="true"> ✓</span>}</Button>)}
    </div>;
  return <section aria-label="Event selection" className="mb-6 space-y-3">
    {regionControls}

    <div className="flex items-center justify-between gap-2">
      <Button aria-pressed={!selected} onClick={() => choose('')}>{timeline ? 'Latest event' : 'All events'}{!selected && <span aria-hidden="true"> ✓</span>}</Button>
      <Button onClick={() => setOpen(true)}>Browse events</Button>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{recent.map((e, i) => <div key={e.key} className={`${(selectedChoice ? e.key !== selected : i > 0) ? 'hidden sm:grid' : 'grid'}`}>{card(e)}</div>)}</div>
    {!visible.length && <p className="text-sm text-ctp-subtext1">No events in this region.</p>}
    {open && <DialogSheet title="Browse events" onDismiss={() => { setOpen(false); setSearch(''); }}>
      <div className="mb-3">{regionControls}</div>
      <label className="block text-xs text-ctp-subtext1">Find an event<input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="City, event or season" className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>
      <p className="mt-3 text-xs text-ctp-subtext0">{region || 'All regions'} · {found.length} events</p>
      {seasons.map(year => <section key={year} className="mt-4"><h3 className="mb-2 text-sm font-semibold">{year}</h3><div className="grid gap-2">{found.filter(e => seasonLabel(e) === year).map(e => card(e, true))}</div></section>)}
      {!found.length && <p role="status" className="mt-4 text-sm">No events found.</p>}
    </DialogSheet>}
  </section>;
}
