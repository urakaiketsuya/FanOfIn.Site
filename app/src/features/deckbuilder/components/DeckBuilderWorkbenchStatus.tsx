import { useDeckBuilder } from "../useDeckBuilder";
import BuilderWorkbenchNav from "./BuilderWorkbenchNav";

export function DeckBuilderWorkbenchStatus() {
  const { changeLog, isPending, setTab, tab, setCustomizeOpen } = useDeckBuilder();
  return <>
    {isPending && <p role="status" className="mt-1 text-sm text-ctp-subtext0">Updating deck…</p>}
    <BuilderWorkbenchNav activeView={tab} onViewChange={setTab} changeLogCount={changeLog.length}
      onOpenDisplay={() => { setTab("build"); setCustomizeOpen(true); }} />
  </>;
}
