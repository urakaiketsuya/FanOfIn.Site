import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexEventSummary } from "@gatcg/shared";
import { formatCountry } from "../../lib/format";

const HIGH_TIER = new Set(["worlds", "nationals", "ascent"]);

/** One accent color per event tier, in the same tier order as EVENT_CATEGORY_ORDER — gives the list a scannable rhythm without needing to read the category badge text. */
const CATEGORY_BORDER: Record<string, string> = {
  worlds: "border-l-ctp-yellow",
  nationals: "border-l-ctp-red",
  ascent: "border-l-ctp-mauve",
  regionals: "border-l-ctp-sapphire",
  "store-championships": "border-l-ctp-green",
  regular: "border-l-ctp-surface1",
};

function CategoryBadge({ category }: { category: string }) {
  const label = EVENT_CATEGORY_LABELS[category] ?? category;
  const highTier = HIGH_TIER.has(category);
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 text-[10px] ${
        highTier ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext0"
      }`}
    >
      {label}
    </span>
  );
}

export default function EventRow({ event }: { event: OmnidexEventSummary }) {
  return (
    <article
      data-component="EventRow"
      className={`rounded-xl border border-l-4 border-ctp-surface1 p-3 text-sm transition-colors hover:border-t-ctp-blue hover:border-r-ctp-blue hover:border-b-ctp-blue ${
        CATEGORY_BORDER[event.category] ?? "border-l-ctp-surface1"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/events/${event.id}`} className="truncate font-medium text-ctp-text hover:text-ctp-blue">{event.name}</Link>
          <CategoryBadge category={event.category} />
        </div>
        <div className="text-xs text-ctp-subtext0">
          {event.hostName}
          {formatCountry(event.hostCountry) && ` (${formatCountry(event.hostCountry)})`} ·{" "}
          {new Date(event.date).toLocaleDateString()}
          {event.seasonName && ` · ${event.seasonName}`}
        </div>
      </div>
      <div className="shrink-0 rounded-full bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1">{event.playerCount} players</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-ctp-surface0 pt-2">
        <Link to={`/events/${event.id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-ctp-blue">Event details →</Link>
        {event.decklists && <Link to={`/events/${event.id}?tab=decklists`} className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue/10 px-3 text-xs font-medium text-ctp-blue">Browse deck lists</Link>}
        {!event.decklists && <span className="inline-flex min-h-11 items-center px-2 text-xs text-ctp-subtext0">No submitted deck lists</span>}
      </div>
    </article>
  );
}
