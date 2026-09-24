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
    <UserDeckHeader title={title} championName={deck.champion ? championName : null} format="PANTHEON" eyebrow="Community Pantheon deck" />
    <div className="mt-5"><Link to={`/compare?custom=${encodeURIComponent(encodeCustomDecks([{ label: title, decklist, format: "PANTHEON" }]))}`} className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base">Compare deck</Link></div>
    <UserDecklistPanel decklist={decklist} format="PANTHEON" collectionSource={`Pantheon deck: ${championName}`} />
    <details className="group mt-10 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-lg font-semibold [&::-webkit-details-marker]:hidden"><span>Performance and composition</span><span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary><UserDeckStats decklist={decklist} championName={deck.champion ? championName : null} format="PANTHEON" title={title} /></details>
  </PageLayout>;
}
