import DisclosureChevron from "../../../components/DisclosureChevron";
import { DeckFormatPicker } from "./DeckBuilderSetup";
import { Link } from "react-router-dom";

export type BuilderWorkbenchView = "build" | "tools" | "copy" | "log";

const PRIMARY_STAGES: { view: Extract<BuilderWorkbenchView, "build" | "copy">; label: string }[] = [
  { view: "build", label: "Deck" },
  { view: "copy", label: "Save & export" },
];

const SUPPORTING_TOOLS: { view: Extract<BuilderWorkbenchView, "tools" | "log">; label: string }[] = [
  { view: "tools", label: "Recommendation settings" },
  { view: "log", label: "Change history" },
];

export default function BuilderWorkbenchNav({
  activeView,
  onViewChange,
  changeLogCount,
  onOpenDisplay,
}: {
  activeView: BuilderWorkbenchView;
  onViewChange: (view: BuilderWorkbenchView) => void;
  changeLogCount: number;
  onOpenDisplay: () => void;
}) {
  return (
    <section data-component="BuilderWorkbenchNav" className="relative mt-3 flex items-start rounded-xl border border-ctp-surface1 bg-ctp-mantle">

      <nav aria-label="Deck workspace" className="grid min-w-0 flex-1 grid-cols-2">
        {PRIMARY_STAGES.map((stage) => {
          const active = activeView === stage.view;
          return (
            <button
              key={stage.view}
              id={`deck-builder-tab-${stage.view}`}
              type="button"
              onClick={() => onViewChange(stage.view)}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-3 py-3 text-left transition-colors ${active ? "border-ctp-blue bg-ctp-blue/5 text-ctp-blue" : "border-transparent text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}
            >
              <span className="block text-sm font-semibold">{stage.label}</span>
            </button>
          );
        })}
      </nav>

      <details className="group px-3" onClick={(event) => { const target = event.target as HTMLElement; if (target.closest("a") || target.closest("button")?.id.startsWith("deck-builder-tab-") || target.closest("button")?.textContent === "Card display") event.currentTarget.open = false; }}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center text-xs font-medium text-ctp-subtext1 hover:text-ctp-text">
          More <DisclosureChevron className="ml-1 group-open:rotate-180" />
        </summary>
        <div className="absolute inset-x-0 top-full z-30 mt-1 flex flex-wrap gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-xl" role="group" aria-label="Supporting deck tools">
          <div className="w-full"><p className="mb-1 text-xs text-ctp-subtext0">Deck format</p><DeckFormatPicker /></div>
          {SUPPORTING_TOOLS.map((tool) => {
            const active = tool.view === activeView;
            const suffix = tool.view === "log" ? ` (${changeLogCount})` : "";
            return <button key={tool.view} id={`deck-builder-tab-${tool.view}`} type="button" aria-pressed={active} onClick={() => onViewChange(tool.view)} className={`rounded-md border px-2.5 py-1.5 text-xs ${active ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"}`}>{tool.label}{suffix}</button>;
          })}
          <button type="button" onClick={onOpenDisplay} className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">Card display</button>
          <Link to="/deck-analysis" className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Analyze deck</Link>
          <Link to="/deck-review" className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Review suggestions</Link>
        </div>
      </details>
    </section>
  );
}
