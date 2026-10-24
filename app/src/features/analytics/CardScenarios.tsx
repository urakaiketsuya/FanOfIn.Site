import { REPORT_DRAW_CHECKPOINTS, calculateCardScenarios, cardReportCheckpoints, scenarioConditions, FIXTURE_FLOATING, type AnalyticsDeck, type Card, type ScenarioGroup } from '@gatcg/shared';
import AssociatedCards from '../../components/AssociatedCards';
import Panel from '../../components/ui/Panel';
import { useCardScenario } from './useCardScenario';

const GROUPS: { key: ScenarioGroup; label: string }[] = [{ key: 'resources', label: 'Resources' }, { key: 'draw', label: 'Draw & recovery' }, { key: 'combat', label: 'Damage & prevention' }, { key: 'packages', label: 'Enablers' }];
export default function CardScenarios({ deck, cardsByName }: { deck: AnalyticsDeck; cardsByName: Map<string, Card> }) {
  const controller = useCardScenario(deck, cardsByName);
  const rows = calculateCardScenarios(deck, cardsByName, controller.state);
  const checkpoints = REPORT_DRAW_CHECKPOINTS.map(seen => ({ seen, rows: calculateCardScenarios(deck, cardsByName, { ...controller.state, seen }) }));
  const missing = [...deck.main, ...deck.material].some(line => !cardsByName.has(line.name));
  const outsideFloating = deck.main.filter(line => /\*\*Floating Memory\*\*/i.test(cardsByName.get(line.name)?.effect ?? '') && !Object.hasOwn(FIXTURE_FLOATING, line.name)).reduce((sum, line) => sum + line.quantity, 0);
  const consumers = deck.main.filter(line => ['Strategem of Myriad Ice', 'Calculated Foresight'].includes(line.name));
  if (!rows.length) return <Panel data-component="CardScenarios"><h3 className="text-sm font-semibold">Card effects report</h3><p role="status" className="mt-2 text-sm">{missing ? 'Card data incomplete · report unavailable' : 'No supported card findings in this deck.'}</p></Panel>;
  return <Panel data-component="CardScenarios">
    <h3 className="text-sm font-semibold">Card effects report</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">{controller.champion || 'No class bonus'} · conditional one-copy outcomes · {Math.max(60, deck.main.reduce((sum, line) => sum + line.quantity, 0))}-card library</p>
    {consumers.length > 0 && <div className="mt-3 rounded-xl bg-ctp-mantle p-3"><h4 className="mb-2 text-sm font-semibold">Shared graveyard resource</h4><AssociatedCards lines={consumers} cardsByName={cardsByName} label="Floating Memory consumers" /><p className="mt-2 text-xs">Shared Floating Memory · 1 use per banished card</p></div>}
    {missing && <p role="status" className="mt-2 text-xs text-ctp-yellow">Card data incomplete</p>}
    {GROUPS.filter(group => rows.some(row => row.group === group.key)).map(group => <section key={group.key} className="mt-6">
      <h3 className="text-sm font-semibold">{group.label}</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">{rows.filter(row => row.group === group.key).map(row => <article key={row.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <h4 className="text-sm font-semibold">{row.name}</h4>
        {row.access !== null && <><p className="mt-2 text-xs text-ctp-subtext1">{row.group === 'packages' ? 'Chance to draw source and support' : 'Chance to draw a source'}</p>
        <div className="my-3 grid grid-cols-4 gap-2">{checkpoints.map(point => {
          const checkpointRow = point.rows.find(candidate => candidate.id === row.id);
          const access = checkpointRow?.group === 'packages' ? checkpointRow.value / 100 : checkpointRow?.access;
          return <div key={point.seen}><p className="text-xs text-ctp-subtext1">{point.seen} seen</p><p className="text-base font-semibold tabular-nums">{access == null ? '—' : `${(access * 100).toFixed(1)}%`}</p></div>;
        })}</div></>}
        <p className="mt-3 text-lg font-semibold">{row.unit.startsWith('%') ? row.value.toFixed(1) : row.value} {row.unit}{row.group === 'packages' ? ` · ${controller.state.seen} seen` : ''}</p>
        {scenarioConditions(row, controller.state) && <p className="mt-2 text-xs text-ctp-subtext1">{scenarioConditions(row, controller.state)}</p>}
        <dl className="my-3 space-y-2">{cardReportCheckpoints(deck, cardsByName, controller.state, row).map(point => <div key={point.label} className="flex flex-wrap justify-between gap-2 text-xs"><dt>{point.label}</dt><dd className="font-semibold">{point.value} {point.unit}</dd></div>)}</dl>
        <AssociatedCards lines={row.lines} cardsByName={cardsByName} label={row.name} highlighted={row.id === 'floating' ? new Set(row.support?.map(line => line.name)) : undefined} />
        {row.support && row.id !== 'floating' && <div className="mt-3"><p className="mb-2 text-xs font-medium">Supporting Main cards</p>{row.support.length ? <AssociatedCards lines={row.support} cardsByName={cardsByName} label={`${row.name} support`} /> : <p className="text-xs text-ctp-subtext1">No supported enablers in Main</p>}</div>}
      </article>)}</div>
      {group.key === 'resources' && outsideFloating > 0 && <p role="status" className="mt-3 text-xs text-ctp-yellow">{outsideFloating} other Floating Memory copies outside this model</p>}
    </section>)}
  </Panel>;
}
