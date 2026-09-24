import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CommunityDeckSearchEntry, CommunityDeckSource, DeckFormat, DeckLine } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import { championKeyToDisplayName } from "../../lib/championSlug";
import { useCommunityDeckSearchIndex } from "./data";

const PAGE_SIZE = 30;
const SOURCE_LABELS: Record<CommunityDeckSource, string> = {
  shoutatyourdecks: "ShoutAtYourDecks",
  sleeved: "Sleeved",
  tcgarchitect: "TCGArchitect",
};

function detailPath(deck: CommunityDeckSearchEntry): string {
  return `/data/${deck.source}/decks/${deck.id}.json`;
}

function displayChampion(value: string | null): string {
  return value ? championKeyToDisplayName(value) : "Unknown Champion";
}

export default function CommunityDeckSearch({ format }: { format: DeckFormat }) {
  const index = useCommunityDeckSearchIndex(format);
  const [query, setQuery] = useState("");
  const [champion, setChampion] = useState("");
  const [source, setSource] = useState<CommunityDeckSource | "">("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
  const champions = useMemo(() => Array.from(new Set((index?.decks ?? []).map((deck) => deck.champion).filter((value): value is string => Boolean(value)))).sort((a, b) => displayChampion(a).localeCompare(displayChampion(b))), [index]);
  const filtered = useMemo(() => (index?.decks ?? []).filter((deck) => {
    if (champion && deck.champion !== champion) return false;
    if (source && deck.source !== source) return false;
    if (!normalizedQuery) return true;
    const metadata = `${deck.title} ${deck.author} ${displayChampion(deck.champion)} ${SOURCE_LABELS[deck.source]}`.toLocaleLowerCase();
    return metadata.includes(normalizedQuery) || deck.cardIndexes.some((cardIndex) => index!.cardNames[cardIndex]?.toLocaleLowerCase().includes(normalizedQuery));
  }), [index, champion, source, normalizedQuery]);
  const resetPage = () => setVisibleCount(PAGE_SIZE);

  return <div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Search title, player, Champion, or card…" aria-label="Search community decklists" className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 sm:col-span-2" />
      <select value={champion} onChange={(event) => { setChampion(event.target.value); resetPage(); }} aria-label="Community deck Champion" className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="">All Champions</option>{champions.map((name) => <option key={name} value={name}>{displayChampion(name)}</option>)}</select>
      <select value={source} onChange={(event) => { setSource(event.target.value as CommunityDeckSource | ""); resetPage(); }} aria-label="Community deck source" className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="">All sources</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>
    {!index && <InlineState className="mt-4">Loading locally sourced decklists…</InlineState>}
    {index && <p className="mt-3 text-xs text-ctp-subtext0">{filtered.length.toLocaleString()} matching {filtered.length === 1 ? "deck" : "decks"} from the local archive</p>}
    {index && filtered.length === 0 && <InlineState className="mt-4">No locally sourced decklists match these filters.</InlineState>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{filtered.slice(0, visibleCount).map((deck) => <CommunityDeckRow key={`${deck.source}:${deck.id}`} deck={deck} />)}</div>
    {visibleCount < filtered.length && <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-4">Load more</Button>}
  </div>;
}

function CommunityDeckRow({ deck }: { deck: CommunityDeckSearchEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ materialDeck: DeckLine[]; mainDeck: DeckLine[]; sideDeck: DeckLine[] } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  useEffect(() => {
    if (!expanded || status !== "idle") return;
    setStatus("loading");
    void fetch(detailPath(deck)).then((response) => {
      if (!response.ok) throw new Error(`Deck request failed: ${response.status}`);
      return response.json();
    }).then((value) => { setDetail(value); setStatus("loaded"); }).catch(() => setStatus("error"));
  }, [deck, expanded, status]);
  return <article className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 text-sm">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={deck.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-ctp-text hover:text-ctp-blue">{deck.title || "Untitled deck"} ↗</a><div className="mt-1 text-xs text-ctp-subtext1">{displayChampion(deck.champion)}{deck.author ? ` · ${deck.author}` : ""}</div></div><span className="shrink-0 rounded-full bg-ctp-surface0 px-2 py-1 text-[11px] text-ctp-subtext0">{SOURCE_LABELS[deck.source]}</span></div>
    <div className="mt-2 text-xs text-ctp-subtext0">{deck.mainCount ?? "?"} main · {deck.materialCount ?? "?"} material</div>
    <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="mt-2 w-full text-ctp-blue">{expanded ? "Hide decklist" : "Preview decklist"}</Button>
    {expanded && <div className="mt-2 border-t border-ctp-surface1 pt-3">{status === "loaded" && detail ? <div className="grid gap-3 text-xs text-ctp-subtext1 sm:grid-cols-2"><DeckSection title="Material" lines={detail.materialDeck} /><DeckSection title="Main deck" lines={detail.mainDeck} />{detail.sideDeck.length > 0 && <DeckSection title="Sideboard" lines={detail.sideDeck} />}</div> : status === "error" ? <InlineState tone="danger">The local decklist file is unavailable.</InlineState> : <InlineState>Loading decklist…</InlineState>}</div>}
  </article>;
}

function DeckSection({ title, lines }: { title: string; lines: DeckLine[] }) {
  return <div><p className="mb-1 font-semibold text-ctp-text">{title}</p>{lines.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}</div>;
}
