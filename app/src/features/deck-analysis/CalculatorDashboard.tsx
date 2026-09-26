import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import type { Card } from '@gatcg/shared';
import { computeLevelGoalAnalysis } from '../../lib/levelGoal';
import { computeReserveSequence, type ReserveSequenceStep } from '../deckbuilder/reserveSequence';
import type { AnalysisPlan } from '../../lib/analysisProfile';
import { naturalCardsSeenByTurn, type PlayOrder } from '../../lib/turnToPlay';
import { probabilityAtLeast } from '../deckbuilder/synergyReadiness';
import { countSelectedCopies, minimumCopies, nextDrawOdds, previewCalculatorSwap, selectedRecipeOdds, type CalculatorLine } from '../../lib/calculatorDashboard';

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text';
const tools = ['Find cards', 'Opening hand', 'Plan consistency', 'Copies needed', 'Swap comparison', 'Unwanted draws', 'Pressure access', 'Recovery access', 'Next draw', 'Level timing', 'Play sequence'] as const;
type Tool = typeof tools[number];
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
    if (Array.isArray(raw.steps)) result.steps = raw.steps.slice(0, 4).filter((step: ReserveSequenceStep) => step && typeof step.name === 'string' && Number.isInteger(step.turn) && step.turn >= 1 && step.turn <= 8 && Number.isInteger(step.effectiveReserveCost) && step.effectiveReserveCost! >= 0 && step.effectiveReserveCost! <= 99);
    return result;
  } catch { return defaults; }
}
const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;

