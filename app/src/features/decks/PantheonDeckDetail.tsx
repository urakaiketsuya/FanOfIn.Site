import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Tabs from "../../components/ui/Tabs";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { computeDeckIdentity } from "../../lib/deckIdentity";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useChampionCardImages } from "../players/useChampionCardImages";
import DecklistView from "../events/DecklistView";
import DeckCollectionTools from "../collection/DeckCollectionTools";

interface CardLine { name: string; quantity: number }
interface PantheonDeckRecord {
  id: string;
  champion: string | null;
  materialDeck: CardLine[];
  pantheonDeck?: CardLine[];
  mainDeck: CardLine[];
  sideDeck: CardLine[];
}

function displayName(name: string | null): string {
  return name ? name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown Champion";
}

function referencedTokens(lines: CardLine[], cardsByName: Map<string, Card>): CardLine[] {
  const cardsBySlug = new Map(Array.from(cardsByName.values()).map((card) => [card.slug, card]));
  const tokens = new Map<string, CardLine>();
  for (const line of lines) {
    const source = cardsByName.get(line.name);
    for (const reference of source?.references ?? []) {
      const target = cardsBySlug.get(reference.slug) ?? cardsByName.get(reference.name);
      if (target?.types.includes("TOKEN")) tokens.set(target.name, { name: target.name, quantity: 1 });
    }
  }
  return Array.from(tokens.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function DistributionBars({ title, entries }: { title: string; entries: [string, number][] }) {
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return <section className="rounded-lg border border-ctp-surface1 p-4"><h2 className="font-semibold text-ctp-text">{title}</h2><div className="mt-3 space-y-2">{entries.map(([label, count]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-ctp-subtext1">{label.toLowerCase()}</span><span className="tabular-nums text-ctp-text">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-blue" style={{ width: `${(count / max) * 100}%` }} /></div></div>)}</div></section>;
}

export default function PantheonDeckDetail() {
  const { id = "" } = useParams();
  const [deck, setDeck] = useState<PantheonDeckRecord | null | undefined>();
  const [tab, setTab] = useTabParam("tab", ["decklist", "composition", "synergy"] as const, "decklist");
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  useEffect(() => { void fetch(`/data/shoutatyourdecks/decks/${id}.json`).then((response) => response.ok ? response.json() : null).then(setDeck).catch(() => setDeck(null)); }, [id]);
  const championName = displayName(deck?.champion ?? null);
  const championImages = useChampionCardImages(deck?.champion ? [championName] : []);
  const championCard = championImages.get(championName);
  const legacyBoons = deck?.materialDeck.filter((line) => cardsByName.get(line.name)?.types.includes("BOON")) ?? [];
  const boonDataAvailable = Array.isArray(deck?.pantheonDeck);
  const boons = deck?.pantheonDeck ?? legacyBoons;
  const material = deck?.materialDeck.filter((line) => !legacyBoons.includes(line)) ?? [];
  useDocumentTitle(deck ? `${championName} Pantheon Deck` : "Pantheon Deck", "View a locally stored Pantheon decklist and its composition analytics.");

  if (deck === undefined) return <PageLayout width="standard" className="text-ctp-subtext1">Loading Pantheon deck…</PageLayout>;
  if (deck === null) return <PageLayout width="standard"><PageHeader title="Pantheon deck not found" /><Link to="/decks?view=pantheon" className="text-ctp-blue">← Browse Pantheon decks</Link></PageLayout>;

  const uniqueCards = new Set([...deck.mainDeck, ...deck.materialDeck, ...(deck.pantheonDeck ?? []), ...deck.sideDeck].map((line) => line.name)).size;
  const identity = computeDeckIdentity([...deck.mainDeck, ...deck.materialDeck], cardsByName);
  const elements = identity.elements;
  const classes = identity.classes;
  const tokens = referencedTokens([...deck.mainDeck, ...deck.materialDeck, ...(deck.pantheonDeck ?? []), ...deck.sideDeck], cardsByName);
  const decklist: OmnidexDecklist = {
    main: deck.mainDeck.map((line) => ({ card: line.name, quantity: line.quantity })),
    material: material.map((line) => ({ card: line.name, quantity: line.quantity })),
    sideboard: deck.sideDeck.map((line) => ({ card: line.name, quantity: line.quantity })),
  };
  const resolvedMainCount = deck.mainDeck.reduce((sum, line) => sum + (cardsByName.has(line.name) ? line.quantity : 0), 0);
  const totalMainCount = deck.mainDeck.reduce((sum, line) => sum + line.quantity, 0);
  const catalogCoverage = totalMainCount > 0 ? resolvedMainCount / totalMainCount : 0;
  const typeCounts = new Map<string, number>();
  const costCounts = new Map<number, number>();
  const elementCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  for (const line of deck.mainDeck) {
    const card = cardsByName.get(line.name);
    for (const type of card?.types ?? []) typeCounts.set(type, (typeCounts.get(type) ?? 0) + line.quantity);
    for (const element of card?.elements ?? []) elementCounts.set(element, (elementCounts.get(element) ?? 0) + line.quantity);
    for (const cardClass of card?.classes ?? []) classCounts.set(cardClass, (classCounts.get(cardClass) ?? 0) + line.quantity);
    const cost = card?.cost_memory ?? card?.cost_reserve;
    if (cost !== null && cost !== undefined) costCounts.set(cost, (costCounts.get(cost) ?? 0) + line.quantity);
  }
  const readiness = [
    { label: "Main deck size", detail: `${totalMainCount} cards`, state: totalMainCount >= 60 ? "ready" : "attention" },
    { label: "Singleton construction", detail: deck.mainDeck.every((line) => line.quantity === 1) ? "Every main-deck card is unique" : "Repeated main-deck cards found", state: deck.mainDeck.every((line) => line.quantity === 1) ? "ready" : "attention" },
    { label: "Material deck", detail: `${material.reduce((sum, line) => sum + line.quantity, 0)} cards`, state: material.reduce((sum, line) => sum + line.quantity, 0) === 12 ? "ready" : "attention" },
    { label: "Boon package", detail: boonDataAvailable ? `${boons.length} Boon${boons.length === 1 ? "" : "s"} stored` : "Boon data unavailable", state: boonDataAvailable && boons.length > 0 ? "ready" : boonDataAvailable ? "attention" : "unknown" },
    { label: "Referenced tokens", detail: tokens.length > 0 ? `${tokens.length} token${tokens.length === 1 ? "" : "s"} identified` : "No referenced tokens", state: "info" },
    { label: "Card-data coverage", detail: `${resolvedMainCount} of ${totalMainCount} main-deck cards resolved`, state: catalogCoverage >= 0.9 ? "ready" : "unknown" },
  ] as const;

  return <PageLayout>
    <Link to="/decks?view=pantheon" className="text-sm text-ctp-blue hover:underline">← Browse Decks</Link>
    <div className="mt-2 flex items-center gap-3">
      <CardHoverPreview image={championCard?.editions[0]?.image} alt={championName}>
        {championCard?.editions[0] ? <CardImage image={championCard.editions[0].image} alt={championName} className="h-20 w-14 shrink-0 rounded object-cover object-top" /> : <div className="h-20 w-14 shrink-0 rounded bg-ctp-surface0" />}
      </CardHoverPreview>
      <div><h1 className="text-2xl font-bold text-ctp-blue">{championName}</h1><p className="mt-1 text-sm text-ctp-subtext1">Pantheon · {totalMainCount} main · {material.reduce((sum, line) => sum + line.quantity, 0)} material · {boonDataAvailable ? `${boons.reduce((sum, line) => sum + line.quantity, 0)} boons` : "Boons unavailable"}{elements.length > 0 && ` · ${elements.join("/")}`}{classes.length > 0 && ` · ${classes.join("/")}`}</p></div>
    </div>
    <div className="mt-4"><Tabs tabs={[{ key: "decklist", label: "Decklist" }, { key: "composition", label: "Composition" }, { key: "synergy", label: "Readiness" }]} active={tab} onChange={setTab} label="Pantheon deck data" baseId="pantheon-deck" /></div>
    {tab === "decklist" && <div role="tabpanel" id="pantheon-deck-panel-decklist" aria-labelledby="pantheon-deck-tab-decklist"><div className="mt-6"><DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails defaultDisplayMode="compact" format="PANTHEON" extraSections={[{ title: "Boons", lines: boons.map((line) => ({ card: line.name, quantity: line.quantity })) }]} trailingSections={[{ title: "Tokens", lines: tokens.map((line) => ({ card: line.name, quantity: line.quantity })) }]} /><DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={`Pantheon deck: ${championName}`} /></div></div>}
    {tab === "composition" && <div role="tabpanel" id="pantheon-deck-panel-composition" aria-labelledby="pantheon-deck-tab-composition" className="mt-6 space-y-6"><section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Main", totalMainCount], ["Boons", boonDataAvailable ? boons.reduce((s, l) => s + l.quantity, 0) : "—"], ["Material", material.reduce((s, l) => s + l.quantity, 0)], ["Unique cards", uniqueCards]].map(([label, value]) => <div key={label} className="rounded-lg border border-ctp-surface1 p-3"><p className="text-xs text-ctp-subtext0">{label}</p><p className="mt-1 text-xl font-semibold text-ctp-text">{value}</p></div>)}</section>{catalogCoverage < 0.9 ? <div className="rounded-lg border border-ctp-yellow/40 bg-ctp-yellow/10 p-4 text-sm text-ctp-subtext1">Composition is waiting for card data: {resolvedMainCount} of {totalMainCount} main-deck cards resolved. Charts appear at 90% coverage.</div> : <div className="grid gap-4 sm:grid-cols-2"><DistributionBars title="Card types" entries={Array.from(typeCounts).sort((a, b) => b[1] - a[1])} /><DistributionBars title="Elements" entries={Array.from(elementCounts).sort((a, b) => b[1] - a[1])} /><DistributionBars title="Classes" entries={Array.from(classCounts).sort((a, b) => b[1] - a[1])} /><section className="rounded-lg border border-ctp-surface1 p-4"><h2 className="font-semibold text-ctp-text">Memory / reserve cost</h2><div className="mt-3 flex h-36 items-end gap-2">{Array.from(costCounts).sort((a, b) => a[0] - b[0]).map(([cost, count]) => <div key={cost} className="flex h-full flex-1 flex-col justify-end text-center"><span className="mb-1 text-[10px] tabular-nums text-ctp-subtext0">{count}</span><div className="w-full rounded-t bg-ctp-blue" style={{ height: `${Math.max(8, (count / Math.max(1, ...costCounts.values())) * 100)}%` }} /><span className="mt-1 block text-xs text-ctp-subtext0">{cost}</span></div>)}</div></section></div>}</div>}
    {tab === "synergy" && <div role="tabpanel" id="pantheon-deck-panel-synergy" aria-labelledby="pantheon-deck-tab-synergy" className="mt-6 space-y-4"><div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Pantheon readiness</h2><p className="mt-1 text-xs text-ctp-subtext0">Static construction checks based on the locally stored list. These describe whether the deck is complete and analyzable, not how it performs in matches.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{readiness.map((item) => <div key={item.label} className="rounded-md border border-ctp-surface0 bg-ctp-base/40 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-ctp-text">{item.label}</h3><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.state === "ready" ? "bg-ctp-green" : item.state === "attention" ? "bg-ctp-yellow" : item.state === "unknown" ? "bg-ctp-overlay1" : "bg-ctp-blue"}`} /></div><p className="mt-1 text-xs text-ctp-subtext1">{item.detail}</p></div>)}</div></div><div className="rounded-lg border border-ctp-surface0 p-4 text-sm text-ctp-subtext1">Tournament performance, matchup, and card-impact ratings remain unavailable because this community list is not attached to event results.</div></div>}
  </PageLayout>;
}
