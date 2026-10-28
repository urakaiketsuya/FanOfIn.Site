import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";

type Sighting = { player: number; eventId: number; eventDate: string; placement: number | null };
const linkClass = "inline-flex min-h-control items-center rounded px-1 text-ctp-blue underline decoration-ctp-blue/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ctp-blue";

export default function DeckSightingSummary({ sightings, playerName, eventNameById, avgWinRate }: {
  sightings: Sighting[]; playerName: (id: number) => string; eventNameById: Map<number, string>; avgWinRate: number;
}) {
  const [list, setList] = useState<"players" | "events" | null>(null);
  const [query, setQuery] = useState("");
  const players = [...new Set(sightings.map(s => s.player))].map(id => ({
    id, name: playerName(id), count: sightings.filter(s => s.player === id).length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const events = [...new Set(sightings.map(s => s.eventId))].map(id => {
    const entries = sightings.filter(s => s.eventId === id);
    const placements = entries.flatMap(s => s.placement === null ? [] : [s.placement]);
    return { id, name: eventNameById.get(id) ?? `Event #${id}`, date: entries[0].eventDate, best: placements.length ? Math.min(...placements) : null };
  }).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  const best = sightings.filter(s => s.placement !== null).sort((a, b) => a.placement! - b.placement! || b.eventDate.localeCompare(a.eventDate) || a.eventId - b.eventId || a.player - b.player)[0];
  const open = (value: "players" | "events") => { setQuery(""); setList(value); };
  const rows = (list === "players" ? players : events).filter(row => row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <span className="inline-flex flex-wrap items-center gap-x-1">
      {players.length === 1 ? <Link className={linkClass} to={`/players/${players[0].id}`} aria-label={`1 player: ${players[0].name}`}>1 player</Link> : players.length ? <Button variant="ghost" className="!px-1 !text-ctp-blue underline underline-offset-4" aria-haspopup="dialog" onClick={() => open("players")}>{players.length} players</Button> : <span>0 players</span>}
      <span aria-hidden="true">·</span>
      {events.length === 1 ? <Link className={linkClass} to={`/events/${events[0].id}`} aria-label={`1 event: ${events[0].name}`}>1 event</Link> : events.length ? <Button variant="ghost" className="!px-1 !text-ctp-blue underline underline-offset-4" aria-haspopup="dialog" onClick={() => open("events")}>{events.length} events</Button> : <span>0 events</span>}
      {best && <><span aria-hidden="true">·</span><Link className={linkClass} to={`/events/${best.eventId}?tab=decklists&player=${best.player}`} aria-label={`Best finish #${best.placement} at ${eventNameById.get(best.eventId) ?? `Event #${best.eventId}`}`}>Best finish #{best.placement}</Link></>}
      <span>· {(avgWinRate * 100).toFixed(0)}% avg win rate</span>
    </span>
    {list && <DialogSheet title={list === "players" ? `Players (${players.length})` : `Events (${events.length})`} onDismiss={() => setList(null)}>
      {(list === "players" ? players.length : events.length) > 8 && <label className="mb-3 block text-sm">Search {list}<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 min-h-control w-full rounded border border-ctp-surface1 bg-ctp-mantle px-3" /></label>}
      <ul className="divide-y divide-ctp-surface1">{rows.map(row => <li key={row.id}><Link onClick={() => setList(null)} to={`/${list}/${row.id}`} className="flex min-h-control flex-wrap items-center justify-between gap-2 rounded py-3 text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue"><span className="min-w-0 break-words underline underline-offset-4">{row.name}</span><span className="text-sm text-ctp-subtext1">{"count" in row ? `${row.count} appearance${row.count === 1 ? "" : "s"}` : `${row.date.slice(0, 10)}${row.best === null ? "" : ` · Best #${row.best}`}`}</span></Link></li>)}</ul>
      {rows.length === 0 && <p className="py-4 text-ctp-subtext1">No matching {list}.</p>}
    </DialogSheet>}
  </>;
}
