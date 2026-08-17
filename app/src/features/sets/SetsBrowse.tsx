import { Link } from "react-router-dom";
import { gatcgApi } from "../../lib/api/client";
import { useFeaturedSets } from "./useFeaturedSets";

export default function SetsBrowse() {
  const featuredSets = useFeaturedSets();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Sets</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">Browse expansions and the cards printed in each one.</p>

      {!featuredSets && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {featuredSets && featuredSets.length === 0 && <p className="mt-6 text-ctp-subtext1">No sets found.</p>}

      <div className="mt-6 space-y-8">
        {(featuredSets ?? []).map((group) => (
          <div key={group.uuid}>
            <div className="flex items-center gap-3">
              <img src={gatcgApi.imageUrl(group.image)} alt={group.name} className="h-10 w-10 rounded object-contain" />
              <h2 className="text-lg font-semibold text-ctp-text">{group.name}</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.sets.map((set) => (
                <Link
                  key={set.id}
                  to={`/sets/${encodeURIComponent(set.prefix)}`}
                  className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
                >
                  {set.name}
                  <span className="ml-2 text-xs text-ctp-subtext0">{set.prefix}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
