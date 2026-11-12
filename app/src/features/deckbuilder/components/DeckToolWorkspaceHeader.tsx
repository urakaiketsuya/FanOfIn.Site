import DeckToolNav, { type DeckTool } from "./DeckToolNav";
import type { DeckFormat } from "@gatcg/shared";
import type { ReactNode } from "react";

export default function DeckToolWorkspaceHeader({ activeTool, title, championName, spiritName, format, mainTotal, materialTotal, sideboardTotal, sourceLabel, actions, embedded = false, showToolNav = true }: {
  activeTool: DeckTool;
  title?: string | null;
  championName: string | null;
  spiritName: string | null;
  format: DeckFormat;
  mainTotal: number;
  materialTotal: number;
  sideboardTotal: number;
  sourceLabel?: string | null;
  actions?: ReactNode;
  embedded?: boolean;
  showToolNav?: boolean;
}) {
  return <section data-component="DeckToolWorkspaceHeader" className={embedded ? "" : "mt-5 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle"} aria-label="Active deck workspace">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ctp-surface1 bg-ctp-base px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ctp-text">{title || (championName ? `${championName} deck` : "Untitled deck")}</p>
        <p className="mt-0.5 truncate text-xs text-ctp-subtext0">{championName ?? "Champion not detected"} · {spiritName ?? "Spirit not detected"} · {format === "PANTHEON" ? "Pantheon" : "Standard"}</p>
        {sourceLabel && <p className="mt-1 text-[10px] uppercase tracking-wide text-ctp-subtext0">Source: {sourceLabel}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">{mainTotal} main</span>
        <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">{materialTotal} material</span>
        {sideboardTotal > 0 && <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">{sideboardTotal} sideboard</span>}
        {actions}
      </div>
    </div>
    {showToolNav && <DeckToolNav activeTool={activeTool} />}
  </section>;
}
