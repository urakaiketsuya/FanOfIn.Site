import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountUser, BookmarkedCombo, ComboGoal, ComboVisibility, DeckFormat, PublicCombo, SavedCombo } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";
import { accountApi } from "../../lib/accountApi";
import type { ComboRecipeRequirement } from "../deckbuilder/HypergeometricCalculator";

type View = "new" | "mine" | "saved" | "browse";
type LocalCombo = { id: string; name: string; requirements: ComboRecipeRequirement[]; damage: number; goal?: ComboGoal; targetTurn?: number | null };

function summary(combo: SavedCombo | PublicCombo): string {
  return combo.definition.requirements.map((requirement) => requirement.kind === "cards" ? `${requirement.required}× ${requirement.cards.join(" or ")}` : `${requirement.required}× ${requirement.value}`).join(" + ");
}

function Card({ combo, mine, bookmarked, onLoad, onDelete, onEdit, onDuplicate, onVisibility, onBookmark }: { combo: SavedCombo | PublicCombo; mine?: boolean; bookmarked?: boolean; onLoad: () => void; onDelete?: () => void; onEdit?: () => void; onDuplicate?: () => void; onVisibility?: (value: ComboVisibility) => void; onBookmark?: () => void }) {
  const slug = combo.publicSlug;
  return <article className="rounded-lg border border-ctp-surface1 bg-ctp-base/30 p-3">
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold text-ctp-text">{combo.name}</h3><p className="mt-1 line-clamp-2 text-xs text-ctp-subtext1">{summary(combo)}</p></div>{combo.definition.damage > 0 && <span className="shrink-0 rounded bg-ctp-red/10 px-2 py-1 text-[10px] font-bold text-ctp-red">{combo.definition.damage} DAMAGE</span>}</div>
    {combo.description && <p className="mt-2 line-clamp-2 text-xs text-ctp-subtext0">{combo.description}</p>}
    <div className="mt-2 flex flex-wrap gap-1">{combo.tags.map((tag) => <span key={tag} className="rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] text-ctp-subtext1">{tag}</span>)}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={onLoad} className="rounded-md bg-ctp-blue px-2.5 py-1.5 text-xs font-semibold text-ctp-base">Test with deck</button>{slug && <button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/combos/${slug}`)} className="text-xs text-ctp-blue">Copy link</button>}{onBookmark && <button type="button" onClick={onBookmark} className="text-xs text-ctp-mauve">{bookmarked ? "Remove saved" : "Save combo"}</button>}{onEdit && <button type="button" onClick={onEdit} className="text-xs text-ctp-blue">Edit details</button>}{onDuplicate && <button type="button" onClick={onDuplicate} className="text-xs text-ctp-blue">Duplicate</button>}{mine && onVisibility && <select aria-label={`Visibility for ${combo.name}`} value={combo.visibility} onChange={(event) => onVisibility(event.target.value as ComboVisibility)} className="min-h-8 rounded border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select>}{onDelete && <button type="button" onClick={onDelete} className="ml-auto text-xs text-ctp-red">Delete</button>}</div>
  </article>;
}

export default function ComboLibrary({ localCombos, format = "UNKNOWN", championName = null, onMigrated, onLoad }: { localCombos: LocalCombo[]; format?: DeckFormat; championName?: string | null; onMigrated: () => void; onLoad: (combo: { name: string; requirements: ComboRecipeRequirement[]; damage: number }) => void }) {
  const [view, setView] = useState<View>("new");
  const [user, setUser] = useState<AccountUser | null | undefined>();
  const [mine, setMine] = useState<SavedCombo[]>([]);
  const [saved, setSaved] = useState<BookmarkedCombo[]>([]);
  const [browse, setBrowse] = useState<PublicCombo[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async (searchQuery: string) => {
    setState("loading");
    try {
      const session = await accountApi.session(); setUser(session.user);
      const [publicResult, ownedResult, savedResult] = await Promise.all([accountApi.discoverCombos(searchQuery), session.user ? accountApi.combos() : Promise.resolve({ combos: [] }), session.user ? accountApi.comboBookmarks() : Promise.resolve({ combos: [] })]);
      setBrowse(publicResult.combos); setMine(ownedResult.combos); setSaved(savedResult.combos); setState("idle");
    } catch { setState("error"); }
  }, []);

  useEffect(() => { void refresh(""); }, [refresh]);
  useEffect(() => {
    if (!user || localCombos.length === 0) return;
    let active = true;
    void Promise.all(localCombos.map((combo) => accountApi.saveCombo({ name: combo.name, format, championName, deduplicate: true, definition: { schemaVersion: 1, requirements: combo.requirements, damage: combo.damage, goal: combo.goal ?? (combo.damage > 0 ? "lethal" : "custom"), targetTurn: combo.targetTurn ?? null } }))).then(async () => {
      if (!active) return; onMigrated(); setMine((await accountApi.combos()).combos); setNotice(`${localCombos.length} browser combo${localCombos.length === 1 ? "" : "s"} moved to your account.`);
    }).catch(() => setNotice("Browser combos could not be moved to your account yet."));
    return () => { active = false; };
  }, [user, localCombos, format, championName, onMigrated]);

  const savedSlugs = useMemo(() => new Set(saved.map((combo) => combo.publicSlug)), [saved]);
  async function bookmark(combo: PublicCombo) { if (!user) { setNotice("Sign in from My Decks to save public combos."); return; } const next = !savedSlugs.has(combo.publicSlug); await accountApi.bookmarkCombo(combo.publicSlug, next); setSaved((await accountApi.comboBookmarks()).combos); }

  return <Panel className="mb-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ctp-text">Combo library</h2><p className="text-xs text-ctp-subtext0">Definitions are saved; probabilities are recalculated for the active deck.</p></div><div className="flex flex-wrap gap-1 rounded-lg bg-ctp-base p-1" role="tablist">{([['new','New Combo'],['mine','My Combos'],['saved','Saved Combos'],['browse','Browse']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === key ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>{label}</button>)}</div></div>
    {notice && <p className="mt-3 text-xs text-ctp-green">{notice}</p>}
    {view === "new" && <p className="mt-4 text-sm text-ctp-subtext1">Build the recipe below, then save it from Calculations. Signed-in saves follow you across devices; signed-out saves remain in this browser.</p>}
    {view !== "new" && state === "loading" && <InlineState className="mt-4">Loading combos…</InlineState>}
    {view !== "new" && state === "error" && <InlineState tone="danger" className="mt-4">Combos could not be loaded. <button type="button" onClick={() => void refresh(query)} className="text-ctp-blue">Try again</button></InlineState>}
    {view === "mine" && state === "idle" && !user && <InlineState className="mt-4">Sign in from <a href="/decks/edit" className="text-ctp-blue">My Decks</a> to sync and publish combos.</InlineState>}
    {view === "mine" && state === "idle" && user && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{mine.map((combo) => <Card key={combo.id} combo={combo} mine onLoad={() => onLoad({ name: combo.name, requirements: combo.definition.requirements, damage: combo.definition.damage })} onEdit={() => { const name = window.prompt("Combo name", combo.name); if (!name?.trim()) return; const description = window.prompt("Description", combo.description) ?? combo.description; const tagText = window.prompt("Tags, separated by commas", combo.tags.join(", ")) ?? combo.tags.join(", "); void accountApi.updateCombo(combo.id, { name, description, tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean) }).then(({ combo: next }) => setMine((current) => current.map((item) => item.id === next.id ? next : item))); }} onDuplicate={() => { void accountApi.saveCombo({ name: `Copy of ${combo.name}`, description: combo.description, tags: combo.tags, definition: combo.definition, format: combo.format, championName: combo.championName }).then(({ combo: copy }) => setMine((current) => [copy, ...current])); }} onVisibility={(visibility) => { void accountApi.updateCombo(combo.id, { visibility }).then(({ combo: next }) => setMine((current) => current.map((item) => item.id === next.id ? next : item))); }} onDelete={() => { void accountApi.deleteCombo(combo.id).then(() => setMine((current) => current.filter((item) => item.id !== combo.id))); }} />)}{mine.length === 0 && <InlineState>No combos saved yet.</InlineState>}</div>}
    {view === "saved" && state === "idle" && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{saved.map((combo) => <Card key={combo.publicSlug} combo={combo} bookmarked onLoad={() => onLoad({ name: combo.name, requirements: combo.definition.requirements, damage: combo.definition.damage })} onBookmark={() => void bookmark(combo)} />)}{saved.length === 0 && <InlineState>{user ? "No public combos saved yet." : "Sign in to keep public combos."}</InlineState>}</div>}
    {view === "browse" && <><form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void refresh(query); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cards, keywords, champions, or tags…" className="min-h-10 min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-sm"/><button className="rounded-md border border-ctp-blue px-3 text-sm text-ctp-blue">Search</button></form>{state === "idle" && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{browse.map((combo) => <Card key={combo.publicSlug} combo={combo} bookmarked={savedSlugs.has(combo.publicSlug)} onLoad={() => onLoad({ name: combo.name, requirements: combo.definition.requirements, damage: combo.definition.damage })} onBookmark={() => void bookmark(combo)} />)}{browse.length === 0 && <InlineState>No public combos match.</InlineState>}</div>}</>}
  </Panel>;
}
