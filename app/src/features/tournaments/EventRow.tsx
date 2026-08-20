import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, type OmnidexEventSummary } from "@gatcg/shared";

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
    <Link
      to={`/events/${event.id}`}
      className={`flex items-center justify-between gap-4 rounded-md border border-l-4 border-ctp-surface1 px-3 py-2 text-sm hover:border-t-ctp-blue hover:border-r-ctp-blue hover:border-b-ctp-blue ${
        CATEGORY_BORDER[event.category] ?? "border-l-ctp-surface1"
      }`}
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
