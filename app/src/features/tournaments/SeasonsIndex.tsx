import { Link } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function SeasonsIndex() {
  useDocumentTitle("Seasons", "Grand Archive TCG card-legality seasons and their tournament history.");
  const index = useOmnidexIndex();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Seasons</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">Card-legality windows, each with its own set of ingested events.</p>

      {!index && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {index && index.seasons.length === 0 && <p className="mt-6 text-ctp-subtext1">No seasons found yet.</p>}

      <div className="mt-6 space-y-2">
        {index?.seasons
          .slice()
          .sort((a, b) => b.dateStart.localeCompare(a.dateStart))
          .map((season) => {
            const eventCount = index.events.filter((e) => e.seasonId === season.id).length;
            return (
              <Link
                key={season.id}
                to={`/seasons/${season.slug}`}
                className="flex items-center justify-between rounded-md border border-ctp-surface1 px-3 py-2 text-sm hover:border-ctp-blue"
              >
                <div>
                  <div className="text-ctp-text">{season.name}</div>
                  <div className="text-xs text-ctp-subtext0">
                    {new Date(season.dateStart).toLocaleDateString()} – {new Date(season.dateEnd).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs text-ctp-subtext1">{eventCount} events</div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