export default function CalculatorDashboard({ main, sideboard, material, catalog, opening, plan, storageKey, onEditPlan }: { main: CalculatorLine[]; sideboard: CalculatorLine[]; material: CalculatorLine[]; catalog: Map<string, Card>; opening: number; plan: AnalysisPlan | null; storageKey: string; onEditPlan: () => void }) {
  const key = `fanofin:calculator-dashboard:v1:${storageKey}`;
  const [settings, setSettings] = useState(() => readSettings(key));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(settings)); setSaved(true); } catch { setSaved(false); } }, [key, settings]);
  const update = (patch: Partial<Settings>) => startTransition(() => setSettings((current) => ({ ...current, ...patch })));
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
  const pool = (label: string, field: 'selected' | 'unwanted') => <CardPool label={label} lines={poolLines} selected={settings[field]} onChange={(value) => update({ [field]: value })} />;
  const editPlan = <button type="button" onClick={onEditPlan} className="min-h-11 text-sm font-medium text-ctp-blue">Choose plan cards →</button>;
  const levelAnalysis = useMemo(() => settings.tool === 'Level timing' ? computeLevelGoalAnalysis(main, material, catalog, { targetLevel: settings.level, targetTurn: settings.turn, playOrder: settings.order, useDirectLevelUp: true, useFractalPayment: true, fragmentedSpiritDepth: 12 }) : null, [main, material, catalog, settings.tool, settings.level, settings.turn, settings.order]);
  const validSteps = settings.steps.filter((step) => names.has(step.name) && catalog.get(step.name)?.cost.type === 'reserve');
  const sequence = useMemo(() => settings.tool === 'Play sequence' ? computeReserveSequence(main, catalog, settings.steps.filter((step) => main.some((line) => line.name === step.name) && catalog.get(step.name)?.cost.type === 'reserve'), opening + (settings.order === 'second' ? 1 : 0)) : null, [main, catalog, settings.tool, settings.steps, settings.order, opening]);
  let result: ReactNode;
  let controls: ReactNode;
  switch (settings.tool) {
    case 'Level timing': {
      const best = levelAnalysis?.routes.filter((route) => route.id !== 'fractal' && route.probability !== null).sort((a, b) => b.probability! - a.probability!)[0];
      result = <><Result label={`Level ${settings.level} route access ${checkpoint}`} value={percent(best?.probability ?? null)} /><SmallResult label="Natural schedule" value={`Turn ${levelAnalysis?.naturalTurn ?? '—'}`} /></>;
      controls = <>{numberInput('Target level', 'level', 2, 6)}{best?.bottleneck && <p className="text-xs text-ctp-yellow">{best.bottleneck}</p>}</>;
      break;
    }
    case 'Play sequence':
      result = <><Result label="Drawn on time · within hand ceiling" value={percent(validSteps.length ? sequence?.playableProbability ?? null : null)} /><SmallResult label="Drawn by deadlines" value={percent(validSteps.length ? sequence?.probability ?? null : null)} /><span className="text-xs text-ctp-subtext0">Resource ceiling</span></>;
      controls = <><label className="text-xs text-ctp-subtext0">Add a play<select value="" disabled={validSteps.length >= 4} onChange={(event) => { if (event.target.value) update({ steps: [...validSteps, { name: event.target.value, turn: settings.turn, effectiveReserveCost: Math.max(0, catalog.get(event.target.value)?.cost_reserve ?? 0) }] }); }} className={inputClass}><option value="">Choose card</option>{main.filter((line) => catalog.get(line.name)?.cost.type === 'reserve').map((line) => <option key={line.name}>{line.name}</option>)}</select></label>{validSteps.map((step, index) => <div key={index} className="rounded-lg border border-ctp-surface1 p-3"><p className="text-sm">{step.name}</p><div className="grid grid-cols-2 gap-2"><label className="text-xs text-ctp-subtext0">Turn<input type="number" min={1} max={8} value={step.turn} onChange={(event) => update({ steps: validSteps.map((item, i) => i === index ? { ...item, turn: Math.min(8, Math.max(1, Math.floor(Number(event.target.value) || 1))) } : item) })} className={inputClass} /></label><label className="text-xs text-ctp-subtext0">Effective Reserve<input type="number" min={0} max={99} value={step.effectiveReserveCost} onChange={(event) => update({ steps: validSteps.map((item, i) => i === index ? { ...item, effectiveReserveCost: Math.min(99, Math.max(0, Math.floor(Number(event.target.value) || 0))) } : item) })} className={inputClass} /></label></div><button type="button" onClick={() => update({ steps: validSteps.filter((_, i) => i !== index) })} className="min-h-11 text-xs text-ctp-blue">Remove</button></div>)}</>;
      break;
    case 'Opening hand':
      result = <><Result label="Opening recipe access" value={percent(recipeReady ? selectedRecipeOdds(main, recipeGroups, Math.min(opening, size)) : null)} /><SmallResult label={`Recipe access ${checkpoint}`} value={percent(recipeReady ? selectedRecipeOdds(main, recipeGroups, seen) : null)} /></>;
      controls = <>{recipeGroups.map((group, index) => <CardPool key={index} label={`${index === 0 ? 'First' : 'Second'} ingredient · any one`} lines={main} selected={group} onChange={(value) => update({ customRecipe: true, firstIngredient: index === 0 ? value : recipeGroups[0], secondIngredient: index === 1 ? value : recipeGroups[1] })} />)}{recipeGroups[0].some((name) => recipeGroups[1].includes(name)) && <p role="alert" className="text-sm text-ctp-yellow">Assign each card to one ingredient.</p>}</>;
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
      result = <><Result label={`${selected.length ? selected.join(" / ") + " · " : ""}Find ${settings.required}+ ${checkpoint}`} value={percent(oddsAt(seen))} /><div className="grid grid-cols-2 gap-3"><SmallResult label="Opening hand" value={percent(oddsAt(opening))} /><SmallResult label={`Reach ${settings.target}%`} value={!selected.length ? '—' : targetTurn ? `Turn ${targetTurn}` : 'Not reached by turn 8'} /></div></>;
      controls = <>{pool('Cards to find · any matching copy', 'selected')}{numberInput('Copies to find', 'required', 1, 20)}{numberInput('Target chance (%)', 'target', 1, 100)}</>;
  }
  return <section className="mt-4" aria-label="Deck calculators">
    <label className="block text-xs text-ctp-subtext0 md:hidden">Calculator<select value={settings.tool} onChange={(event) => update({ tool: event.target.value as Tool })} className={inputClass}>{tools.map((tool) => <option key={tool}>{tool}</option>)}</select></label>
    <div className="hidden flex-wrap gap-2 md:flex" aria-label="Choose calculator">{tools.map((tool) => <button key={tool} type="button" aria-pressed={settings.tool === tool} onClick={() => update({ tool })} className={`min-h-11 rounded-lg border px-3 text-sm ${settings.tool === tool ? 'border-ctp-blue bg-ctp-blue text-ctp-base' : 'border-ctp-surface1 bg-ctp-mantle text-ctp-subtext1'}`}>{tool}</button>)}</div>
    <div className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{settings.tool}</h2><span className="rounded-full bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext0">{settings.tool === 'Swap comparison' ? 'Preview · access only' : settings.tool === 'Play sequence' ? 'Resource ceiling' : settings.tool === 'Level timing' ? 'Supported routes' : 'Access only'}</span></div>
      {settings.tool !== 'Next draw' && <div className="my-4 grid max-w-md grid-cols-2 gap-3"><label className="text-xs text-ctp-subtext0">Deadline<select value={settings.turn} onChange={(event) => update({ turn: Number(event.target.value) })} className={inputClass}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>Turn {i + 1}</option>)}</select></label><label className="text-xs text-ctp-subtext0">Play order<select value={settings.order} onChange={(event) => update({ order: event.target.value as PlayOrder })} className={inputClass}><option value="first">Going first</option><option value="second">Going second</option></select></label></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="sticky top-2 z-10 space-y-3 rounded-xl bg-ctp-mantle py-3" aria-live="polite" aria-busy={pending}>{result}{pending && <p className="text-xs text-ctp-subtext0">Recalculating…</p>}</div>
        <InputPanel key={settings.tool} initialOpen={settings.tool === 'Opening hand' || settings.tool === 'Level timing' || settings.tool === 'Play sequence' || settings.tool === 'Next draw' || settings.tool === 'Unwanted draws' || settings.tool === 'Copies needed' || settings.tool === 'Swap comparison' || !selected.length || settings.tool === 'Plan consistency' || settings.tool === 'Pressure access' || settings.tool === 'Recovery access'}>{controls}</InputPanel>
      </div>
      <details className="mt-4 border-t border-ctp-surface1 pt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs text-ctp-subtext0">Details</summary><p className="text-xs leading-5 text-ctp-subtext0">{size} Main Deck cards · {opening} opening cards · {seen} cards seen by turn {settings.turn}. Natural draws, without replacement; no mulligans or extra draw effects. Results measure card access, not successful plays. Opening recipes require one card from each of two disjoint groups. Copies needed holds deck size fixed and counts interchangeable cards; it does not enforce per-card deck limits. Swap results keep existing plan assignments and do not edit the deck or validate deck legality. Level timing uses the strongest supported route, not the union of routes. Play sequence subtracts earlier selected plays and uses entered effective costs, with no other spending or Floating Memory relief. Next draw uses only the cards you record as removed from the shuffled deck.</p></details>
      {!saved && <p role="status" className="mt-2 text-xs text-ctp-yellow">Selections could not be saved on this device.</p>}
    </div>
  </section>;
}
function Result({ label, value }: { label: string; value: string }) { return <div><p className={value === "—" ? "text-xl font-semibold text-ctp-subtext1" : "text-4xl font-bold tabular-nums text-ctp-blue sm:text-5xl"}>{value === "—" ? "Choose cards" : value}</p><p className="mt-2 text-sm text-ctp-subtext1">{label}</p></div>; }
function SmallResult({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-ctp-base/50 p-3"><p className="text-lg font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-ctp-subtext0">{label}</p></div>; }
function CardPool({ label, lines, selected, onChange }: { label: string; lines: CalculatorLine[]; selected: string[]; onChange: (value: string[]) => void }) {
  const [query, setQuery] = useState('');
  return <fieldset><legend className="text-xs font-medium text-ctp-subtext1">{label}</legend><input type="search" aria-label={`Search ${label}`} placeholder="Filter cards…" value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} /><div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-ctp-surface1">{lines.filter((line) => line.name.toLowerCase().includes(query.toLowerCase())).map((line) => <label key={line.name} className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-ctp-surface0 px-3 text-sm last:border-0"><input type="checkbox" checked={selected.includes(line.name)} onChange={(event) => onChange(event.target.checked ? [...selected, line.name] : selected.filter((name) => name !== line.name))} /><span className="flex-1">{line.name}</span><span className="text-ctp-subtext0">{line.quantity}×</span></label>)}</div><p className="mt-1 text-xs text-ctp-subtext0">{countSelectedCopies(lines, selected)} matching copies</p></fieldset>;
}

function InputPanel({ initialOpen, children }: { initialOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-xl border border-ctp-surface1 p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-ctp-blue">Change inputs</summary><div className="grid gap-3">{children}</div></details>;
}
