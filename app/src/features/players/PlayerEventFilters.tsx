import { EVENT_CATEGORY_LABELS } from "@gatcg/shared";

export default function PlayerEventFilters({ categories, champions, seasons, category, champion, seasonId, onCategoryChange, onChampionChange, onSeasonChange }: {
  categories: string[];
  champions: string[];
  seasons: [number, string][];
  category: string | null;
  champion: string | null;
  seasonId: number | null;
  onCategoryChange: (value: string | null) => void;
  onChampionChange: (value: string | null) => void;
  onSeasonChange: (value: number | null) => void;
}) {
  if (categories.length <= 1 && champions.length <= 1 && seasons.length <= 1) return null;
  return <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
    {categories.length > 1 && <label className="flex items-center gap-2 text-ctp-subtext0">Type:
      <select value={category ?? ""} aria-label="Type" onChange={(event) => onCategoryChange(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
        <option value="">All types</option>{categories.map((value) => <option key={value} value={value}>{EVENT_CATEGORY_LABELS[value] ?? value}</option>)}
      </select>
    </label>}
    {champions.length > 1 && <label className="flex items-center gap-2 text-ctp-subtext0">Champion:
      <select value={champion ?? ""} aria-label="Champion" onChange={(event) => onChampionChange(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
        <option value="">All champions</option>{champions.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>}
    {seasons.length > 1 && <label className="flex items-center gap-2 text-ctp-subtext0">Season:
      <select value={seasonId ?? ""} aria-label="Season" onChange={(event) => onSeasonChange(event.target.value ? Number(event.target.value) : null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
        <option value="">All seasons</option>{seasons.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>}
  </div>;
}
