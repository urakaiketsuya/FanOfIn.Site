import { useState } from "react";
import type { PublicDeckSummary } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { InlineState } from "../../components/ui/ContentState";
import type { ComparedDeck } from "./types";

export default function ImportByUser({ comparedKeys, onToggle }: { comparedKeys: Set<string>; onToggle: (deck: ComparedDeck) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<{ displayName: string; profileSlug: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [results, setResults] = useState<PublicDeckSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setStatus("loading");
    try { const response = await accountApi.discoverProfiles(query.trim()); setUsers(response.profiles); setSelectedUser(null); setResults([]); setStatus("ready"); }
    catch { setStatus("error"); }
  }

  async function selectUser(profileSlug: string) {
    setSelectedUser(profileSlug); setStatus("loading");
    try { const { profile } = await accountApi.publicProfile(profileSlug); setResults(profile.decks); setStatus("ready"); }
    catch { setStatus("error"); }
  }

  async function toggle(summary: PublicDeckSummary) {
    const key = `user-${summary.publicSlug}`;
    if (comparedKeys.has(key)) { onToggle({ key, label: summary.title, source: { kind: "custom", decklist: { main: [], material: [], sideboard: [] } }, format: summary.format }); return; }
    setLoadingSlug(summary.publicSlug);
    try { const { deck } = await accountApi.publicDeck(summary.publicSlug); onToggle({ key, label: `${deck.title} by ${deck.owner.displayName}`, source: { kind: "custom", decklist: deck.decklist }, format: deck.format }); }
    finally { setLoadingSlug(null); }
  }

  return <div data-component="ImportByUser">
    <p className="text-sm text-ctp-subtext1">Search community users by display name and add one of their public decks.</p>
    <form className="mt-3 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users…" aria-label="Search community users" className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm focus:border-ctp-blue focus:outline-none" /><button type="submit" disabled={!query.trim() || status === "loading"} className="rounded-md bg-ctp-blue px-3 py-1.5 text-sm font-medium text-ctp-base disabled:opacity-50">Search</button></form>
    {status === "loading" && <InlineState className="mt-3">Searching users…</InlineState>}
    {status === "error" && <InlineState tone="danger" className="mt-3">User search is unavailable.</InlineState>}
    {status === "ready" && !selectedUser && users.length === 0 && <InlineState className="mt-3">No signed-up users with public decks match that name.</InlineState>}
    {!selectedUser && users.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{users.map((user) => <button key={user.profileSlug} type="button" onClick={() => void selectUser(user.profileSlug)} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-text hover:border-ctp-blue">{user.displayName}</button>)}</div>}
    {selectedUser && <button type="button" onClick={() => { setSelectedUser(null); setResults([]); }} className="mt-3 text-xs text-ctp-blue hover:underline">← Choose another user</button>}
    {selectedUser && status === "ready" && results.length === 0 && <InlineState className="mt-3">This user has no public decks.</InlineState>}
    {results.length > 0 && <div className="mt-3 space-y-2">{results.map((deck) => { const key = `user-${deck.publicSlug}`; const added = comparedKeys.has(key); return <div key={deck.publicSlug} className="flex items-center gap-3 rounded-lg border border-ctp-surface1 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ctp-text">{deck.title}</p><p className="text-xs text-ctp-subtext0">by {deck.owner.displayName}{deck.championName ? ` · ${deck.championName}` : ""}</p></div><button type="button" disabled={loadingSlug === deck.publicSlug} onClick={() => void toggle(deck)} className={`shrink-0 rounded-md border px-2 py-1.5 text-xs ${added ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue"}`}>{loadingSlug === deck.publicSlug ? "Loading…" : added ? "− Remove" : "+ Compare"}</button></div>; })}</div>}
  </div>;
}
