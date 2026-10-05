import type { HomepageData } from "@gatcg/shared";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import DeckPreviewCard from "../components/DeckPreviewCard";
import PublishedSourceStatus from "../components/PublishedSourceStatus";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { usePublishedData, usePublishedDataStatus } from "../lib/sync/usePublishedData";

const linkClass = "inline-flex min-h-12 items-center rounded-lg text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";

export default function HomeDiscovery() {
  const data = usePublishedData<HomepageData>("analysis-homepage", "/data/analysis/homepage.json");
  const status = usePublishedDataStatus("analysis-homepage", "/data/analysis/homepage.json");
  const recent = data?.decks ?? [];
  const families = data?.families ?? [];
  const cards = useCardsByNames([...families.flatMap(family => family.identityCards), ...recent.flatMap(deck => deck.material.map(line => line.card))]);
  return <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8 sm:py-10">
    <section aria-labelledby="home-decks-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="home-decks-heading" className="text-2xl font-bold">Fresh from the tables</h2>
        <Link to="/decks" className={linkClass}>All tournament decks →</Link>
      </div>
      <p className="mb-4 text-sm text-ctp-subtext1">Recent published results, across different champions.</p>
      <PublishedSourceStatus label="Homepage discovery" status={status} hasData={!!data} />
      {data && !recent.length && <p className="py-4 text-ctp-subtext1">No tournament decks are available yet.</p>}
      <div className="grid gap-4 md:grid-cols-3">{recent.map(sighting => <div key={sighting.id} className="min-w-0">
        <p className="mb-2 text-xs text-ctp-subtext0">{new Date(sighting.eventDate).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}</p>
        <DeckPreviewCard presentation="cover" cardsByName={cards} model={{ decklist: null, id: sighting.id, title: sighting.championName, championName: sighting.championName, archetypeLabel: sighting.archetype, materialPreview: sighting.material, source: { kind: "event", label: "Tournament" }, metadata: <p>{sighting.placement ? `#${sighting.placement} · ` : ""}{sighting.eventName}</p> }} view={{ to: sighting.to }} />
      </div>)}</div>
    </section>
    <section aria-labelledby="home-archetypes-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="home-archetypes-heading" className="text-2xl font-bold">Find your playstyle</h2>
        <Link to="/archetypes" className={linkClass}>Explore archetypes →</Link>
      </div>
      <p className="mb-4 text-sm text-ctp-subtext1">Explore established champion families and the cards that define them.</p>
      {data && !families.length && <p className="py-4 text-ctp-subtext1">No established families are available yet.</p>}
      <div className="grid gap-4 md:grid-cols-3">{families.map(family => <article key={family.id} className="min-w-0 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="grid grid-cols-3 gap-2">{family.identityCards.map(name => {
          const card = cards.get(name);
          return <div key={name} className="min-w-0">{card ? <Link to={`/cards/${card.slug}`} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs">{name}</span></Link> : <><CardArtTile card={undefined} name={name} /><span className="mt-2 block break-words text-xs">{name}</span></>}</div>;
        })}</div>
        <p className="mt-3 text-xs text-ctp-subtext0">Featured identity cards · {family.championName}</p>
        <h3 className="mt-2 text-lg font-semibold">{family.name}</h3>
        <Link to={`/champions/${encodeURIComponent(family.championName.replaceAll(" ", "-"))}?tab=builds`} className={linkClass}>Explore champion families →</Link>
      </article>)}</div>
    </section>
  </div>;
}
