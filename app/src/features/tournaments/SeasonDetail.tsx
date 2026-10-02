import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useSeasonMeta, type SeasonArchetypeRow, type SeasonChampionRow } from "./useSeasonMeta";
import EventRow from "./EventRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { championNameToSlug } from "../../lib/championSlug";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import CardArtTile from "../../components/CardArtTile";
import { useChampionCardImages } from "../players/useChampionCardImages";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import { PRODUCTS } from "../products/data";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

const PAGE_SIZE = 50;

function productSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type SeasonTab = "events" | "champions" | "builds";
type SeasonSurface = "events" | "meta";
const TAB_KEYS: SeasonTab[] = ["events", "champions", "builds"];
const SURFACES: { key: SeasonSurface; label: string }[] = [
  { key: "events", label: "Events" },
  { key: "meta", label: "Meta" },
];

function ChampionArtwork({ card, name }: { card: Card | undefined; name: string }) {
  const content = <><CardArtTile card={card} name={card?.name ?? name} /><span className="mt-1 block break-words text-xs leading-4 text-ctp-subtext1">{card?.name ?? name}</span></>;
  return <div className="w-20 shrink-0 sm:w-24">{card ? <Link to={`/cards/${card.slug}`} aria-label={card.name} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : content}</div>;
}

function ChampionCards({ rows }: { rows: SeasonChampionRow[] }) {
  const images = useChampionCardImages(rows.map((row) => row.championName));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Panel key={row.championName} as="article" className="identity-surface min-w-0">
          <div className="flex items-start gap-3">
            <ChampionArtwork card={images.get(row.championName)} name={row.championName} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ctp-subtext0">#{index + 1} by recorded decks</p>
              <h2 className="mt-1 break-words text-xl font-bold text-ctp-text">{row.championName}</h2>
              <p className="mt-3 text-3xl font-bold tabular-nums text-ctp-text">{(row.shareOfSeason * 100).toFixed(1)}%</p>
              <p className="text-sm text-ctp-subtext1">Weighted season share</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ctp-surface1 pt-3 text-sm">
            <div><dt className="text-ctp-subtext0">Recorded decks</dt><dd className="text-lg font-semibold tabular-nums">{row.deckCount.toLocaleString()}</dd></div>
            <div><dt className="text-ctp-subtext0">Average win rate</dt><dd className="text-lg font-semibold tabular-nums">{(row.avgWinRate * 100).toFixed(0)}%</dd></div>
          </dl>
          <Link to={`/champions/${championNameToSlug(row.championName)}/stats?tab=season`} className="mt-2 inline-flex min-h-control items-center rounded-lg text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore {row.championName} <span aria-hidden="true" className="ml-2">→</span></Link>
        </Panel>
      ))}
    </div>
  );
}

function BuildCards({ rows }: { rows: SeasonArchetypeRow[] }) {
  const images = useChampionCardImages(rows.map((row) => row.championName));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Panel key={row.clusterId} as="article" className="identity-surface min-w-0">
          <div className="flex items-start gap-3">
            <ChampionArtwork card={images.get(row.championName)} name={row.championName} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ctp-subtext0">#{index + 1} by recorded decks</p>
              <h2 className="mt-1 break-words text-xl font-bold text-ctp-text">{row.name}</h2>
              <p className="mt-1 break-words text-sm text-ctp-subtext1">{row.championName}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ctp-surface1 pt-3 text-sm">
            <div><dt className="text-ctp-subtext0">Recorded decks</dt><dd className="text-3xl font-bold tabular-nums">{row.deckCount.toLocaleString()}</dd></div>
            <div><dt className="text-ctp-subtext0">Average win rate</dt><dd className="text-lg font-semibold tabular-nums">{(row.avgWinRate * 100).toFixed(0)}%</dd></div>
          </dl>
          <Link to={`/archetypes/${row.clusterId}`} className="mt-2 inline-flex min-h-control items-center rounded-lg text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore build <span aria-hidden="true" className="ml-2">→</span></Link>
        </Panel>
      ))}
    </div>
  );
}

