import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useSeasonMeta } from "./useSeasonMeta";
import EventRow from "./EventRow";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

const PAGE_SIZE = 50;

export default function SeasonDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const index = useOmnidexIndex();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
        </>
      )}

      {season && !seasonMeta.loading && (seasonMeta.champions.length > 0 || seasonMeta.archetypes.length > 0) && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {seasonMeta.champions.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Most-played Champions</h2>
              <div className="mt-2 overflow-x-auto">
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
            </div>
          )}

          {seasonMeta.archetypes.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Top named builds</h2>
              <div className="mt-2 overflow-x-auto">
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
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {visibleEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>

      <LoadMore remaining={events.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
    </div>
  );
}
