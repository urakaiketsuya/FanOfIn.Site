import { useState } from "react";
import DisclosureChevron from "../../components/DisclosureChevron";
import type { DeckStatsTab } from "./UserDeckStats";

/** Mount specialist tools on demand; retain visited tools to preserve their drafts. */
export default function DeckStatsTabs({ tabs }: { tabs: DeckStatsTab[] }) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  return <div data-component="DeckStatsTabs" className="space-y-3">
    <div><h2 className="font-semibold text-ctp-text">Explore analysis</h2><p className="mt-1 text-xs text-ctp-subtext0">Open a specialist view when you need its supporting detail.</p></div>
    {tabs.map((tab) => <details key={tab.key} onToggle={event => {
      if (!event.currentTarget.open) return;
      setVisited(current => current.has(tab.key) ? current : new Set([...current, tab.key]));
      tab.onOpen?.();
    }} className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle">
      <summary className="min-h-12 cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue"><span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-ctp-text">{tab.label}</span><DisclosureChevron className="text-ctp-subtext0 transition-transform group-open:rotate-180" /></span></summary>
      {visited.has(tab.key) && <div className="border-t border-ctp-surface1 p-3 sm:p-4">{tab.content}</div>}
    </details>)}
  </div>;
}