export default function SeasonDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const index = useOmnidexIndex();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tab, setTab] = useTabParam<SeasonTab>("tab", TAB_KEYS, "events");
  const surface: SeasonSurface = tab === "events" ? "events" : "meta";
  const metaTab: "champions" | "builds" = tab === "builds" ? "builds" : "champions";

  const season = index?.seasons.find((item) => item.slug === slug);
  const seasonMeta = useSeasonMeta(season?.id ?? null);
  useDocumentTitle(season?.name, season && `Grand Archive TCG tournament history for the ${season.name} card-legality season.`);
  const events = useMemo(() => {
    if (!index) return [];
    return index.events.filter((event) => event.seasonSlug === slug).sort((a, b) => b.date.localeCompare(a.date));
  }, [index, slug]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [slug]);

  const seasonProduct = useMemo(() => {
    if (!season) return undefined;
    const exactMatch = PRODUCTS.find((product) => product.banner && productSlug(product.name) === slug);
    if (exactMatch) return exactMatch;
    return [...PRODUCTS]
      .filter((product) => product.banner && product.releaseDate <= season.dateEnd)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0];
  }, [season, slug]);

  if (index && !season) {
    return (
      <PageLayout data-component="SeasonDetail">
        <EmptyState
          title="Season not found"
          description={`Season "${slug}" is not in the ingested data.`}
          action={<Link to="/seasons" className="inline-flex min-h-control items-center rounded-lg text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">&larr; All seasons</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="SeasonDetail">
      {!index && <InlineState>Loading…</InlineState>}

      {season && (
        <>
          <header className="identity-surface mb-5 rounded-xl border border-ctp-surface1 p-4 sm:p-6">
            <Link to="/seasons" className="inline-flex min-h-control items-center rounded-lg text-sm font-medium text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">&larr; All seasons</Link>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0 flex-1 basis-60">
                <p className="text-sm font-medium text-ctp-subtext0">Tournament season</p>
                <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-ctp-text sm:text-4xl">{season.name}</h1>
                <p className="mt-3 text-sm leading-6 text-ctp-subtext1">{new Date(season.dateStart).toLocaleDateString()} to {new Date(season.dateEnd).toLocaleDateString()}</p>
              </div>
              <div>
                <div className="text-4xl font-bold tabular-nums text-ctp-text">{events.length}</div>
                <div className="mt-1 text-sm text-ctp-subtext0">{events.length === 1 ? "recorded event" : "recorded events"}</div>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ctp-subtext1">Browse results and decklists, or explore the champions and builds in this season’s meta.</p>
          </header>

          {seasonProduct && (
            <Link
              to="/products"
              className="group relative mb-5 block h-40 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue sm:h-48"
            >
              <img src={seasonProduct.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ctp-crust via-ctp-crust/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-xs text-ctp-subtext1">{productSlug(seasonProduct.name) === slug ? "Season set" : "Latest set released by season end"}</div>
                <div className="font-semibold text-ctp-text group-hover:text-ctp-blue">{seasonProduct.name}</div>
              </div>
            </Link>
          )}

          <Tabs
            tabs={SURFACES}
            active={surface}
            onChange={(next) => setTab(next === "events" ? "events" : "champions")}
            baseId="season-surface"
            label="Season view"
            variant="pill"
          />

          {surface === "events" && (
            <div role="tabpanel" id="season-surface-panel-events" aria-labelledby="season-surface-tab-events" className="mt-4">
              {events.length === 0 ? (
                <EmptyState title="No events yet" description="No ingested events are available for this season." />
              ) : (
                <>
                  <h2 className="mb-3 text-xl font-semibold text-ctp-text">Season events</h2>
                  <div className="space-y-2">
                    {events.slice(0, visibleCount).map((event) => <EventRow key={event.id} event={event} />)}
                  </div>
                  <LoadMore remaining={events.length - visibleCount} onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)} />
                </>
              )}
            </div>
          )}

          {surface === "meta" && (
            <div role="tabpanel" id="season-surface-panel-meta" aria-labelledby="season-surface-tab-meta" className="mt-4">
              <Tabs tabs={[{ key: "champions", label: "Champions" }, { key: "builds", label: "Builds" }]} active={metaTab} onChange={setTab} baseId="season-meta" label="Season meta" variant="pill" />
              <p className="my-4 text-sm leading-6 text-ctp-subtext1">{metaTab === "champions" ? "Champions ordered by recorded decks. Weighted season share measures each champion’s share of the season’s combined performance score." : "Up to 20 of the most recorded builds this season. Artwork represents the champion, not an exact decklist."} Average win rate summarizes recorded deck results.</p>
              <TabPanel baseId="season-meta" tab={metaTab} active={metaTab}>
                {seasonMeta.loading && <Panel><InlineState>Loading meta…</InlineState></Panel>}
                {!seasonMeta.loading && metaTab === "champions" && seasonMeta.champions.length === 0 && <EmptyState title="No Champion data yet" />}
                {!seasonMeta.loading && metaTab === "builds" && seasonMeta.archetypes.length === 0 && <EmptyState title="No build data yet" />}
                {metaTab === "champions" && seasonMeta.champions.length > 0 && <ChampionCards rows={seasonMeta.champions} />}
                {metaTab === "builds" && seasonMeta.archetypes.length > 0 && <BuildCards rows={seasonMeta.archetypes} />}
              </TabPanel>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
