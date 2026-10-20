import { useId, useState } from 'react';
import { reportDeltaChanged, scenarioConditions, SCENARIO_FIELDS, BOOLEAN_SCENARIOS, calculateFixtureMatchup, compareFixtureScenarios, copies, type AnalyticsDeck, type AnalyticsLine, type Card, type ScenarioKey, } from '@gatcg/shared';
import DrawAccessComparison from './DrawAccessComparison';
import AssociatedCards from '../../components/AssociatedCards';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import Panel from '../../components/ui/Panel';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import ScenarioControls, { ChampionControl } from './ScenarioControls';
import { useCardScenario } from './useCardScenario';

type Mode = 'opponents' | 'versions';
function comparisonLines(before: AnalyticsLine[] = [], after: AnalyticsLine[] = []) {
  return [...new Set([...before, ...after].map(line => line.name))].map(name => {
    const a = copies(before.filter(line => line.name === name)), b = copies(after.filter(line => line.name === name));
    return { name, quantity: Math.max(a, b), detail: `${a} → ${b} copies` };
  });
}
export default function FixtureComparison({ baseline, target, cardsByName, baselineLabel, targetLabel, initialMode = 'opponents' }: {
  baseline: AnalyticsDeck; target: AnalyticsDeck; cardsByName: Map<string, Card>; baselineLabel: string; targetLabel: string; initialMode?: Mode;
}) {
  const id = useId();
  const own = useCardScenario(baseline, cardsByName);
  const other = useCardScenario(target, cardsByName);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [named, setNamed] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [sequenceText, setSequenceText] = useState('3, 3');
  const sequenceValid = /^\s*\d+(\s*,\s*\d+)*\s*$/.test(sequenceText) && sequenceText.split(',').length <= 30 && sequenceText.split(',').every(value => Number(value) <= 100);
  const sequence = sequenceValid ? sequenceText.split(',').map(Number) : [];
  // Versions use identical numeric conditions, with each deck's selected active champion class.
  const targetState = { ...own.state, classes: other.state.classes };
  const deltas = compareFixtureScenarios(baseline, target, cardsByName, own.state, targetState);
  const visibleDeltas = [...deltas].sort((a, b) => Number(reportDeltaChanged(b)) - Number(reportDeltaChanged(a)));
  const changedCount = deltas.filter(reportDeltaChanged).length;
  const selectedName = target.main.some(line => line.name === named) ? named : [...target.main].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))[0]?.name ?? '';
  const matchup = calculateFixtureMatchup(baseline, target, cardsByName, own.state, other.state.classes, selectedName, sequence);
  const allNames = new Set([...baseline.main, ...baseline.material].map(line => line.name));
  const fields = new Set<ScenarioKey>();
  const requireFields = (names: string[], keys: ScenarioKey[]) => { if (names.some(name => allNames.has(name))) for (const key of keys) fields.add(key); };
  if (mode === 'versions') for (const delta of visibleDeltas) for (const key of [...delta.before?.fields ?? [], ...delta.after?.fields ?? []]) fields.add(key);
  else {
    requireFields(['Veiling Breeze'], ['wind']);
    requireFields(['Flourishing Restoration'], ['allies', 'damageTaken']);
    requireFields(['Mire Reparation'], ['omens', 'damageTaken']);
    requireFields(['Spalling Cleanse'], ['mastery', 'sheen', 'damageTaken']);
    requireFields(['Innervate Knowledge'], ['lineage', 'damageTaken']);
    requireFields(['Spirit of Serene Wind'], ['release', 'damageTaken']);
    requireFields(['Purifying Thurible', 'Ma Chao, Lupine Huntress', 'Purified Shot'], ['graveSize', 'graveFloating']);
    requireFields(['Purifying Thurible'], ['banish']);
    requireFields(['Ma Chao, Lupine Huntress'], ['beast']);
    requireFields(['Purified Shot'], ['hitDamage']);
    requireFields(['Arrow Trap'], ['prepared']);
    requireFields(["Protector's Plate"], ['linked']);
    requireFields(["Jianyu, Fate's Premonition"], ['phantasias']);
  }
  const missing = [...baseline.main, ...baseline.material, ...target.main, ...target.material].filter(line => !cardsByName.has(line.name));
  const needsName = allNames.has('Nia, Mistveiled Scout') || allNames.has("Jianyu, Fate's Premonition");
  const needsSequence = matchup.some(row => ['Damage after prevention', 'Recovery against pressure'].includes(row.label));
  const changed = new Map<string, { name: string; quantity: number; detail: string }>();
  for (const section of ['main', 'material'] as const) {
    const names = new Set([...baseline[section], ...target[section]].map(line => line.name));
    for (const name of names) {
      const a = copies(baseline[section].filter(line => line.name === name)), b = copies(target[section].filter(line => line.name === name));
      if (a !== b) changed.set(`${section}:${name}`, { name, quantity: Math.max(a, b), detail: `${section === 'main' ? 'Main' : 'Material'} ${a} → ${b}` });
    }
  }
  return <Panel data-component="FixtureComparison">
    <h3 className="font-semibold">Comparison report</h3>
    <p className="mt-1 break-words text-xs text-ctp-subtext1">{baselineLabel} → {targetLabel}</p>
    <div className="mt-3"><Tabs baseId={id} active={mode} onChange={setMode} tabs={[{ key: 'opponents', label: 'Against this deck' }, { key: 'versions', label: 'Compare versions' }]} label="Interaction comparison" wrap /></div>
    {missing.length > 0 && <p role="status" className="mt-3 text-xs text-ctp-yellow">Card data incomplete · {copies(missing)} copies unavailable</p>}
    <TabPanel baseId={id} tab="opponents" active={mode} keepMounted>
      <p className="mt-3 text-xs text-ctp-subtext1">{own.champion || 'No class bonus'} · one resolved source at a time</p>
      {!matchup.length && <p className="mt-3 text-sm">No supported interactions in the baseline deck.</p>}
      {needsName && <p className="mt-2 text-xs">Named card: {selectedName || 'No opposing Main cards'}</p>}
      {fields.size > 0 && <p className="mt-2 text-xs text-ctp-subtext1">{[...fields].map(key => `${SCENARIO_FIELDS[key][0]}: ${BOOLEAN_SCENARIOS.has(key) ? (own.state[key] ? 'Yes' : 'No') : own.state[key]}`).join(' · ')}</p>}
      {needsSequence && <p className="mt-2 text-xs">Incoming hits: {sequenceValid ? sequence.join(' + ') : 'Invalid sequence'} · {own.state.wind} Wind revealed · {own.state.damageTaken} damage on champion</p>}
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {matchup.map(row => <article key={row.id} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
          <AssociatedCards lines={[row.source]} cardsByName={cardsByName} label={`${row.source.name} source`} />
          <p className="mt-3 text-xs font-medium">{row.label}</p>
          <div aria-live="polite"><p className="mt-1 text-xl font-semibold">{!sequenceValid && ['Damage after prevention', 'Recovery against pressure'].includes(row.label) ? 'Enter a valid damage sequence' : row.value}</p><p className="mt-1 text-xs text-ctp-subtext1">{!sequenceValid && ['Damage after prevention', 'Recovery against pressure'].includes(row.label) ? '' : row.detail}</p></div>
          {row.targets.length > 0 && <div className="mt-3"><p className="mb-2 text-xs font-medium">Associated opposing cards</p><AssociatedCards lines={row.targets} cardsByName={cardsByName} label={`${row.source.name} opposing cards`} /></div>}
        </article>)}
      </div>

    </TabPanel>
    <TabPanel baseId={id} tab="versions" active={mode} keepMounted>
      <DrawAccessComparison baseline={baseline} target={target} cardsByName={cardsByName} baselineLabel={baselineLabel} targetLabel={targetLabel} />
      <p className="mt-3 text-xs text-ctp-subtext1">{changedCount} changed findings · {deltas.length - changedCount} unchanged · {own.state.seen} cards seen</p>
      <p className="mt-1 text-xs text-ctp-subtext1">{own.champion || 'No class bonus'} → {other.champion || 'No class bonus'}</p>
      {!deltas.length && <p className="mt-3 text-sm">No supported calculations in either deck.</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleDeltas.map(delta => {
          const row = delta.after ?? delta.before!;
          const accessA = delta.before?.access, accessB = delta.after?.access;
          const accessDelta = (accessB ?? 0) - (accessA ?? 0);
          return <article key={delta.id} className={`min-w-0 rounded-xl bg-ctp-mantle p-3 ${delta.id === "answerAccess" ? "sm:col-span-2 xl:col-span-3" : ""}`}>
            <h4 className="text-sm font-semibold">{row.name}</h4>
            <p className="mt-3 text-xs font-medium">{reportDeltaChanged(delta) ? "Changed" : "Unchanged"} · {row.unit}</p><p className="mt-1 text-xl font-semibold" aria-live="polite">{delta.before ? Number(delta.before.value.toFixed(1)) : 'Absent'} → {delta.after ? Number(delta.after.value.toFixed(1)) : 'Absent'}</p>
            <p className="mt-1 text-xs text-ctp-subtext1">{delta.before && delta.after && delta.before.detail !== delta.after.detail ? `${delta.before.detail} → ${delta.after.detail}` : row.detail}</p>
            {scenarioConditions(row, own.state) && <p className="mt-2 text-xs text-ctp-subtext1">{scenarioConditions(row, own.state)}</p>}
            <AssociatedCards lines={comparisonLines(delta.before?.lines, delta.after?.lines)} cardsByName={cardsByName} label={row.name} />
            {row.group === 'packages' && <div className="mt-3"><p className="mb-2 text-xs font-medium">Supporting cards · either version</p><AssociatedCards lines={comparisonLines(delta.before?.support, delta.after?.support)} cardsByName={cardsByName} label={`${row.name} enablers`} /></div>}
            {(accessA != null || accessB != null) && <p className="mt-2 text-xs">Find in {own.state.seen}: {((accessA ?? 0) * 100).toFixed(1)}% → {((accessB ?? 0) * 100).toFixed(1)}% ({accessDelta >= 0 ? '+' : ''}{(accessDelta * 100).toFixed(1)} pp)</p>}
          </article>;
        })}
      </div>
      {changed.size > 0 && <div className="mt-4"><h4 className="mb-2 text-xs font-semibold">Changed Main & Material cards</h4><AssociatedCards lines={[...changed.values()]} cardsByName={cardsByName} label="Cards changed between versions" /></div>}
    </TabPanel>
    {mode === 'opponents' && <Button className="mt-4" onClick={() => setAdjusting(true)}>Adjust opponent scenario</Button>}
    {adjusting && <DialogSheet title="Adjust comparison scenario" onDismiss={() => setAdjusting(false)} footer={<Button onClick={() => setAdjusting(false)}>View report</Button>}>
    {mode === 'opponents' && <>      {(needsName || needsSequence) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {needsName && <label className="min-w-0 text-xs font-medium" htmlFor={`${id}-name`}>Named opposing card<select id={`${id}-name`} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" value={selectedName} onChange={e => setNamed(e.target.value)}>{[...new Set(target.main.map(line => line.name))].sort().map(name => <option key={name}>{name}</option>)}</select></label>}
        {needsSequence && <label className="min-w-0 text-xs font-medium" htmlFor={`${id}-sequence`}>Incoming damage sequence<input id={`${id}-sequence`} value={sequenceText} onChange={e => setSequenceText(e.target.value)} aria-invalid={!sequenceValid} aria-describedby={`${id}-sequence-help`} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /><span id={`${id}-sequence-help`} className="mt-1 block">{sequenceValid ? `${sequence.reduce((sum, n) => sum + n, 0)} total · comma-separated events` : 'Enter up to 30 damage amounts, 0–100, separated by commas.'}</span></label>}
      </div>}</>}

    <div className="mt-3 grid gap-3 sm:grid-cols-2"><ChampionControl controller={own} label="Baseline active champion" /><ChampionControl controller={other} label="Other active champion" /></div>
    <ScenarioControls controller={own} fields={mode === 'versions' ? ['seen', ...fields] : [...fields]} champion={false} />
    </DialogSheet>}
  </Panel>;
}
