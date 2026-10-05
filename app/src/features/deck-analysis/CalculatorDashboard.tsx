import ResultEvidence from './ResultEvidence';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Tabs, { TabPanel } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import AccessTimeline, { ScenarioControls, type AnalysisScenario } from './AccessTimeline';
import CalculatorCardPool from './CalculatorCardPool';
import CalculatorCardContext from './CalculatorCardContext';
import { calculatorTools as tools, calculatorGroups, calculatorInfo, type CalculatorTool as Tool } from './calculatorTools';
import type { Card } from '@gatcg/shared';
import { computeLevelGoalAnalysis } from '../../lib/levelGoal';
import { computeReserveSequence, type ReserveSequenceStep } from '../deckbuilder/reserveSequence';
import type { AnalysisPlan } from '../../lib/analysisProfile';
import { naturalCardsSeenByTurn, type PlayOrder } from '../../lib/turnToPlay';
import { probabilityAtLeast } from '../deckbuilder/synergyReadiness';
import { countSelectedCopies, minimumCopies, nextDrawOdds, previewCalculatorSwap, selectedRecipeOdds, type CalculatorLine } from '../../lib/calculatorDashboard';

const inputClass = 'mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text';
interface Settings { tool: Tool; turn: number; order: PlayOrder; selected: string[]; unwanted: string[]; required: number; target: number; out: string; incoming: string; quantity: number; known: number; knownHits: number; level: number; steps: ReserveSequenceStep[]; firstIngredient: string[]; secondIngredient: string[]; customRecipe: boolean }
const defaults: Settings = { tool: 'Find cards', turn: 3, order: 'first', selected: [], unwanted: [], required: 1, target: 80, out: '', incoming: '', quantity: 1, known: 0, knownHits: 0, level: 3, steps: [], firstIngredient: [], secondIngredient: [], customRecipe: false };
function readSettings(key: string): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!raw || typeof raw !== 'object') return defaults;
    const result = { ...defaults };
    if (tools.includes(raw.tool)) result.tool = raw.tool;
    if (raw.order === 'first' || raw.order === 'second') result.order = raw.order;
    for (const name of ['selected', 'unwanted', 'firstIngredient', 'secondIngredient'] as const) if (Array.isArray(raw[name])) result[name] = [...new Set(raw[name].filter((item: unknown): item is string => typeof item === 'string'))] as string[];
    for (const name of ['out', 'incoming'] as const) if (typeof raw[name] === 'string') result[name] = raw[name];
    for (const [name, min, max] of [['level', 2, 6], ['turn', 1, 8], ['required', 1, 20], ['target', 1, 100], ['quantity', 1, 200], ['known', 0, 200], ['knownHits', 0, 200]] as const) if (Number.isInteger(raw[name]) && raw[name] >= min && raw[name] <= max) result[name] = raw[name];
    result.customRecipe = raw.customRecipe === true;
    if (Array.isArray(raw.steps)) result.steps = raw.steps.slice(0, 4).filter((step: ReserveSequenceStep) => step && typeof step.name === 'string' && Number.isInteger(step.turn) && step.turn >= 1 && step.turn <= 20 && Number.isInteger(step.effectiveReserveCost) && step.effectiveReserveCost! >= 0 && step.effectiveReserveCost! <= 99);
    return result;
  } catch { return defaults; }
}
const percent = (value: number | null) => value === null ? '–' : `${(value * 100).toFixed(1)}%`;

