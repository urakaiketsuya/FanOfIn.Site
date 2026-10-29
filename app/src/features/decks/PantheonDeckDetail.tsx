import DecklistActions from "../events/DecklistActions";
import MenuDetails from "../../components/ui/MenuDetails";
import DisclosureChevron from "../../components/DisclosureChevron";
import DeckStats from "../../components/DeckStats";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { useTabParam } from "../../lib/useTabParam";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "../cards/useCardCatalog";
import UserDeckHeader from "../account/UserDeckHeader";
import UserDecklistPanel from "../account/UserDecklistPanel";
import UserDeckStats from "../account/UserDeckStats";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { encodeCustomDecks } from "../../lib/compareShareLink";

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

/**
 * Same shared `UserDeckHeader`/`UserDecklistPanel`/`UserDeckStats` family `MyDeckDetail.tsx`/
 * `PublicDeckDetail.tsx` already use – a read-only community deck is structurally the same "no
 * owner, no `ownerDeckId`/`previousDecklist`" shape `PublicDeckDetail.tsx` already proves out, just
 * fed from a static Pantheon JSON file instead of the account backend. Boons (this record's own
 * `pantheonDeck` field, or legacy card-type-detected boons) are folded into `material` so they flow
 * through composition/analysis like any other Material card – an accepted simplification over the
 * old page's separate "Boons" decklist section. Tokens need no special handling: `DecklistView`
 * (called internally by `UserDecklistPanel`) already auto-computes referenced tokens and appends
 * them as a trailing section on its own.
 */
export default function PantheonDeckDetail() {
  const { id = "" } = useParams();
  const [tab, setTab] = useTabParam("tab", ["decklist", "stats", "performance"] as const, "decklist");
  const [deck, setDeck] = useState<PantheonDeckRecord | null | undefined>();
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  useEffect(() => { void fetch(`/data/shoutatyourdecks/decks/${id}.json`).then((response) => response.ok ? response.json() : null).then(setDeck).catch(() => setDeck(null)); }, [id]);
  const championName = displayName(deck?.champion ?? null);
  const title = `${championName} Pantheon Deck`;
  useDocumentTitle(deck ? title : "Pantheon Deck", "View a locally stored Pantheon decklist and its composition analytics.");

  const decklist: OmnidexDecklist = useMemo(() => {
    const legacyBoons = deck?.materialDeck.filter((line) => cardsByName.get(line.name)?.types.includes("BOON")) ?? [];
    const boons = deck?.pantheonDeck ?? legacyBoons;
    const material = deck?.materialDeck.filter((line) => !legacyBoons.includes(line)) ?? [];
    return {
      main: (deck?.mainDeck ?? []).map((line) => ({ card: line.name, quantity: line.quantity })),
      material: [...material, ...boons].map((line) => ({ card: line.name, quantity: line.quantity })),
      sideboard: (deck?.sideDeck ?? []).map((line) => ({ card: line.name, quantity: line.quantity })),
    };
  }, [deck, cardsByName]);

  if (deck === undefined) return <PageLayout data-component="PantheonDeckDetail"><InlineState className="mt-10">Loading Pantheon deck…</InlineState></PageLayout>;
  if (deck === null) return <PageLayout data-component="PantheonDeckDetail"><EmptyState title="Pantheon deck not found" action={<Link to="/pantheon/decks" className="text-ctp-blue hover:underline">← Browse Pantheon decks</Link>} /></PageLayout>;

  return <PageLayout data-component="PantheonDeckDetail">
    <Link to="/pantheon/decks" className="text-sm text-ctp-blue hover:underline">← Browse Pantheon decks</Link>
    <UserDeckHeader actions={<><Link to={`/goldfish?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format: "PANTHEON" }]))}`} className="inline-flex min-h-control items-center rounded-lg border border-ctp-surface1 px-3 text-sm">Playtest</Link><MenuDetails className="relative"><summary className="flex min-h-control cursor-pointer list-none items-center rounded-lg border border-ctp-surface1 px-3 text-sm">More <DisclosureChevron className="ml-1" /></summary><div className="absolute right-0 top-full z-30 mt-2 grid max-h-[60dvh] w-64 max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format: "PANTHEON" }]))}`} className="inline-flex min-h-control items-center px-3 text-sm">Compare deck</Link><DecklistActions showBuilderAction decklist={decklist} cardsByName={cardsByName} deckTitle={title} /></div></MenuDetails></>} decklist={decklist} title={title} championName={deck.champion ? championName : null} format="PANTHEON" eyebrow="Community Pantheon deck" />

    <div className="mt-6"><Tabs tabs={[{ key: "decklist", label: "Deck" }, { key: "stats", label: "Stats" }, { key: "performance", label: "Analysis" }]} active={tab} onChange={setTab} label="Pantheon deck details" baseId="pantheon-deck" wrap /></div>
    <TabPanel baseId="pantheon-deck" tab="decklist" active={tab} keepMounted><UserDecklistPanel showActions={false} showStats={false} decklist={decklist} format="PANTHEON" collectionSource={`Pantheon deck: ${championName}`} /></TabPanel>
    <TabPanel baseId="pantheon-deck" tab="stats" active={tab}><DeckStats decklist={decklist} cardsByName={cardsByName} format="PANTHEON" championName={championName} /></TabPanel>
    <TabPanel baseId="pantheon-deck" tab="performance" active={tab} keepMounted><UserDeckStats decklist={decklist} championName={deck.champion ? championName : null} format="PANTHEON" title={title} /></TabPanel>
  </PageLayout>;
}
