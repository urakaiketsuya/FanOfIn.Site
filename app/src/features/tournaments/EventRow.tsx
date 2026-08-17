import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexEventSummary } from "@gatcg/shared";

const HIGH_TIER = new Set(["worlds", "nationals", "ascent"]);

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
    <Link
      to={`/events/${event.id}`}
      className="flex items-center justify-between gap-4 rounded-md border border-ctp-surface1 px-3 py-2 text-sm hover:border-ctp-blue"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-ctp-text">{event.name}</span>
          <CategoryBadge category={event.category} />
        </div>
        <div className="text-xs text-ctp-subtext0">
          {event.hostName} · {new Date(event.date).toLocaleDateString()}
          {event.seasonName && ` · ${event.seasonName}`}
        </div>
      </div>
      <div className="shrink-0 text-xs text-ctp-subtext1">{event.playerCount} players</div>
    </Link>
  );
}
