import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useSeasonMeta, type SeasonArchetypeRow, type SeasonChampionRow } from "./useSeasonMeta";
import EventRow from "./EventRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { championNameToSlug } from "../../lib/championSlug";
import Tabs from "../../components/ui/Tabs";
import Chip from "../../components/ui/Chip";
import Panel from "../../components/ui/Panel";
import PageHeader from "../../components/ui/PageHeader";
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

function ChampionCards({ rows }: { rows: SeasonChampionRow[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Link
          key={row.championName}
          to={`/champions/${championNameToSlug(row.championName)}/stats?tab=season`}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue"
        >
          <span className="w-6 shrink-0 text-center text-sm font-medium text-ctp-subtext0">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ctp-text group-hover:text-ctp-blue">{row.championName}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface0">
              <div className="h-full rounded-full bg-ctp-blue" style={{ width: `${Math.max(2, row.shareOfSeason * 100)}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium text-ctp-text">{(row.shareOfSeason * 100).toFixed(1)}%</div>
            <div className="text-xs text-ctp-subtext0">{row.deckCount} decks · {(row.avgWinRate * 100).toFixed(0)}% WR</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BuildCards({ rows }: { rows: SeasonArchetypeRow[] }) {
  const maxDecks = rows[0]?.deckCount ?? 1;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Link
          key={row.clusterId}
          to={`/archetypes/${row.clusterId}`}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue"
        >
          <span className="w-6 shrink-0 text-center text-sm font-medium text-ctp-subtext0">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ctp-text group-hover:text-ctp-blue">{row.name}</div>
            <div className="truncate text-xs text-ctp-subtext0">{row.championName}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ctp-surface0">
              <div className="h-full rounded-full bg-ctp-mauve" style={{ width: `${Math.max(2, (row.deckCount / maxDecks) * 100)}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium text-ctp-text">{row.deckCount} decks</div>
            <div className="text-xs text-ctp-subtext0">{(row.avgWinRate * 100).toFixed(0)}% WR</div>
          </div>
        </Link>
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
          action={<Link to="/seasons" className="text-ctp-blue hover:underline">&larr; All seasons</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="SeasonDetail">
      {!index && <InlineState>Loading…</InlineState>}

      {season && (
        <>
          <PageHeader
            title={season.name}
            eyebrow={<Link to="/seasons" className="hover:underline">&larr; Seasons</Link>}
            description={`${new Date(season.dateStart).toLocaleDateString()} – ${new Date(season.dateEnd).toLocaleDateString()}`}
            actions={(
              <div className="rounded-xl bg-ctp-surface0 px-4 py-2 text-center">
                <div className="text-lg font-semibold text-ctp-text">{events.length}</div>
                <div className="text-xs text-ctp-subtext0">events</div>
              </div>
            )}
          />

          {seasonProduct && (
            <Link
              to="/products"
              className="group relative mb-5 block h-40 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust sm:h-48"
            >
              <img src={seasonProduct.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-300 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ctp-crust via-ctp-crust/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-xs text-ctp-subtext1">Season set</div>
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
              <div className="mb-4 flex gap-2">
                <Chip active={metaTab === "champions"} onClick={() => setTab("champions")}>Champions</Chip>
                <Chip active={metaTab === "builds"} onClick={() => setTab("builds")}>Builds</Chip>
              </div>

              {seasonMeta.loading && <Panel><InlineState>Loading meta…</InlineState></Panel>}
              {!seasonMeta.loading && metaTab === "champions" && seasonMeta.champions.length === 0 && <EmptyState title="No Champion data yet" />}
              {!seasonMeta.loading && metaTab === "builds" && seasonMeta.archetypes.length === 0 && <EmptyState title="No build data yet" />}
              {metaTab === "champions" && seasonMeta.champions.length > 0 && <ChampionCards rows={seasonMeta.champions} />}
              {metaTab === "builds" && seasonMeta.archetypes.length > 0 && <BuildCards rows={seasonMeta.archetypes} />}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
