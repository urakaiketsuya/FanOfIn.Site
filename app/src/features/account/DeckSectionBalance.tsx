const SECTIONS = [
  { key: "main", label: "Main", target: 60, color: "bg-ctp-blue" },
  { key: "material", label: "Material", target: 12, color: "bg-ctp-mauve" },
  { key: "sideboard", label: "Sideboard", target: 15, color: "bg-ctp-yellow" },
] as const;

export default function DeckSectionBalance({ counts, sideboardPoints, maybeboard = 0, compact = false }: { counts: { main: number; material: number; sideboard: number }; sideboardPoints?: number; maybeboard?: number; compact?: boolean }) {
  return <div data-component="DeckSectionBalance" className={compact ? "space-y-2" : "mt-4 grid gap-3 sm:grid-cols-3"}>
    {SECTIONS.map((section) => {
      const count = counts[section.key];
      const measured = section.key === "sideboard" ? sideboardPoints : count;
      const over = measured !== undefined && measured > section.target;
      const under = section.key === "main" && section.target !== null && count < section.target;
      const barWidth = measured === undefined ? 0 : Math.min(100, measured / section.target * 100);
      return <div key={section.key} className={compact ? "" : "rounded-lg bg-ctp-base p-3"}>
        <div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium text-ctp-subtext1">{section.label}</span><span className={`tabular-nums ${over ? section.key === "material" || section.key === "sideboard" ? "text-ctp-red" : "text-ctp-yellow" : under ? "text-ctp-yellow" : "text-ctp-text"}`}>{section.key === "sideboard" ? sideboardPoints === undefined ? `${count} cards` : `${sideboardPoints} / 15 pts` : `${count} / ${section.target}`}</span></div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full ${over ? section.key === "material" || section.key === "sideboard" ? "bg-ctp-red" : "bg-ctp-yellow" : section.color}`} style={{ width: `${barWidth}%` }} /></div>
        {!compact && <p className="mt-1.5 text-[11px] text-ctp-subtext0">{section.key === "sideboard" ? sideboardPoints === undefined ? "Card data is needed to calculate points" : `${count} card${count === 1 ? "" : "s"} · ${over ? `${sideboardPoints - 15} points over budget` : `${15 - sideboardPoints} points available`}` : over ? section.key === "main" ? `${count - section.target} above consistency target` : `${count - section.target} over supported limit` : under ? `${section.target - count} needed` : "At target"}</p>}
      </div>;
    })}
    {maybeboard > 0 && <p className="text-xs text-ctp-subtext0 sm:col-span-3">{maybeboard} card{maybeboard === 1 ? "" : "s"} held in the maybeboard</p>}
  </div>;
}
