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
    <UserDeckHeader decklist={decklist} title={title} championName={deck.champion ? championName : null} format="PANTHEON" eyebrow="Community Pantheon deck" />
    <div className="mt-5"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format: "PANTHEON" }]))}`} className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Compare deck</Link></div>
    <div className="mt-6"><Tabs tabs={[{ key: "decklist", label: "Deck" }, { key: "stats", label: "Stats" }, { key: "performance", label: "Performance" }]} active={tab} onChange={setTab} label="Pantheon deck details" baseId="pantheon-deck" wrap /></div>
    <TabPanel baseId="pantheon-deck" tab="decklist" active={tab} keepMounted><UserDecklistPanel showStats={false} decklist={decklist} format="PANTHEON" collectionSource={`Pantheon deck: ${championName}`} /></TabPanel>
    <TabPanel baseId="pantheon-deck" tab="stats" active={tab}><DeckStats decklist={decklist} cardsByName={cardsByName} /></TabPanel>
    <TabPanel baseId="pantheon-deck" tab="performance" active={tab} keepMounted><UserDeckStats decklist={decklist} championName={deck.champion ? championName : null} format="PANTHEON" title={title} /></TabPanel>
  </PageLayout>;
}
