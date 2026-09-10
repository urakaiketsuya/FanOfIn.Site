import type { BuilderWorkbenchView } from "./BuilderWorkbenchNav";

const HANDOFFS: Partial<Record<BuilderWorkbenchView, { eyebrow: string; title: string; description: string; action: string; destination: BuilderWorkbenchView }>> = {
  build: { eyebrow: "Next step", title: "Tune the suggested shell", description: "Review additions, cuts, and alternatives without losing your chosen cards.", action: "Tune this deck", destination: "review" },
  review: { eyebrow: "Next step", title: "Test your decisions", description: "Check the closest historical build and see where this list is weakest.", action: "Test this deck", destination: "test" },
  test: { eyebrow: "When you’re ready", title: "Finish the deck", description: "Run construction checks, save a version, and choose an export destination.", action: "Finish this deck", destination: "copy" },
  stats: { eyebrow: "Use these insights", title: "Return to tuning", description: "Turn composition and synergy findings into explicit card decisions.", action: "Tune this deck", destination: "review" },
  tools: { eyebrow: "Settings applied", title: "Return to the build", description: "See how the updated evidence source and constraints reshape the deck.", action: "View updated build", destination: "build" },
  buddies: { eyebrow: "Found a candidate?", title: "Return to the build", description: "Add buddy cards to the shared deck and keep shaping the shell.", action: "Back to build", destination: "build" },
  log: { eyebrow: "Continue working", title: "Return to tuning", description: "Review the next suggested change with this history preserved.", action: "Tune this deck", destination: "review" },
};

export default function BuilderStageHandoff({ view, onContinue }: { view: BuilderWorkbenchView; onContinue: (view: BuilderWorkbenchView) => void }) {
  const handoff = HANDOFFS[view];
  if (!handoff) return null;
  return (
    <aside data-component="BuilderStageHandoff" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ctp-blue/40 bg-ctp-blue/5 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-blue">{handoff.eyebrow}</p>
        <p className="mt-0.5 text-sm font-semibold text-ctp-text">{handoff.title}</p>
        <p className="mt-0.5 text-xs text-ctp-subtext1">{handoff.description}</p>
      </div>
      <button type="button" onClick={() => onContinue(handoff.destination)} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base hover:opacity-90">{handoff.action} →</button>
    </aside>
  );
}
