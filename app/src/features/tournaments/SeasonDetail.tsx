import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useSeasonMeta } from "./useSeasonMeta";
import EventRow from "./EventRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";

const PAGE_SIZE = 50;

type SeasonTab = "events" | "champions" | "builds";
const TAB_KEYS: SeasonTab[] = ["events", "champions", "builds"];
const TAB_LABELS: Record<SeasonTab, string> = { events: "Events", champions: "Champions", builds: "Builds" };

export default function SeasonDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const index = useOmnidexIndex();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tab, setTab] = useTabParam<SeasonTab>("tab", TAB_KEYS, "events");

  const season = index?.seasons.find((s) => s.slug === slug);
  const seasonMeta = useSeasonMeta(season?.id ?? null);
  useDocumentTitle(season?.name, season && `Grand Archive TCG tournament history for the ${season.name} card-legality season.`);
  const events = useMemo(() => {
    if (!index) return [];
    return index.events.filter((e) => e.seasonSlug === slug).sort((a, b) => b.date.localeCompare(a.date));
  }, [index, slug]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [slug]);

  const visibleEvents = events.slice(0, visibleCount);

  if (index && !season) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">Season "{slug}" not found in the ingested data.</p>
        <Link to="/seasons" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; All seasons
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/seasons" className="text-sm text-ctp-blue hover:underline">
        &larr; All seasons
      </Link>

      {!index && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {season && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{season.name}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            {new Date(season.dateStart).toLocaleDateString()} – {new Date(season.dateEnd).toLocaleDateString()} ·{" "}
            {events.length} ingested events
          </p>

          <div className="mt-4">
            <Tabs tabs={TAB_KEYS.map((key) => ({ key, label: TAB_LABELS[key] }))} active={tab} onChange={setTab} baseId="season" label="Season data" />
          </div>
        </>
      )}

      {season && tab === "events" && (
        <div role="tabpanel" id="season-panel-events" aria-labelledby="season-tab-events">
          {events.length === 0 ? (
            <p className="mt-4 text-ctp-subtext1">No ingested events for this season yet.</p>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {visibleEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>

              <LoadMore remaining={events.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
            </>
          )}
        </div>
      )}

      {season && tab === "champions" && (
        <div role="tabpanel" id="season-panel-champions" aria-labelledby="season-tab-champions" className="mt-4">
          {seasonMeta.loading && <p className="text-ctp-subtext1">Loading…</p>}
          {!seasonMeta.loading && seasonMeta.champions.length === 0 && (
            <p className="text-ctp-subtext1">No Champion data for this season yet.</p>
          )}
          {seasonMeta.champions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                    <th className="py-1 pr-3">Champion</th>
                    <th className="py-1 pr-3">Decks</th>
                    <th className="py-1 pr-3">Share</th>
                    <th className="py-1 pr-3">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctp-surface0">
                  {seasonMeta.champions.map((c) => (
                    <tr key={c.championName}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        <Link to={`/champions/${encodeURIComponent(c.championName)}?tab=season`} className="text-ctp-text hover:text-ctp-blue">
                          {c.championName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3 text-ctp-subtext1">{c.deckCount}</td>
                      <td className="py-1.5 pr-3 text-ctp-subtext1">{(c.shareOfSeason * 100).toFixed(1)}%</td>
                      <td className="py-1.5 pr-3 text-ctp-subtext1">{(c.avgWinRate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {season && tab === "builds" && (
        <div role="tabpanel" id="season-panel-builds" aria-labelledby="season-tab-builds" className="mt-4">
          {seasonMeta.loading && <p className="text-ctp-subtext1">Loading…</p>}
          {!seasonMeta.loading && seasonMeta.archetypes.length === 0 && (
            <p className="text-ctp-subtext1">No named builds for this season yet.</p>
          )}
          {seasonMeta.archetypes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                    <th className="py-1 pr-3">Build</th>
                    <th className="py-1 pr-3">Decks</th>
                    <th className="py-1 pr-3">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctp-surface0">
                  {seasonMeta.archetypes.map((a) => (
                    <tr key={a.clusterId}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        <Link to={`/archetypes/${a.clusterId}`} className="text-ctp-text hover:text-ctp-blue">
                          {a.name}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3 text-ctp-subtext1">{a.deckCount}</td>
                      <td className="py-1.5 pr-3 text-ctp-subtext1">{(a.avgWinRate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
