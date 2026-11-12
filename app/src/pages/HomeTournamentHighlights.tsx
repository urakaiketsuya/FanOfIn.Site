import type { HomepageData } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import DeckPreviewCard from "../components/DeckPreviewCard";
import PublishedSourceStatus from "../components/PublishedSourceStatus";
import { useChampionCardImages } from "../features/players/useChampionCardImages";
import { usePublishedData, usePublishedDataStatus } from "../lib/sync/usePublishedData";

export function HomeFeaturedDeck() {
  const data = usePublishedData<HomepageData>("analysis-homepage", "/data/analysis/homepage.json");
  const status = usePublishedDataStatus("analysis-homepage", "/data/analysis/homepage.json");
  const deck = data?.decks[0];
  return <section aria-labelledby="featured-deck-heading" className="min-w-0">
    <h2 id="featured-deck-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-ctp-subtext1">Tournament spotlight</h2>
    <PublishedSourceStatus label="Tournament spotlight" status={status} hasData={!!data} />
    {deck ? <DeckPreviewCard presentation="cover" model={{ id: deck.id, title: deck.championName, archetypeLabel: deck.archetype, championName: deck.championName, decklist: null, materialPreview: deck.material, source: { kind: "event", label: "Tournament" }, metadata: <><p className="font-semibold text-ctp-text">{deck.placement ? `#${deck.placement} · ` : ""}{deck.eventName}</p><p>{new Date(deck.eventDate).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}</p></> }} view={{ to: deck.to }} /> : data && <p className="text-sm text-ctp-subtext1">Tournament decks are on the way.</p>}
  </section>;
}

export function HomeTournamentTrends({ data }: { data: HomepageData }) {
  const trends = data.risingChampions ?? [];
  const cards = useChampionCardImages(trends.map(trend => trend.championName));
  return <section aria-labelledby="home-trends-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="home-trends-heading" className="text-2xl font-bold">Moving up this season</h2><Link to="/champions" className="inline-flex min-h-12 items-center text-sm font-semibold text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Explore champion results →</Link></div>
    {!trends.length && <p className="mt-3 text-sm text-ctp-subtext1">No rising champion highlights in the current publication.</p>}
    <div className="mt-4 grid gap-4 md:grid-cols-2">{trends.map(trend => {
      const card = cards.get(trend.championName);
      return <article key={trend.championName} className="min-w-0 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4">
          <div>{card ? <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={card.name} /><span className="mt-1 block break-words text-xs">{card.name}</span></Link> : <CardArtTile card={undefined} name={trend.championName} />}</div>
          <div className="min-w-0"><p className="text-xs font-semibold text-ctp-green">{trend.trend === "new" ? "New to the season results" : "Rising"}</p><h3 className="mt-1 break-words text-xl font-bold">{trend.championName}</h3><p className="mt-2 text-2xl font-bold tabular-nums text-ctp-green">+{trend.deltaPct.toFixed(1)} <span className="text-sm font-normal">percentage points</span></p><p className="text-xs text-ctp-subtext1">Weighted result share</p></div>
        </div>
        <div className="mt-4 space-y-3">{[trend.previous, trend.current].map((season, index) => <div key={season.seasonId}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="break-words">{season.seasonName}</span><span className="shrink-0 tabular-nums">{(season.shareOfSeason * 100).toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full ${index ? "bg-ctp-green" : "bg-ctp-overlay1"}`} style={{ width: `${season.shareOfSeason * 100}%` }} /></div></div>)}</div>
        <p className="mt-3 text-xs text-ctp-subtext1">{trend.current.deckCount.toLocaleString()} published decks · {trend.current.eventCount.toLocaleString()} events this season</p>
        <Link to={`/champions/${encodeURIComponent(trend.championName.replaceAll(" ", "-"))}`} className="mt-2 inline-flex min-h-12 items-center font-semibold text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Explore {trend.championName} →</Link>
      </article>;
    })}</div>
  </section>;
}
