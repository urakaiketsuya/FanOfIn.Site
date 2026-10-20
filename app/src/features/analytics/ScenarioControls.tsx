import { useId } from 'react';
import { BOOLEAN_SCENARIOS, SCENARIO_FIELDS, type ScenarioKey } from '@gatcg/shared';
import type { ScenarioController } from './useCardScenario';

const controlClass = 'mt-1 block min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue';
export function ChampionControl({ controller, label = 'Active champion' }: { controller: ScenarioController; label?: string }) {
  const id = useId();
  return <label htmlFor={id} className="block min-w-0 text-xs font-medium">{label}<select id={id} className={controlClass} value={controller.champion} onChange={e => controller.setChampion(e.target.value)}><option value="">No class bonus</option>{controller.champions.map(card => <option key={card.name} value={card.name}>{card.name}</option>)}</select></label>;
}
export default function ScenarioControls({ controller, fields, champion = true }: { controller: ScenarioController; fields: ScenarioKey[]; champion?: boolean }) {
  const id = useId();
  return <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {champion && <ChampionControl controller={controller} />}
    {[...new Set(fields)].map(key => <label key={key} htmlFor={`${id}-${key}`} className="block min-w-0 text-xs font-medium">{SCENARIO_FIELDS[key][0]}
      {BOOLEAN_SCENARIOS.has(key) ? <select id={`${id}-${key}`} className={controlClass} value={controller.state[key] ? 1 : 0} onChange={e => controller.setValue(key, Number(e.target.value))}><option value={0}>No</option><option value={1}>Yes</option></select>
        : <input id={`${id}-${key}`} className={controlClass} type="number" min={0} max={100} step={1} value={controller.state[key]} onChange={e => controller.setValue(key, Math.min(100, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />}
    </label>)}
  </div>;
}
