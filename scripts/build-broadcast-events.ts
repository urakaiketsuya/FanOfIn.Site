import { readFile, writeFile } from 'node:fs/promises';
import { buildBroadcastEventMap, type BroadcastEventSource } from '../shared/src/broadcastEventMap.ts';
import type { BroadcastTimelines } from '../shared/src/broadcast-timeline-types.ts';
const data = new URL('../data/', import.meta.url);
const recaps: BroadcastTimelines = JSON.parse(await readFile(new URL('broadcast-timelines.json', data), 'utf8'));
const catalog = JSON.parse(await readFile(new URL("card-catalog.json", data), "utf8"));
const spirits = new Set<string>(catalog.cards.filter((card: { types: string[]; subtypes: string[] }) => card.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")).map((card: { name: string }) => card.name));
const ids = [...new Set(recaps.matches.flatMap(m => m.eventId ? [m.eventId] : []))];
const events = await Promise.all(ids.map(async id => {
  const source: BroadcastEventSource = JSON.parse(await readFile(new URL(`omnidex/events/${id}.json`, data), 'utf8'));
  return buildBroadcastEventMap(source, recaps.matches.filter(m => m.eventId === id), spirits);
}));
events.sort((a, b) => b.date.localeCompare(a.date));
// A production build must not dirty a verified checkout just to refresh a timestamp.
let previous: { generatedAt: string; events: typeof events } | undefined;
try {
  previous = JSON.parse(await readFile(new URL('broadcast-events.json', data), 'utf8'));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const generatedAt = previous && Number.isFinite(Date.parse(previous.generatedAt)) && JSON.stringify(previous.events) === JSON.stringify(events)
  ? previous.generatedAt
  : new Date().toISOString();
await writeFile(new URL('broadcast-events.json', data), JSON.stringify({ generatedAt, events }));
const manifest = JSON.parse(await readFile(new URL('manifest.json', data), 'utf8'));
manifest['broadcast-events'] = generatedAt;
await writeFile(new URL('manifest.json', data), JSON.stringify(manifest));
console.log(`${events.length} events; ${events.reduce((n,e)=>n+e.stages.reduce((a,s)=>a+s.matches.length,0),0)} pairings; ${events.reduce((n,e)=>n+e.recapIds.length-e.unlinkedRecapIds.length,0)} linked recaps`);
