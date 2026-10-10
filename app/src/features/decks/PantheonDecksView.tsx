import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sortDeckCardsByElement, type Card, type ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import DeckPreviewCard, { deckPreviewActionClass } from "../../components/DeckPreviewCard";
import { findDeckChampionName } from "../../lib/ttsExport";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";
import { useCardCatalog } from "../cards/useCardCatalog";
import { usePantheonDeckIndex } from "../community/data";

function formatPantheonChampion(name: string | null | undefined): string {
  return name ? name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown Champion";
}

function referencedPantheonTokens(lines: { name: string }[], cardsByName: Map<string, Card>) {
  const cardsBySlug = new Map(Array.from(cardsByName.values()).map((card) => [card.slug, card]));
  const tokens = new Set<string>();
  for (const line of lines) for (const reference of cardsByName.get(line.name)?.references ?? []) {
    const target = cardsBySlug.get(reference.slug) ?? cardsByName.get(reference.name);
    if (target?.types.includes("TOKEN")) tokens.add(target.name);
  }
  return Array.from(tokens).sort();
}

export default function PantheonDecksView() {
  const index = usePantheonDeckIndex();
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const [query, setQuery] = useState("");
  const [champion, setChampion] = useState("");
  const [sort, setSort] = useState<"champion" | "main">("champion");
  const [visibleCount, setVisibleCount] = useState(30);
  const decks = useMemo(() => index?.decks ?? [], [index]);
  const champions = useMemo(() => Array.from(new Set(decks.map((deck) => deck.champion).filter((name): name is string => Boolean(name)))).sort(), [decks]);
  const filtered = useMemo(() => decks.filter((deck) => (!champion || deck.champion === champion) && (!query || `${deck.champion ?? ""} ${(deck.cardNames ?? []).join(" ")} ${(deck.boonNames ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort === "main" ? (b.mainCount ?? 0) - (a.mainCount ?? 0) || formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion)) : formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion))), [decks, champion, query, sort]);
  return <div className="mt-5">
    <div className="grid grid-cols-2 gap-2">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(30); }} placeholder="Search Champion, card, or Boon…" aria-label="Search Pantheon decks" className="col-span-2 min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-sm text-ctp-text placeholder:text-ctp-subtext0" />
      <select value={champion} onChange={(event) => { setChampion(event.target.value); setVisibleCount(30); }} aria-label="Pantheon Champion" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="">All Champions</option>{champions.map((name) => <option key={name} value={name}>{formatPantheonChampion(name)}</option>)}</select>
      <select value={sort} onChange={(event) => { setSort(event.target.value as "champion" | "main"); setVisibleCount(30); }} aria-label="Sort Pantheon decks" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"><option value="champion">Champion A–Z</option><option value="main">Largest main deck</option></select>
    </div>
    <p className="mt-3 text-xs text-ctp-subtext0">Showing {Math.min(visibleCount, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()} Pantheon decks</p>
    {!index && <InlineState className="mt-5 text-sm">Loading Pantheon decks…</InlineState>}
    {index && filtered.length === 0 && <InlineState className="mt-5 text-sm">No Pantheon decklists match these filters.</InlineState>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-start">{filtered.slice(0, visibleCount).map((deck) => <PantheonDeckRow key={deck.id} deck={deck} cardsByName={cardsByName} />)}</div>
    {visibleCount < filtered.length && <Button variant="secondary" onClick={() => setVisibleCount((count) => count + 30)} className="mt-4">Load more</Button>}
  </div>;
}

function PantheonDeckRow({ deck, cardsByName }: { deck: ShoutAtYourDecksDeckSummary; cardsByName: Map<string, Card> }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ materialDeck: { name: string; quantity: number }[]; pantheonDeck?: { name: string; quantity: number }[]; mainDeck: { name: string; quantity: number }[]; sideDeck?: { name: string; quantity: number }[] } | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  useEffect(() => { if (expanded && detailStatus === "idle") { setDetailStatus("loading"); void fetch(`/data/shoutatyourdecks/decks/${deck.id}.json`).then((response) => { if (!response.ok) throw new Error(`Deck request failed: ${response.status}`); return response.json(); }).then((value) => { setDetail(value); setDetailStatus("loaded"); }).catch(() => setDetailStatus("error")); } }, [expanded, detailStatus, deck.id]);
  const legacyBoons = detail?.materialDeck.filter((line) => cardsByName.get(line.name)?.types.includes("BOON")) ?? [];
  const boons = detail?.pantheonDeck ?? legacyBoons;
  const material = detail?.materialDeck.filter((line) => !legacyBoons.includes(line)) ?? [];
  const tokens = referencedPantheonTokens(detail ? [...detail.mainDeck, ...detail.materialDeck, ...(detail.pantheonDeck ?? [])] : [], cardsByName);
  const materialNames = (deck.cardNames ?? []).filter(name => cardsByName.get(name)?.types.some(type => type === "CHAMPION" || type === "REGALIA"));
  const championCard = cardsByName.get(findDeckChampionName(materialNames.map(card => ({ card, quantity: 1 })), cardsByName) ?? "");
  const boonNames = deck.boonNames?.length ? deck.boonNames : (deck.cardNames ?? []).filter(name => cardsByName.get(name)?.types.includes("BOON"));
  const lines = (values: { name: string; quantity: number }[]) => values.map(line => ({ card: line.name, quantity: line.quantity }));
  return <DeckPreviewCard cardsByName={cardsByName} championCard={championCard} model={{
    id: deck.id, title: deck.title || formatPantheonChampion(deck.champion), championName: championCard?.name ?? formatPantheonChampion(deck.champion), format: "PANTHEON",
    decklist: detail ? { material: lines(material), main: lines(detail.mainDeck), sideboard: lines(detail.sideDeck ?? []) } : null,
    mainCount: detail ? undefined : deck.mainCount, sideboardCount: detail ? undefined : deck.sideCount,
    preview: { section: "boons", label: "Boons", lines: detail ? boons : boonNames.map(name => ({ name })) },
    actions: <Link to={`/pantheon/decks/${deck.id}`} className={`${deckPreviewActionClass} text-ctp-blue`}>Open deck page</Link>,
  }} view={{ expanded, onToggle: () => setExpanded(value => !value), content: <div className="mt-2 grid gap-3 border-t border-ctp-surface0 pt-2 text-xs text-ctp-subtext1 sm:grid-cols-2">{detailStatus === "loaded" && detail ? <><div><p className="mb-1 font-semibold text-ctp-text">Boons</p>{boons.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}<p className="mb-1 mt-3 font-semibold text-ctp-text">Material</p>{material.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}{tokens.length > 0 && <><p className="mb-1 mt-3 font-semibold text-ctp-text">Tokens</p>{tokens.map((name) => <div key={name}>1× {name}</div>)}</>}</div><div><p className="mb-1 font-semibold text-ctp-text">Main deck</p>{sortDeckCardsByElement(detail.mainDeck, cardsByName).map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}</div></> : detailStatus === "error" ? <div><InlineState tone="danger">Decklist unavailable.</InlineState><button type="button" onClick={() => setDetailStatus("idle")} className={`${deckPreviewActionClass} text-ctp-blue`}>Retry</button></div> : <InlineState>Loading decklist…</InlineState>}</div> }} />;
}
