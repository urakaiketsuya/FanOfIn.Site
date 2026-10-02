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
      <PageHeader title="Seasons" description="Explore tournament history by season, then discover the champions and builds players brought." />

      {!index && <InlineState className="mt-6">Loading…</InlineState>}
      {index && index.seasons.length === 0 && <EmptyState className="mt-6" title="No seasons found yet" />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {index?.seasons
          .slice()
          .sort((a, b) => b.dateStart.localeCompare(a.dateStart))
          .map((season) => {
            const eventCount = index.events.filter((e) => e.seasonId === season.id).length;
            return (
              <Link
                key={season.id}
                to={`/seasons/${season.slug}`}
                className="identity-surface group flex min-h-control min-w-0 flex-col rounded-xl border border-ctp-surface1 p-4 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue sm:p-5"
              >
                <div>
                  <h2 className="break-words text-xl font-bold tracking-tight text-ctp-text group-hover:text-ctp-blue">{season.name}</h2>
                  <div className="mt-2 text-sm text-ctp-subtext0">
                    {new Date(season.dateStart).toLocaleDateString()} to {new Date(season.dateEnd).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                  <div><span className="text-3xl font-bold tabular-nums text-ctp-text">{eventCount}</span>{" "}<span className="ml-2 text-sm text-ctp-subtext0">{eventCount === 1 ? "event" : "events"}</span></div>
                  <span className="text-sm font-semibold text-ctp-blue">Explore season <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            );
          })}
      </div>
    </PageLayout>
  );
}
