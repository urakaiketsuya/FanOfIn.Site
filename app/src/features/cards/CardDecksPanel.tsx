import type { ArchetypeCluster, DeckHipsterScore, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { Link } from "react-router-dom";
import type { TopDecksListEntry } from "../../components/TopDecksList";
import TopDecksList from "../../components/TopDecksList";
import Section from "../../components/ui/Section";
import UniqueDeckRow from "../champions/UniqueDeckRow";
import { championKeyToDisplayName } from "../../lib/championSlug";

export default function CardDecksPanel({ cardName, archetypes, recentDecks, topDecks, uniqueDecks, communityDecks, playerName }: { cardName: string; archetypes: { cluster: ArchetypeCluster; prevalence: number }[]; recentDecks: TopDecksListEntry[]; topDecks: TopDecksListEntry[]; uniqueDecks: DeckHipsterScore[]; communityDecks: ShoutAtYourDecksDeckSummary[]; playerName: (id: number) => string }) {
  return <>
    {archetypes.length > 0 && <Section className="mt-4" heading="compact" title="Archetypes"><div className="mt-2 grid gap-2 sm:grid-cols-2">{archetypes.map(({ cluster, prevalence }) => <Link key={cluster.id} to={`/archetypes/${cluster.id}`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue"><span className="block text-sm font-semibold text-ctp-text">{cluster.name}</span><span className="mt-1 block text-xs text-ctp-subtext0">{(prevalence * 100).toFixed(0)}% of {cluster.playerCount} players · {(cluster.avgWinRate * 100).toFixed(0)}% win rate</span></Link>)}</div></Section>}
    {recentDecks.length > 0 && <Section className="mt-8" heading="compact" title="Recent decks"><div className="mt-2"><TopDecksList decks={recentDecks} playerName={playerName} /></div></Section>}
    {topDecks.length > 0 && <Section className="mt-8" heading="compact" title="Top decks"><div className="mt-2"><TopDecksList decks={topDecks} playerName={playerName} /></div></Section>}
    {uniqueDecks.length > 0 && <Section className="mt-8" heading="compact" title="Most unique decks"><div className="mt-2 space-y-2">{uniqueDecks.map((deck) => <UniqueDeckRow key={`${deck.eventId}:${deck.player}`} score={deck} playerName={playerName(deck.player)} />)}</div></Section>}
    {communityDecks.length > 0 && <Section className="mt-8" heading="compact" title="Community decks" description={<>Brews featuring {cardName}, separate from tournament results. Build your own on <a href="https://sleeved.gg" target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">Sleeved.gg</a>.</>}><ul className="mt-2 space-y-1 text-sm">{communityDecks.map((deck) => { const isShout = deck.url.includes("shoutatyourdecks.com"); const champion = deck.champion ? (isShout ? championKeyToDisplayName(deck.champion) : deck.champion) : ""; return <li key={deck.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">{isShout ? <span className="text-ctp-text">{deck.title || "(untitled)"}</span> : <a href={deck.url} target="_blank" rel="noreferrer" className="text-ctp-text hover:text-ctp-blue">{deck.title || "(untitled)"}</a>}{(deck.author || champion) && <span className="text-xs text-ctp-subtext0">{deck.author ? `by ${deck.author}` : ""}{deck.author && champion ? " — " : ""}{champion}</span>}</li>; })}</ul></Section>}
  </>;
}
