import { Link } from "react-router-dom";
import type { DeckFormat } from "@gatcg/shared";

export type BuilderWorkbenchView = "build" | "review" | "test" | "stats" | "tools" | "buddies" | "copy" | "log";

const PRIMARY_STAGES: { view: Exclude<BuilderWorkbenchView, "stats" | "tools" | "buddies" | "log">; label: string }[] = [
  { view: "build", label: "Build" },
  { view: "review", label: "Tune" },
  { view: "test", label: "Test" },
  { view: "copy", label: "Finish" },
];

const SUPPORTING_TOOLS: { view: Extract<BuilderWorkbenchView, "stats" | "tools" | "buddies" | "log">; label: string }[] = [
  { view: "stats", label: "Deck insights" },
  { view: "tools", label: "Build settings" },
  { view: "buddies", label: "Buddy cards" },
  { view: "log", label: "Change history" },
];

export default function BuilderWorkbenchNav({
  activeView,
  onViewChange,
  championName,
  spiritName,
  deckFormat,
  mainTotal,
  validationStatus,
  reviewItemCount,
  statsSignalCount,
  changeLogCount,
}: {
  activeView: BuilderWorkbenchView;
  onViewChange: (view: BuilderWorkbenchView) => void;
  championName: string;
  spiritName: string;
  deckFormat: DeckFormat;
  mainTotal: number;
  validationStatus: string;
  reviewItemCount: number;
  statsSignalCount: number;
  changeLogCount: number;
}) {
  const primaryActive = PRIMARY_STAGES.some((stage) => stage.view === activeView);
  const activeSupport = SUPPORTING_TOOLS.find((tool) => tool.view === activeView);
  const buildComplete = mainTotal > 0;
  const tuneComplete = buildComplete && reviewItemCount === 0;
  const finishComplete = validationStatus === "Legal";
  const stageComplete = (view: (typeof PRIMARY_STAGES)[number]["view"]) => {
    if (view === "build") return buildComplete;
    if (view === "review") return tuneComplete;
    if (view === "copy") return finishComplete;
    return false;
  };

  return (
    <section data-component="BuilderWorkbenchNav" className="mt-5 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ctp-surface1 bg-ctp-base px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ctp-text">{championName} deck</p>
          <p className="mt-0.5 truncate text-xs text-ctp-subtext0">{championName} · {spiritName} · {deckFormat === "PANTHEON" ? "Pantheon" : "Standard"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`rounded-full px-2 py-1 ${mainTotal >= 60 || deckFormat === "PANTHEON" && mainTotal > 0 ? "bg-ctp-green/10 text-ctp-green" : "bg-ctp-surface0 text-ctp-subtext1"}`}>{mainTotal} main</span>
          <span className={`rounded-full px-2 py-1 ${finishComplete ? "bg-ctp-green/10 text-ctp-green" : "bg-ctp-yellow/10 text-ctp-yellow"}`}>{validationStatus}</span>
          <span className="rounded-full bg-ctp-surface0 px-2 py-1 text-ctp-subtext1">Saved in this tab</span>
        </div>
      </div>

      <nav aria-label="Deck workflow" className="grid grid-cols-2 border-b border-ctp-surface1 sm:grid-cols-5">
        <Link to="/card-discovery" className="border-b-2 border-transparent px-3 py-3 text-left text-ctp-green hover:bg-ctp-surface0">
          <span className="block text-xs font-semibold">✓ Find</span>
          <span className="mt-0.5 block truncate text-[10px] text-ctp-subtext0">Idea chosen</span>
        </Link>
        {PRIMARY_STAGES.map((stage, index) => {
          const active = activeView === stage.view;
          const complete = stageComplete(stage.view);
          const summary = stage.view === "build"
            ? buildComplete ? `${mainTotal} main cards` : "Shape the deck"
            : stage.view === "review"
              ? reviewItemCount > 0 ? `${reviewItemCount} decisions left` : "Decisions complete"
              : stage.view === "test"
                ? "Check performance"
                : finishComplete ? "Ready to save" : validationStatus;
          return (
            <button
              key={stage.view}
              id={`deck-builder-tab-${stage.view}`}
              type="button"
              onClick={() => onViewChange(stage.view)}
              aria-current={active ? "step" : undefined}
              className={`border-b-2 px-3 py-3 text-left transition-colors ${active ? "border-ctp-blue bg-ctp-blue/5 text-ctp-blue" : complete ? "border-transparent text-ctp-green hover:bg-ctp-surface0" : "border-transparent text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}
            >
              <span className="block text-xs font-semibold">{complete ? "✓" : index + 2} {stage.label}</span>
              <span className="mt-0.5 block truncate text-[10px] text-ctp-subtext0">{summary}</span>
            </button>
          );
        })}
      </nav>

      <details className="group px-4 py-2" open={!primaryActive}>
        <summary className="cursor-pointer list-none text-xs font-medium text-ctp-subtext1 hover:text-ctp-text">
          {activeSupport ? `Supporting tool: ${activeSupport.label}` : "More tools for this deck"} <span aria-hidden="true" className="group-open:hidden">▾</span><span aria-hidden="true" className="hidden group-open:inline">▴</span>
        </summary>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Supporting deck tools">
          {SUPPORTING_TOOLS.map((tool) => {
            const active = tool.view === activeView;
            const suffix = tool.view === "stats" && statsSignalCount > 0 ? ` (${statsSignalCount})` : tool.view === "log" ? ` (${changeLogCount})` : "";
            return <button key={tool.view} id={`deck-builder-tab-${tool.view}`} type="button" aria-pressed={active} onClick={() => onViewChange(tool.view)} className={`rounded-md border px-2.5 py-1.5 text-xs ${active ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"}`}>{tool.label}{suffix}</button>;
          })}
        </div>
      </details>
    </section>
  );
}
