import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { OmnidexDecklist } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { useCardCatalog } from "../cards/useCardCatalog";
import UserDeckHeader from "../account/UserDeckHeader";
import UserDecklistPanel from "../account/UserDecklistPanel";
import UserDeckStats from "../account/UserDeckStats";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

interface CardLine { name: string; quantity: number }
interface PantheonDeckRecord {
  id: string;
  champion: string | null;
  materialDeck: CardLine[];
  pantheonDeck?: CardLine[];
  mainDeck: CardLine[];
  sideDeck: CardLine[];
}

type PantheonDeckTab = "decklist" | "analysis";
const PANTHEON_TABS = [{ key: "decklist", label: "Decklist" }, { key: "analysis", label: "Analysis" }] satisfies { key: PantheonDeckTab; label: string }[];

function displayName(name: string | null): string {
  return name ? name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown Champion";
}

/**
 * Same shared `UserDeckHeader`/`UserDecklistPanel`/`UserDeckStats` family `MyDeckDetail.tsx`/
 * `PublicDeckDetail.tsx` already use — a read-only community deck is structurally the same "no
 * owner, no `ownerDeckId`/`previousDecklist`" shape `PublicDeckDetail.tsx` already proves out, just
 * fed from a static Pantheon JSON file instead of the account backend. Boons (this record's own
 * `pantheonDeck` field, or legacy card-type-detected boons) are folded into `material` so they flow
 * through composition/analysis like any other Material card — an accepted simplification over the
 * old page's separate "Boons" decklist section. Tokens need no special handling: `DecklistView`
 * (called internally by `UserDecklistPanel`) already auto-computes referenced tokens and appends
 * them as a trailing section on its own.
 */
export default function PantheonDeckDetail() {
  const { id = "" } = useParams();
  const [deck, setDeck] = useState<PantheonDeckRecord | null | undefined>();
  const [tab, setTab] = useTabParam<PantheonDeckTab>("tab", PANTHEON_TABS.map(({ key }) => key), "decklist");
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
  if (deck === null) return <PageLayout data-component="PantheonDeckDetail"><EmptyState title="Pantheon deck not found" action={<Link to="/decks?view=pantheon" className="text-ctp-blue hover:underline">← Browse Pantheon decks</Link>} /></PageLayout>;

  return <PageLayout data-component="PantheonDeckDetail">
    <Link to="/decks?view=pantheon" className="text-sm text-ctp-blue hover:underline">← Browse Decks</Link>
    <UserDeckHeader title={title} championName={deck.champion ? championName : null} format="PANTHEON" eyebrow="Community Pantheon deck" />
    <div className="mt-6"><Tabs tabs={PANTHEON_TABS} active={tab} onChange={setTab} label="Pantheon deck details" baseId="pantheon-deck" /></div>
    <TabPanel baseId="pantheon-deck" tab="decklist" active={tab}><UserDecklistPanel decklist={decklist} format="PANTHEON" collectionSource={`Pantheon deck: ${championName}`} /></TabPanel>
    <TabPanel baseId="pantheon-deck" tab="analysis" active={tab}><UserDeckStats decklist={decklist} championName={deck.champion ? championName : null} format="PANTHEON" title={title} /></TabPanel>
  </PageLayout>;
}
