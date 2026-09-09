const SECTIONS = [
  { key: "main", label: "Main", target: 60, color: "bg-ctp-blue" },
  { key: "material", label: "Material", target: 12, color: "bg-ctp-mauve" },
  { key: "sideboard", label: "Sideboard", target: null, color: "bg-ctp-yellow" },
] as const;

export default function DeckSectionBalance({ counts, maybeboard = 0, compact = false }: { counts: { main: number; material: number; sideboard: number }; maybeboard?: number; compact?: boolean }) {
  return <div data-component="DeckSectionBalance" className={compact ? "space-y-2" : "mt-4 grid gap-3 sm:grid-cols-3"}>
    {SECTIONS.map((section) => {
      const count = counts[section.key];
      const over = section.target !== null && count > section.target;
      const under = section.key === "main" && section.target !== null && count < section.target;
      const barWidth = section.target === null ? Math.min(100, count / Math.max(counts.main, counts.material, counts.sideboard, 1) * 100) : Math.min(100, count / section.target * 100);
      return <div key={section.key} className={compact ? "" : "rounded-lg bg-ctp-base p-3"}>
        <div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium text-ctp-subtext1">{section.label}</span><span className={`tabular-nums ${over ? section.key === "material" ? "text-ctp-red" : "text-ctp-yellow" : under ? "text-ctp-yellow" : "text-ctp-text"}`}>{count}{section.target === null ? " cards" : ` / ${section.target}`}</span></div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full ${over ? section.key === "material" ? "bg-ctp-red" : "bg-ctp-yellow" : section.color}`} style={{ width: `${barWidth}%` }} /></div>
        {!compact && <p className="mt-1.5 text-[11px] text-ctp-subtext0">{section.target === null ? "Legality is measured by points" : over ? section.key === "main" ? `${count - section.target} above consistency target` : `${count - section.target} over supported limit` : under ? `${section.target - count} needed` : "At target"}</p>}
      </div>;
    })}
    {maybeboard > 0 && <p className="text-xs text-ctp-subtext0 sm:col-span-3">{maybeboard} card{maybeboard === 1 ? "" : "s"} held in the maybeboard</p>}
  </div>;
}
