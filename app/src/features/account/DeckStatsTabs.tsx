import { useEffect, useId, useState } from "react";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import type { DeckStatsTab } from "./UserDeckStats";

/** Mount specialist tools on demand; retain visited tools to preserve their drafts. */
export default function DeckStatsTabs({ tabs, selected, onChange }: { tabs: DeckStatsTab[]; selected?: string; onChange?: (key: string) => void }) {
  const baseId = useId();
  const [selection, setSelection] = useState(tabs[0]?.key);
  const requested = selected ?? selection;
  const active = tabs.some(tab => tab.key === requested) ? requested : tabs[0]?.key;
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  useEffect(() => { if (active) setVisited(current => current.has(active) ? current : new Set([...current, active])); }, [active]);
  if (!active) return null;
  return <div data-component="DeckStatsTabs" className="space-y-4">
    <Tabs tabs={tabs} active={active} baseId={baseId} label="Deck analysis" variant="pill" wrap onChange={key => {
      setVisited(current => new Set([...current, active, key]));
      setSelection(key);
      onChange?.(key);
      tabs.find(tab => tab.key === key)?.onOpen?.();
    }} />
    {tabs.map(tab => <TabPanel key={tab.key} baseId={baseId} tab={tab.key} active={active} keepMounted>
      {(active === tab.key || visited.has(tab.key)) && tab.content}
    </TabPanel>)}
  </div>;
}
