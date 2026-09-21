import { Link } from "react-router-dom";
import type { ComponentProps } from "react";
import BarChart from "../../components/BarChart";
import TopDecksList from "../../components/TopDecksList";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import { shortHash } from "../../lib/hash";
import type { PopularDeck } from "../popular/useDeckPopularity";

export function DeckSightingHistory({ sightingsByMonth, instances, playerName }: { sightingsByMonth: { label: string; value: number }[]; instances: ComponentProps<typeof TopDecksList>["decks"]; playerName: ComponentProps<typeof TopDecksList>["playerName"] }) {
  return <>{sightingsByMonth.length > 1 && <Section className="mt-8" heading="compact" title="Popularity Over Time"><div className="mt-2"><BarChart title="Sightings per Month" bars={sightingsByMonth} /></div></Section>}{instances.length > 0 && <Section className="mt-8" heading="compact" title={`Played by (${instances.length})`}><div className="mt-2"><TopDecksList decks={instances} playerName={playerName} /></div></Section>}</>;
}

export function SimilarDecksSection({ decks }: { decks: { deck: PopularDeck; score: number }[] }) {
  return <Section className="mt-8" heading="compact" title="Similar Decks">{decks.length > 0 ? <div className="mt-2 space-y-1 text-sm">{decks.map(({ deck, score }) => <div key={deck.signature} className="text-ctp-subtext1"><Link to={`/decks/${shortHash(deck.signature)}`} className="text-ctp-blue hover:underline">{deck.championName ?? "Unknown champion"}</Link>{deck.elements.length > 0 && ` · ${deck.elements.join("/")}`}{deck.classes.length > 0 && ` · ${deck.classes.join("/")}`} <span className="text-ctp-subtext0">({(score * 100).toFixed(0)}% similar)</span></div>)}</div> : <InlineState className="mt-2 text-sm">No distinct similar decks found — every close match for this build turned out to be another copy of the exact same list, which doesn't count as "similar."</InlineState>}</Section>;
}