export default function CalculatorDashboard({ main, sideboard, material, catalog, opening, plan, storageKey, onEditPlan, initialCard, scenario, onScenarioChange, detailedModels = {} }: { main: CalculatorLine[]; sideboard: CalculatorLine[]; material: CalculatorLine[]; catalog: Map<string, Card>; opening: number; plan: AnalysisPlan | null; storageKey: string; onEditPlan: () => void; initialCard?: { name: string; nonce: number }; scenario: AnalysisScenario; onScenarioChange: (value: AnalysisScenario) => void; detailedModels?: Partial<Record<Tool, ReactNode>> }) {
  const key = `fanofin:calculator-dashboard:v1:${storageKey}`;
  const [localSettings, setSettings] = useState(() => initialCard ? { ...readSettings(key), tool: 'Find cards' as Tool, selected: [initialCard.name], required: 1 } : readSettings(key));
  const settings = useMemo(() => ({ ...localSettings, ...scenario }), [localSettings, scenario]);
  const previousRequest = useRef(initialCard);
  useEffect(() => {
    if (!initialCard || previousRequest.current === initialCard) return;
    previousRequest.current = initialCard;
    setSettings((current) => ({ ...current, tool: 'Find cards', selected: [initialCard.name], required: 1 }));
    setModelViews((current) => ({ ...current, 'Find cards': false }));
  }, [initialCard]);
  const [modelViews, setModelViews] = useState<Partial<Record<Tool, boolean>>>({});
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(settings)); setSaved(true); } catch { setSaved(false); } }, [key, settings]);
  const update = (patch: Partial<Settings>) => { if (patch.turn !== undefined || patch.order !== undefined) onScenarioChange({ turn: patch.turn ?? scenario.turn, order: patch.order ?? scenario.order }); startTransition(() => setSettings((current) => ({ ...current, ...patch }))); };
  const size = main.reduce((sum, line) => sum + line.quantity, 0);
  const seen = Math.min(size, naturalCardsSeenByTurn(settings.turn, opening, settings.order));
  const names = new Set(main.map((line) => line.name));
  const poolLines = settings.tool === 'Swap comparison' && settings.incoming && !names.has(settings.incoming) && catalog.has(settings.incoming) ? [...main, { name: settings.incoming, quantity: 0 }] : main;
  const selected = settings.selected.filter((name) => poolLines.some((line) => line.name === name));
  const unwanted = settings.unwanted.filter((name) => names.has(name));
  const copies = countSelectedCopies(main, selected);
  const oddsAt = (draws: number) => selected.length ? probabilityAtLeast(size, copies, draws, settings.required) : null;
  const byRole = (role: string) => main.filter((line) => plan?.roles[line.name] === role).map((line) => line.name);
  const planGroups = [byRole('enabler'), byRole('payoff')];
  const planReady = planGroups.every((group) => group.length > 0);
  const recipeGroups = settings.customRecipe ? [settings.firstIngredient, settings.secondIngredient].map((group) => group.filter((name) => names.has(name))) : [byRole('enabler'), byRole('protection')];
  const recipeReady = recipeGroups.every((group) => group.length > 0);
  const needed = minimumCopies(size, seen, settings.required, settings.target / 100);
  const targetTurn = selected.length ? Array.from({ length: 8 }, (_, i) => i + 1).find((turn) => probabilityAtLeast(size, copies, naturalCardsSeenByTurn(turn, opening, settings.order), settings.required) + 1e-12 >= settings.target / 100) : undefined;
  const swap = previewCalculatorSwap(main, settings.out, settings.incoming, settings.quantity);
  const incomingOptions = useMemo(() => [...new Set([...main, ...sideboard].map((line) => line.name).concat([...catalog.values()].filter((card) => !card.types.includes('CHAMPION') && !card.types.includes('REGALIA')).map((card) => card.name)))].sort(), [main, sideboard, catalog]);
  const validSwap = swap && incomingOptions.includes(settings.incoming) ? swap : null;
  const pressure = main.filter((line) => plan?.pressure[line.name] && plan.pressure[line.name].earliestTurn <= settings.turn).map((line) => line.name);
  const recovery = main.filter((line) => plan?.resilience[line.name] === 'rebuild').map((line) => line.name);
  const nextDraw = nextDrawOdds(size, copies, settings.known, settings.knownHits);
  const knownValid = nextDraw !== null;
  const checkpoint = `by turn ${settings.turn}`;
  const numberInput = (label: string, field: 'level' | 'required' | 'target' | 'quantity' | 'known' | 'knownHits', min: number, max: number) => <label className="text-xs text-ctp-subtext0">{label}<input type="number" min={min} max={max} value={settings[field]} onChange={(event) => update({ [field]: Math.min(max, Math.max(min, Math.floor(Number(event.target.value) || min))) })} className={inputClass} /></label>;
  const pool = (label: string, field: 'selected' | 'unwanted') => <CalculatorCardPool catalog={catalog} label={label} lines={poolLines} selected={settings[field]} onChange={(value) => update({ [field]: value })} />;
  const editPlan = <button type="button" onClick={onEditPlan} className="min-h-12 text-sm font-medium text-ctp-blue">Choose plan cards →</button>;
  const levelAnalysis = useMemo(() => settings.tool === 'Level timing' ? computeLevelGoalAnalysis(main, material, catalog, { targetLevel: settings.level, targetTurn: settings.turn, playOrder: settings.order, useDirectLevelUp: true, useFractalPayment: true, fragmentedSpiritDepth: 12 }) : null, [main, material, catalog, settings.tool, settings.level, settings.turn, settings.order]);
  const validSteps = useMemo(() => settings.steps.filter((step) => main.some((line) => line.name === step.name) && catalog.get(step.name)?.cost.type === 'reserve'), [settings.steps, main, catalog]);
  const sequence = useMemo(() => settings.tool === 'Play sequence' ? computeReserveSequence(main, catalog, validSteps, opening + (settings.order === 'second' ? 1 : 0)) : null, [main, catalog, settings.tool, validSteps, settings.order, opening]);
  const delayedSequence = useMemo(() => settings.tool === 'Play sequence' && validSteps.length ? computeReserveSequence(main, catalog, validSteps.map((step) => ({ ...step, turn: step.turn + 1 })), opening + (settings.order === 'second' ? 1 : 0)) : null, [main, catalog, settings.tool, validSteps, settings.order, opening]);
  const info = calculatorInfo[settings.tool];
  const standalone = settings.tool === 'Resource timing' || settings.tool === 'Sideboard comparison';
  const modelActive = standalone || !!modelViews[settings.tool];
  const scenarioCards = settings.tool === 'Opening hand' ? recipeGroups.flat() : settings.tool === 'Plan consistency' ? planGroups.flat() : settings.tool === 'Pressure access' ? pressure : settings.tool === 'Recovery access' ? recovery : settings.tool === 'Play sequence' ? validSteps.map((step) => step.name) : settings.tool === 'Level timing' ? material.map((line) => line.name) : settings.tool === 'Unwanted draws' ? unwanted : settings.tool === 'Swap comparison' ? [settings.out, settings.incoming].filter(Boolean) : selected;
  let result: ReactNode;
  let controls: ReactNode;
  switch (settings.tool) {
    case 'Level timing': {
      const best = levelAnalysis?.routes.filter((route) => route.id !== 'fractal' && route.probability !== null).sort((a, b) => b.probability! - a.probability!)[0];
      result = <><Result label={`Level ${settings.level} route access ${checkpoint}`} value={percent(best?.probability ?? null)} /><SmallResult label="Natural schedule" value={`Turn ${levelAnalysis?.naturalTurn ?? '–'}`} /></>;
      controls = <>{numberInput('Target level', 'level', 2, 6)}{best?.bottleneck && <p className="text-xs text-ctp-yellow">{best.bottleneck}</p>}</>;
      break;
    }
    case 'Play sequence':
      result = <><Result label="Drawn on time · within hand ceiling" value={percent(validSteps.length ? sequence?.playableProbability ?? null : null)} /><SmallResult label="Drawn by deadlines" value={percent(validSteps.length ? sequence?.probability ?? null : null)} /><SmallResult label="If every play is one turn later" value={percent(delayedSequence?.playableProbability ?? null)} />{sequence && validSteps.length > 0 && <details className="group"><summary className="flex min-h-12 cursor-pointer items-center justify-between text-sm">Resources by turn<DisclosureChevron className="group-open:rotate-180" /></summary><div className="space-y-2">{sequence.pressure.map((point) => <div key={point.turn} className="rounded-xl bg-ctp-base/50 p-3 text-sm"><p className="font-semibold">Turn {point.turn} · {point.cards.join(' + ')}</p><p className="mt-1">{point.reserveCost} Reserve · {point.cardsNeeded} cards needed · {point.handCeiling} hand ceiling</p><p className="mt-1 font-semibold">{point.margin >= 0 ? `${point.margin} spare in this model` : `${Math.abs(point.margin)} cards short`}</p>{point.floatingPotential > 0 && <p className="mt-1 text-xs">Up to {point.floatingPotential} Floating Memory potential, not applied.</p>}</div>)}</div><p className="mt-2 text-xs">Reduced effective costs assume their conditions are satisfied. Earlier selected plays are subtracted; other spending is not modeled.</p></details>}<Link to="/combo-lab" className="flex min-h-12 items-center text-sm text-ctp-blue underline">Explore branching lines in Combo Lab</Link></>;
      controls = <><label className="text-xs text-ctp-subtext0">Add a play<select value="" disabled={validSteps.length >= 4} onChange={(event) => { if (event.target.value) update({ steps: [...validSteps, { name: event.target.value, turn: settings.turn, effectiveReserveCost: Math.max(0, catalog.get(event.target.value)?.cost_reserve ?? 0) }] }); }} className={inputClass}><option value="">Choose card</option>{main.filter((line) => catalog.get(line.name)?.cost.type === 'reserve').map((line) => <option key={line.name}>{line.name}</option>)}</select></label>{validSteps.map((step, index) => <div key={index} className="rounded-lg border border-ctp-surface1 p-3"><p className="text-sm">{step.name}</p><div className="grid grid-cols-2 gap-2"><label className="text-xs text-ctp-subtext0">Turn<input type="number" min={1} max={20} value={step.turn} onChange={(event) => update({ steps: validSteps.map((item, i) => i === index ? { ...item, turn: Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1))) } : item) })} className={inputClass} /></label><label className="text-xs text-ctp-subtext0">Effective Reserve<input type="number" min={0} max={99} value={step.effectiveReserveCost} onChange={(event) => update({ steps: validSteps.map((item, i) => i === index ? { ...item, effectiveReserveCost: Math.min(99, Math.max(0, Math.floor(Number(event.target.value) || 0))) } : item) })} className={inputClass} /></label></div><button type="button" onClick={() => update({ steps: validSteps.filter((_, i) => i !== index) })} className="min-h-12 text-xs text-ctp-blue">Remove</button></div>)}</>;
      break;
    case 'Opening hand':
      result = <><Result label="Opening recipe access" value={percent(recipeReady ? selectedRecipeOdds(main, recipeGroups, Math.min(opening, size)) : null)} /><SmallResult label={`Recipe access ${checkpoint}`} value={percent(recipeReady ? selectedRecipeOdds(main, recipeGroups, seen) : null)} /></>;
      controls = <>{recipeGroups.map((group, index) => <CalculatorCardPool catalog={catalog} key={index} label={`${index === 0 ? 'First' : 'Second'} ingredient · any one`} lines={main} selected={group} onChange={(value) => update({ customRecipe: true, firstIngredient: index === 0 ? value : recipeGroups[0], secondIngredient: index === 1 ? value : recipeGroups[1] })} />)}{recipeGroups[0].some((name) => recipeGroups[1].includes(name)) && <p role="alert" className="text-sm text-ctp-yellow">Assign each card to one ingredient.</p>}</>;
      break;
    case 'Plan consistency':
      result = <><Result label={`Setup + payoff access ${checkpoint}`} value={percent(planReady ? selectedRecipeOdds(main, planGroups, seen) : null)} /><SmallResult label="With protection" value={percent(planReady && byRole('protection').length ? selectedRecipeOdds(main, [...planGroups, byRole('protection')], seen) : null)} /></>;
      controls = <><p className="text-sm text-ctp-subtext1">{plan?.name ?? 'Primary plan'}</p>{editPlan}</>;
      break;
    case 'Copies needed':
      result = <><Result label={`Matching copies for ${settings.target}% access ${checkpoint}`} value={needed === null ? 'Unreachable' : `${needed} copies`} /><SmallResult label="Selected pool" value={`${copies} copies`} /></>;
      controls = <>{numberInput('Target chance (%)', 'target', 1, 100)}{numberInput('Copies to find', 'required', 1, 20)}{pool('Matching cards (optional)', 'selected')}</>;
      break;
    case 'Swap comparison': {
      const metric = (label: string, before: number | null, after: number | null) => <div className="rounded-lg border border-ctp-surface1 p-3"><p className="text-xs text-ctp-subtext0">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{percent(before)} → {percent(after)}</p><p className="mt-1 text-sm text-ctp-subtext1">{before === null || after === null ? 'Choose cards' : `${after >= before ? '+' : ''}${((after - before) * 100).toFixed(1)} pp`}</p></div>;
      const access = (lines: CalculatorLine[], draws: number) => selected.length ? probabilityAtLeast(size, countSelectedCopies(lines, selected), draws, settings.required) : null;
      result = <div className="grid gap-3 sm:grid-cols-2">{metric('Tracked cards · opening', access(main, opening), validSwap ? access(validSwap, opening) : null)}{metric(`Selected cards · turn ${settings.turn}`, access(main, seen), validSwap ? access(validSwap, seen) : null)}{metric(`Setup + payoff · turn ${settings.turn}`, planReady ? selectedRecipeOdds(main, planGroups, seen) : null, planReady && validSwap ? selectedRecipeOdds(validSwap, planGroups, seen) : null)}{metric('2+ unwanted cards · opening', unwanted.length ? probabilityAtLeast(size, countSelectedCopies(main, unwanted), opening, 2) : null, unwanted.length && validSwap ? probabilityAtLeast(size, countSelectedCopies(validSwap, unwanted), opening, 2) : null)}</div>;
      controls = <><label className="text-xs text-ctp-subtext0">Remove<select value={settings.out} onChange={(event) => update({ out: event.target.value })} className={inputClass}><option value="">Choose card</option>{main.map((line) => <option key={line.name}>{line.name}</option>)}</select></label><label className="text-xs text-ctp-subtext0">Add<input list="calculator-incoming" value={settings.incoming} onChange={(event) => update({ incoming: event.target.value })} className={inputClass} /><datalist id="calculator-incoming">{incomingOptions.map((name) => <option key={name} value={name} />)}</datalist></label>{numberInput('Copies to swap', 'quantity', 1, Math.max(1, main.find((line) => line.name === settings.out)?.quantity ?? 1))}{pool('Track access to', 'selected')}{pool('Unwanted early', 'unwanted')}{!validSwap && settings.out && settings.incoming && <p role="alert" className="text-sm text-ctp-yellow">Choose different cards and an available quantity.</p>}</>;
      break;
    }
    case 'Unwanted draws': {
      const unwantedCount = countSelectedCopies(main, unwanted);
      result = <><Result label={`Chance of ${settings.required}+ unwanted cards · opening`} value={percent(unwanted.length ? probabilityAtLeast(size, unwantedCount, opening, settings.required) : null)} /><SmallResult label={checkpoint} value={percent(unwanted.length ? probabilityAtLeast(size, unwantedCount, seen, settings.required) : null)} /></>;
      controls = <>{pool('Unwanted cards', 'unwanted')}{numberInput('Count at least', 'required', 1, 20)}</>;
      break;
    }
    case 'Pressure access':
    case 'Recovery access': {
      const group = settings.tool === 'Pressure access' ? pressure : recovery;
      const configured = settings.tool === 'Pressure access' ? Object.keys(plan?.pressure ?? {}).length > 0 : recovery.length > 0;
      result = <><Result label={`${settings.tool === 'Pressure access' ? 'Pressure' : 'Rebuild'} card access ${checkpoint}`} value={percent(configured ? probabilityAtLeast(size, countSelectedCopies(main, group), seen, 1) : null)} /><SmallResult label="Matching copies" value={`${countSelectedCopies(main, group)}`} /></>;
      controls = editPlan;
      break;
    }
    case 'Next draw':
      result = <Result label="Selected card on next draw" value={percent(selected.length && knownValid ? nextDraw : null)} />;
      controls = <>{pool('Cards to find', 'selected')}{numberInput('Cards removed from deck', 'known', 0, size)}{numberInput('Matching copies removed', 'knownHits', 0, copies)}{!knownValid && <p role="alert" className="text-sm text-ctp-yellow">Check remaining deck and matching copies.</p>}</>;
      break;
    default:
      result = <><Result label={`${selected.length ? selected.join(" / ") + " · " : ""}Find ${settings.required}+ ${checkpoint}`} value={percent(oddsAt(seen))} /><div className="grid grid-cols-2 gap-3"><SmallResult label="Opening hand" value={percent(oddsAt(opening))} /><SmallResult label={`Reach ${settings.target}%`} value={!selected.length ? '–' : targetTurn ? `Turn ${targetTurn}` : 'Not reached by turn 8'} /></div></>;
      controls = <>{pool('Cards to find · any matching copy', 'selected')}{numberInput('Copies to find', 'required', 1, 20)}{numberInput('Target chance (%)', 'target', 1, 100)}</>;
  }
  return <section className="mt-4" aria-label="Deck calculators">
    <div className="rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext1">Explore a scenario</p>
      <h2 className="mt-1 text-2xl font-bold sm:text-3xl">What would you like to understand?</h2>
      <p className="mb-4 mt-2 text-sm text-ctp-subtext1">Quick estimate selections save on this device. Detailed scenario drafts stay while this deck is open. Your deck remains unchanged.</p>
      <Tabs tabs={calculatorGroups.map((group) => ({ key: group, label: group }))} active={info.group} onChange={(group) => update({ tool: tools.find((tool) => calculatorInfo[tool].group === group)! })} baseId="calculator-groups" label="Calculation topics" variant="pill" />
      {calculatorGroups.map((group) => <TabPanel key={group} baseId="calculator-groups" tab={group} active={info.group}>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{tools.filter((tool) => calculatorInfo[tool].group === group).map((tool) => <Button key={tool} aria-pressed={settings.tool === tool} onClick={() => update({ tool })} className={`text-left ${settings.tool === tool ? 'border-ctp-blue bg-ctp-blue/10 ring-1 ring-ctp-blue' : ''}`}><span className="block font-semibold">{tool}</span><span className="mt-1 block text-xs font-normal text-ctp-subtext1">{calculatorInfo[tool].question}</span></Button>)}</div>
      </TabPanel>)}
    </div>
    <div className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{info.question}</h2><span className="rounded-full bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext0">{settings.tool === 'Swap comparison' ? 'Preview · access only' : settings.tool === 'Play sequence' ? 'Resource ceiling' : settings.tool === 'Level timing' ? 'Supported routes' : standalone ? 'Scenario model' : 'Access only'}</span></div>
      <p className="mt-2 text-sm text-ctp-subtext1">{info.note}</p>
      {!!detailedModels[settings.tool] && !standalone && <div className="mt-4"><Tabs tabs={[{ key: 'quick', label: 'Quick estimate' }, { key: 'model', label: info.model ?? 'Detailed model' }]} active={modelActive ? 'model' : 'quick'} onChange={(view) => setModelViews((current) => ({ ...current, [settings.tool]: view === 'model' }))} baseId="calculator-mode" label="Scenario depth" variant="pill" /><p className="mt-2 text-xs text-ctp-subtext1">Detailed models keep their own timing and scenario inputs. Saved plan roles are shared where supported.</p></div>}
      <div hidden={modelActive} role={detailedModels[settings.tool] && !standalone ? 'tabpanel' : undefined} id="calculator-mode-panel-quick" aria-labelledby={detailedModels[settings.tool] && !standalone ? 'calculator-mode-tab-quick' : undefined}>
      {settings.tool !== 'Next draw' && <ScenarioControls value={scenario} onChange={onScenarioChange} />}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="identity-surface min-w-0 space-y-3 rounded-2xl border border-ctp-surface1 p-4" aria-live="polite" aria-busy={pending}><CalculatorCardContext names={scenarioCards} catalog={catalog} /><ResultEvidence kind={settings.tool === 'Play sequence' || settings.tool === 'Level timing' ? 'modeled' : 'calculated'} basis={settings.tool === 'Next draw' ? knownValid ? `${size - settings.known} cards remaining · ${copies - settings.knownHits} matching copies remaining after recorded removals. No deadline or play-order adjustment.` : 'No next-draw probability is available. Check recorded removals and whether any cards remain in the deck.' : `${size} Main Deck cards · ${opening} opening cards · ${seen} naturally seen by turn ${settings.turn}, going ${settings.order}. ${info.note}`} />{result}{(settings.tool === 'Find cards' || settings.tool === 'Swap comparison') && selected.length > 0 && <AccessTimeline values={Array.from({ length: 8 }, (_, i) => probabilityAtLeast(size, countSelectedCopies(settings.tool === 'Swap comparison' && validSwap ? validSwap : main, selected), Math.min(size, naturalCardsSeenByTurn(i + 1, opening, settings.order)), settings.required))} label={`${selected.join(' / ')} · ${countSelectedCopies(settings.tool === 'Swap comparison' && validSwap ? validSwap : main, selected)} matching copies in ${size} · find ${settings.required}+${settings.tool === 'Swap comparison' && validSwap ? ` · preview: ${settings.quantity} ${settings.out} → ${settings.incoming}` : ''}`} scenario={scenario} onTurnChange={(turn) => onScenarioChange({ ...scenario, turn })} />}{pending && <p className="text-xs text-ctp-subtext0">Recalculating…</p>}</div>
        <InputPanel key={settings.tool} initialOpen={settings.tool === 'Opening hand' || settings.tool === 'Level timing' || settings.tool === 'Play sequence' || settings.tool === 'Next draw' || settings.tool === 'Unwanted draws' || settings.tool === 'Copies needed' || settings.tool === 'Swap comparison' || !selected.length || settings.tool === 'Plan consistency' || settings.tool === 'Pressure access' || settings.tool === 'Recovery access'}>{controls}</InputPanel>
      </div>
      <details className="mt-4 border-t border-ctp-surface1 pt-2"><summary className="flex min-h-12 cursor-pointer items-center justify-between py-3 text-xs text-ctp-subtext0">Calculation assumptions<DisclosureChevron /></summary><p className="text-xs leading-5 text-ctp-subtext0">{settings.tool === 'Next draw' ? 'The next card is drawn uniformly from the remaining deck after your recorded removals. Invalid removals or an empty remaining deck have no result.' : `${size} Main Deck cards · ${opening} opening cards · ${seen} cards seen by turn ${settings.turn}. Natural draws without replacement. No mulligans or extra draw effects.`} {info.note} {settings.tool === 'Opening hand' && 'Ingredient pools must be disjoint so one physical card cannot satisfy both requirements.'} {settings.tool === 'Level timing' && 'Fragmented Spirit inspection uses a fixed depth of 12 cards in this quick estimate.'}</p></details>
      </div>
      <div role={detailedModels[settings.tool] && !standalone ? 'tabpanel' : undefined} id="calculator-mode-panel-model" aria-labelledby={detailedModels[settings.tool] && !standalone ? 'calculator-mode-tab-model' : undefined} hidden={!modelActive}>
        {Object.entries(detailedModels).map(([tool, model]) => <PersistentModel key={tool} active={modelActive && settings.tool === tool}>{model}</PersistentModel>)}
      </div>
      {!saved && <p role="status" className="mt-2 text-xs text-ctp-yellow">Selections could not be saved on this device.</p>}
    </div>
  </section>;
}
function Result({ label, value }: { label: string; value: string }) { return <div><p className={value === "–" ? "text-xl font-semibold text-ctp-subtext1" : "text-4xl font-bold tabular-nums text-ctp-blue sm:text-5xl"}>{value === "–" ? "Choose cards" : value}</p><p className="mt-2 text-sm text-ctp-subtext1">{label}</p></div>; }
function SmallResult({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-ctp-base/50 p-3"><p className="text-lg font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-ctp-subtext0">{label}</p></div>; }
function InputPanel({ initialOpen, children }: { initialOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-xl border border-ctp-surface1 p-3"><summary className="flex min-h-12 cursor-pointer items-center justify-between py-3 text-sm font-medium text-ctp-blue">Change inputs<DisclosureChevron /></summary><div className="grid gap-3">{children}</div></details>;
}

function PersistentModel({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  return <div hidden={!active} className="analysis-model mt-4">{(active || visited) && children}</div>;
}
