import DeckPreviewListActions from "../../components/DeckPreviewListActions";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CommunityDeckSearchEntry, CommunityDeckSource, DeckFormat, DeckLine } from "@gatcg/shared";
import DeckCardPreview from "../../components/DeckCardPreview";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import { useCardCatalog } from "../cards/useCardCatalog";
import type { Card } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
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
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
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
      <input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Search title, player, Champion, or card…" aria-label="Search community decklists" className="min-h-12 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 sm:col-span-2" />
      <select value={champion} onChange={(event) => { setChampion(event.target.value); resetPage(); }} aria-label="Community deck Champion" className="min-h-12 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="">All Champions</option>{champions.map((name) => <option key={name} value={name}>{displayChampion(name)}</option>)}</select>
      <select value={source} onChange={(event) => { setSource(event.target.value as CommunityDeckSource | ""); resetPage(); }} aria-label="Community deck source" className="min-h-12 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="">All sources</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>
    {!index && <InlineState className="mt-4">Loading locally sourced decklists…</InlineState>}
    {index && <p className="mt-3 text-xs text-ctp-subtext0">{filtered.length.toLocaleString()} matching {filtered.length === 1 ? "deck" : "decks"} from the local archive</p>}
    {index && filtered.length === 0 && <EmptyState className="mt-4" title="No matching community decks" description="Try another card or champion, or clear your filters to browse this format." action={<Button onClick={() => { setQuery(""); setChampion(""); setSource(""); resetPage(); }}>Clear filters</Button>} />}
    <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">{filtered.slice(0, visibleCount).map((deck) => <CommunityDeckRow key={`${deck.source}:${deck.id}`} deck={deck} format={format} cardNames={index?.cardNames ?? []} cardsByName={cardsByName} />)}</div>
    {visibleCount < filtered.length && <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-4">Load more</Button>}
  </div>;
}

function CommunityDeckRow({ deck, format, cardNames, cardsByName }: { deck: CommunityDeckSearchEntry; format: DeckFormat; cardNames: string[]; cardsByName: Map<string, Card> }) {
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
  const lines = (values: DeckLine[]) => values.map(line => ({ card: line.name, quantity: line.quantity }));
  const indexedNames = deck.cardIndexes.map(index => cardNames[index]).filter(Boolean);
  const materialNames = indexedNames.filter(name => cardsByName.get(name)?.types.some(type => type === "CHAMPION" || type === "REGALIA"));
  const decklist = detail ? { material: lines(detail.materialDeck), main: lines(detail.mainDeck), sideboard: lines(detail.sideDeck) } : null;
  return <DeckPreviewCard cardsByName={cardsByName} model={{
    id: `${deck.source}:${deck.id}`, title: deck.title || "Untitled deck",
    decklist,
    championName: deck.champion ? displayChampion(deck.champion) : null, format,
    source: { kind: "community", label: SOURCE_LABELS[deck.source] },
    metadata: deck.author || undefined, mainCount: detail ? undefined : deck.mainCount,
    preview: { label: `${materialNames.length ? "Featured material cards" : "Featured cards"} · quantities available in the full list`, lines: (materialNames.length ? materialNames : indexedNames).slice(0, 3).map(name => ({ name })) },
    actions: <>{decklist && <DeckPreviewListActions decklist={decklist} title={deck.title} format={format} />}<a href={deck.url} target="_blank" rel="noreferrer" className={`${deckPreviewActionClass} text-ctp-blue`}>Open source ↗</a></>,
  }} view={{ expanded, onToggle: () => setExpanded(value => !value), content: <div className="mt-2 border-t border-ctp-surface1 pt-3">{status === "loaded" && detail ? <div className="grid gap-3 text-xs text-ctp-subtext1 "><DeckSection title="Material" cardsByName={cardsByName} lines={detail.materialDeck} /><DeckSection title="Main deck" cardsByName={cardsByName} lines={detail.mainDeck} />{detail.sideDeck.length > 0 && <DeckSection title="Sideboard" cardsByName={cardsByName} lines={detail.sideDeck} />}</div> : status === "error" ? <InlineState tone="danger">The local decklist file is unavailable.<button type="button" onClick={() => setStatus("idle")} className={`${deckPreviewActionClass} text-ctp-blue`}>Retry</button></InlineState> : <InlineState>Loading decklist…</InlineState>}</div> }} />;
}

function DeckSection({ title, lines, cardsByName }: { title: string; lines: DeckLine[]; cardsByName: Map<string, Card> }) {
  return <div><p className="mb-1 font-semibold text-ctp-text">{title}</p><DeckCardPreview groupByElement={title === "Main deck"} lines={lines} cardsByName={cardsByName} /></div>;
}
