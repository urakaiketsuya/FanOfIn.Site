import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
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
  const championImages = useMemo(() => new Map(champions.map((name) => {
    const display = formatPantheonChampion(name);
    const card = catalog.find((candidate) => candidate.types.includes("CHAMPION") && candidate.name.toLowerCase().startsWith(`${display.toLowerCase()},`));
    return [display, card] as const;
  })), [catalog, champions]);
  const filtered = useMemo(() => decks.filter((deck) => (!champion || deck.champion === champion) && (!query || `${deck.champion ?? ""} ${(deck.cardNames ?? []).join(" ")} ${(deck.boonNames ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort === "main" ? (b.mainCount ?? 0) - (a.mainCount ?? 0) || formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion)) : formatPantheonChampion(a.champion).localeCompare(formatPantheonChampion(b.champion))), [decks, champion, query, sort]);
  return <div className="mt-5">
    <div className="rounded-lg border border-ctp-mauve/40 bg-ctp-mauve/10 p-3 text-sm text-ctp-subtext1">Locally stored Pantheon community lists, kept separate from tournament results.</div>
    <div className="mt-3 flex flex-wrap gap-2">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(30); }} placeholder="Search Champion, card, or Boon…" aria-label="Search Pantheon decks" className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0" />
      <select value={champion} onChange={(event) => { setChampion(event.target.value); setVisibleCount(30); }} aria-label="Pantheon Champion" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="">All Champions</option>{champions.map((name) => <option key={name} value={name}>{formatPantheonChampion(name)}</option>)}</select>
      <select value={sort} onChange={(event) => setSort(event.target.value as "champion" | "main")} aria-label="Sort Pantheon decks" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="champion">Champion A–Z</option><option value="main">Largest main deck</option></select>
    </div>
    <p className="mt-3 text-xs text-ctp-subtext0">Showing {filtered.length.toLocaleString()} of {decks.length.toLocaleString()} locally stored Pantheon decklists.</p>
    {!index && <InlineState className="mt-5 text-sm">Loading Pantheon decks…</InlineState>}
    {index && filtered.length === 0 && <InlineState className="mt-5 text-sm">No Pantheon decklists match these filters.</InlineState>}
    <div className="mt-3 space-y-2">{filtered.slice(0, visibleCount).map((deck) => <PantheonDeckRow key={deck.id} deck={deck} cardsByName={cardsByName} championCard={deck.champion ? championImages.get(formatPantheonChampion(deck.champion)) : undefined} />)}</div>
    {visibleCount < filtered.length && <Button variant="secondary" onClick={() => setVisibleCount((count) => count + 30)} className="mt-4">Load more</Button>}
  </div>;
}

function PantheonDeckRow({ deck, championCard, cardsByName }: { deck: ShoutAtYourDecksDeckSummary; championCard?: Card; cardsByName: Map<string, Card> }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ materialDeck: { name: string; quantity: number }[]; pantheonDeck?: { name: string; quantity: number }[]; mainDeck: { name: string; quantity: number }[] } | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  useEffect(() => { if (expanded && detailStatus === "idle") { setDetailStatus("loading"); void fetch(`/data/shoutatyourdecks/decks/${deck.id}.json`).then((response) => { if (!response.ok) throw new Error(`Deck request failed: ${response.status}`); return response.json(); }).then((value) => { setDetail(value); setDetailStatus("loaded"); }).catch(() => setDetailStatus("error")); } }, [expanded, detailStatus, deck.id]);
  const legacyBoons = detail?.materialDeck.filter((line) => cardsByName.get(line.name)?.types.includes("BOON")) ?? [];
  const boons = detail?.pantheonDeck ?? legacyBoons;
  const material = detail?.materialDeck.filter((line) => !legacyBoons.includes(line)) ?? [];
  const tokens = referencedPantheonTokens(detail ? [...detail.mainDeck, ...detail.materialDeck, ...(detail.pantheonDeck ?? [])] : [], cardsByName);
  return <article className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      {championCard?.editions[0] ? <CardImage image={championCard.editions[0].image} alt={deck.champion ?? "Champion"} className="h-14 w-10 shrink-0 rounded object-cover object-top" /> : <div className="h-14 w-10 shrink-0 rounded bg-ctp-surface0" />}
      <div className="min-w-0 flex-1"><Link to={`/pantheon/decks/${deck.id}`} className="font-medium text-ctp-text hover:text-ctp-blue">{formatPantheonChampion(deck.champion)}</Link><div className="mt-0.5 text-xs text-ctp-subtext0">{deck.mainCount !== null ? `${deck.mainCount} main` : ""}{deck.materialCount !== null ? ` · ${deck.materialCount} material` : ""}</div>{(deck.boonNames?.length ?? 0) > 0 && <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Boons">{deck.boonNames!.map((name) => <span key={name} className="rounded-full border border-ctp-mauve/40 bg-ctp-mauve/10 px-2 py-0.5 text-[10px] text-ctp-mauve">{name}</span>)}</div>}</div>
      <Link to={`/pantheon/decks/${deck.id}`} className="shrink-0 rounded-md border border-ctp-blue px-2 py-1.5 text-xs text-ctp-blue hover:bg-ctp-surface0">View stats →</Link>
      <Button variant="secondary" size="sm" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="shrink-0">{expanded ? "Hide" : "Decklist"}</Button>
    </div>
    {expanded && <div className="mt-2 grid gap-3 border-t border-ctp-surface0 pt-2 text-xs text-ctp-subtext1 sm:grid-cols-2">{detailStatus === "loaded" && detail ? <><div><p className="mb-1 font-semibold text-ctp-text">Boons</p>{boons.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}<p className="mb-1 mt-3 font-semibold text-ctp-text">Material</p>{material.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}{tokens.length > 0 && <><p className="mb-1 mt-3 font-semibold text-ctp-text">Tokens</p>{tokens.map((name) => <div key={name}>1× {name}</div>)}</>}</div><div><p className="mb-1 font-semibold text-ctp-text">Main deck</p>{detail.mainDeck.map((line) => <div key={line.name}>{line.quantity}× {line.name}</div>)}</div></> : detailStatus === "error" ? <div><InlineState tone="danger">Decklist unavailable.</InlineState><button type="button" onClick={() => setDetailStatus("idle")} className="mt-2 text-ctp-blue hover:underline">Retry</button></div> : <InlineState>Loading decklist…</InlineState>}</div>}
  </article>;
}
