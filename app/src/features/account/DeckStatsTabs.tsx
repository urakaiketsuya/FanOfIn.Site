import { useId, useState } from "react";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import type { DeckStatsTab } from "./UserDeckStats";

/** Mount specialist tools on demand; retain visited tools to preserve their drafts. */
export default function DeckStatsTabs({ tabs }: { tabs: DeckStatsTab[] }) {
  const baseId = useId();
  const [selection, setSelection] = useState(tabs[0]?.key);
  const active = tabs.some(tab => tab.key === selection) ? selection : tabs[0]?.key;
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  if (!active) return null;
  return <div data-component="DeckStatsTabs" className="space-y-4">
    <Tabs tabs={tabs} active={active} baseId={baseId} label="Deck analysis" variant="pill" wrap onChange={key => {
      setVisited(current => new Set([...current, active, key]));
      setSelection(key);
      tabs.find(tab => tab.key === key)?.onOpen?.();
    }} />
    {tabs.map(tab => <TabPanel key={tab.key} baseId={baseId} tab={tab.key} active={active} keepMounted>
      {(active === tab.key || visited.has(tab.key)) && tab.content}
    </TabPanel>)}
  </div>;
}
