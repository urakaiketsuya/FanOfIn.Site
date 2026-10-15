import { useState } from "react";
import { Link } from "react-router-dom";
import { matchesArtistSearch, PROFILE_FAVORITES_LIMIT, profileArtistOptions, profileSetOptions, type ProfileFavorites as Favorites } from "@gatcg/shared";
import Button from "../../components/ui/Button";

const groups = [
  { key: "favoriteArtistIds", title: "Favorite artists", singular: "artist", options: profileArtistOptions.map(option => ({ ...option, href: `/artists/${encodeURIComponent(option.slug)}` })) },
  { key: "favoriteSetIds", title: "Favorite sets", singular: "set", options: profileSetOptions.map(option => ({ ...option, href: `/sets/${encodeURIComponent(option.id)}` })) },
] as const;

export function ProfileFavoritesDisplay({ value }: { value: Favorites }) {
  return <>{groups.map(group => {
    const selected = (value[group.key] ?? []).flatMap(id => group.options.filter(option => option.id === id));
    return selected.length > 0 && <section key={group.key} className="mt-6"><h2 className="text-xl font-semibold">{group.title}</h2><ul className="mt-3 flex flex-wrap gap-2">{selected.map(option => <li key={option.id} className="max-w-full"><Link className="flex min-h-control items-center break-words rounded-xl border border-ctp-surface1 px-4 py-2 text-ctp-blue hover:underline focus-visible:outline-2" to={option.href}>{option.name}</Link></li>)}</ul></section>;
  })}</>;
}

export function ProfileFavoritesEditor({ value, onChange }: { value: Favorites; onChange: (value: Favorites) => void }) {
  const [queries, setQueries] = useState({ favoriteArtistIds: "", favoriteSetIds: "" });
  return <>{groups.map(group => {
    const selected = value[group.key] ?? [];
    const query = queries[group.key];
    const matches = group.options.filter(option => !selected.includes(option.id) && ("credits" in option ? matchesArtistSearch(option, query) : `${option.name} ${option.id}`.toLowerCase().includes(query.trim().toLowerCase())));
    return <section key={group.key} className="mt-6">
      <h3 className="text-lg font-semibold">{group.title} <span className="text-sm font-normal">{selected.length}/{PROFILE_FAVORITES_LIMIT}</span></h3>
      <div className="mt-2 flex flex-wrap gap-2">{selected.map(id => <Button key={id} className="max-w-full whitespace-normal text-left" aria-label={`Remove ${group.options.find(option => option.id === id)?.name ?? id}`} onClick={() => onChange({ ...value, [group.key]: selected.filter(item => item !== id) })}>{group.options.find(option => option.id === id)?.name ?? id} · Remove</Button>)}</div>
      {!selected.length && <p className="mt-2 text-sm text-ctp-subtext1">No {group.singular}s selected.</p>}
      <label className="mt-3 block text-sm">Find {group.singular === "artist" ? "an artist" : "a set"}<input className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={query} onChange={event => setQueries({ ...queries, [group.key]: event.target.value })} /></label>
      <p role="status" className="mt-2 text-sm text-ctp-subtext1">{selected.length >= PROFILE_FAVORITES_LIMIT ? "Remove a favorite to choose another." : matches.length ? `Showing ${Math.min(matches.length, 12)} of ${matches.length}.` : "No matching choices."}</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{matches.slice(0, 12).map(option => <Button key={option.id} className="justify-start whitespace-normal text-left" disabled={selected.length >= PROFILE_FAVORITES_LIMIT} aria-label={`Add ${option.name}`} onClick={() => onChange({ ...value, [group.key]: [...selected, option.id] })}>{option.name}</Button>)}</div>
    </section>;
  })}</>;
}
