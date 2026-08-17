import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexIndex } from "./data";
import EventRow from "./EventRow";

export default function SeasonDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const index = useOmnidexIndex();

  const season = index?.seasons.find((s) => s.slug === slug);
  const events = useMemo(() => {
    if (!index) return [];
    return index.events.filter((e) => e.seasonSlug === slug).sort((a, b) => b.date.localeCompare(a.date));
  }, [index, slug]);

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

      <div className="mt-6 space-y-2">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
