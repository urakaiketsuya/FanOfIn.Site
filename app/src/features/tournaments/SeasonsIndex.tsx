import { Link } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

export default function SeasonsIndex() {
  useDocumentTitle("Seasons", "Grand Archive TCG card-legality seasons and their tournament history.");
  const index = useOmnidexIndex();

  return (
    <PageLayout data-component="SeasonsIndex">
      <PageHeader title="Seasons" description="Card-legality windows, each with its own set of ingested events." />

      {!index && <InlineState className="mt-6">Loading…</InlineState>}
      {index && index.seasons.length === 0 && <EmptyState className="mt-6" title="No seasons found yet" />}

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
    </PageLayout>
  );
}
