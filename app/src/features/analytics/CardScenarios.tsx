import { useId, useState } from 'react';
import { calculateCardScenarios, FIXTURE_FLOATING, type AnalyticsDeck, type Card, type CardScenarioResult, type ScenarioGroup } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import ScenarioControls from './ScenarioControls';
import { useCardScenario } from './useCardScenario';

const GROUPS: { key: ScenarioGroup; label: string }[] = [{ key: 'resources', label: 'Resources' }, { key: 'draw', label: 'Draw & recovery' }, { key: 'combat', label: 'Attacks' }, { key: 'packages', label: 'Enablers' }];
export function ScenarioResultCard({ row, cardsByName, seen }: { row: CardScenarioResult; cardsByName: Map<string, Card>; seen: number }) {
  return <article className="min-w-0 rounded-xl bg-ctp-mantle p-3">
    <AssociatedCards lines={row.lines} cardsByName={cardsByName} label={row.name} highlighted={row.id === 'floating' ? new Set(row.support?.map(line => line.name)) : undefined} />
    <div aria-live="polite" className="mt-3"><p className="text-2xl font-semibold">{row.unit.startsWith('%') ? row.value.toFixed(1) : row.value}{row.unit.startsWith('%') ? row.unit : ` ${row.unit}`}</p><p className="mt-1 text-xs text-ctp-subtext1">{row.detail}</p></div>
    {row.access !== null && <p className="mt-2 text-xs text-ctp-subtext1">{(row.access * 100).toFixed(1)}% to find · {seen} cards seen</p>}
    {row.support && row.id !== 'floating' && <div className="mt-3"><p className="mb-2 text-xs font-medium">Supporting Main cards</p>{row.support.length ? <AssociatedCards lines={row.support} cardsByName={cardsByName} label={`${row.name} support`} /> : <p className="text-xs text-ctp-subtext1">No supported enablers in Main</p>}</div>}
  </article>;
}
export default function CardScenarios({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const id = useId();
  const controller = useCardScenario(deck, cardsByName);
  const [tab, setTab] = useState<ScenarioGroup>('resources');
  const rows = calculateCardScenarios(deck, cardsByName, controller.state).filter(row => !['Veiling Breeze', 'Crystallized Destiny', 'Flourishing Restoration'].includes(row.name));
  const tabs = GROUPS.filter(group => rows.some(row => row.group === group.key));
  const active = tabs.some(group => group.key === tab) ? tab : tabs[0]?.key;
  const missing = [...deck.main, ...deck.material].some(line => !cardsByName.has(line.name));
  const outsideFloating = deck.main.filter(line => /floating memory/i.test(cardsByName.get(line.name)?.effect ?? '') && !Object.hasOwn(FIXTURE_FLOATING, line.name)).reduce((sum, line) => sum + line.quantity, 0);
  if (!rows.length) return null;
  return <Panel data-component="CardScenarios">
    <h3 className="text-sm font-semibold">Card scenarios</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Independent outcomes · one copy at a time</p>
    {missing && <p role="status" className="mt-2 text-xs text-ctp-yellow">Card data incomplete</p>}
    <div className="mt-3"><Tabs tabs={tabs} active={active} onChange={setTab} baseId={id} label="Card scenario category" wrap /></div>
    {tabs.map(group => {
      const selected = rows.filter(row => row.group === group.key);
      return <TabPanel key={group.key} baseId={id} tab={group.key} active={active} keepMounted>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selected.map(row => <ScenarioResultCard key={row.id} row={row} cardsByName={cardsByName} seen={controller.state.seen} />)}</div>
        {group.key === 'resources' && outsideFloating > 0 && <p className="mt-3 text-xs text-ctp-subtext1">{outsideFloating} other Floating Memory copies outside this model</p>}
        <h4 className="mt-4 text-xs font-semibold">Scenario</h4>
        <ScenarioControls controller={controller} fields={['seen', ...selected.flatMap(row => row.fields)]} />
      </TabPanel>;
    })}
  </Panel>;
}
