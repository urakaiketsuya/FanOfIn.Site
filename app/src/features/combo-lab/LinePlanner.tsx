import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";

type LineState = {
  targetTurn: number;
  targetLevel: number;
  damage: number;
  fireInGraveyard: number;
  animalOrBeast: number;
  steps: string[];
  requiredMaterial: string[];
};

const DEFAULT_STATE: LineState = {
  targetTurn: 5,
  targetLevel: 6,
  damage: 20,
  fireInGraveyard: 5,
  animalOrBeast: 2,
  steps: [],
  requiredMaterial: [],
};

function countAnimalOrBeast(mainLines: { name: string; quantity: number }[], catalogByName: Map<string, Card>) {
  return mainLines.reduce((total, line) => {
    const subtypes = catalogByName.get(line.name)?.subtypes ?? [];
    return total + (subtypes.some((subtype) => subtype === "ANIMAL" || subtype === "BEAST") ? line.quantity : 0);
  }, 0);
}

/** Captures the game state a probability recipe deliberately cannot prove. This is a planning aid,
 * not a rules engine: access is calculated by the recipe above, while zones and sequencing remain
 * explicit checks for the player to verify in Goldfish. */
export default function LinePlanner({
  mainLines,
  materialLines,
  catalogByName,
  effectiveCosts,
}: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  effectiveCosts: Record<string, number>;
}) {
  const [plan, setPlan] = useState<LineState>(DEFAULT_STATE);
  const mainNames = useMemo(() => mainLines.map((line) => line.name), [mainLines]);
  const materialNames = useMemo(() => materialLines.map((line) => line.name), [materialLines]);
  const animalOrBeastSources = useMemo(() => countAnimalOrBeast(mainLines, catalogByName), [mainLines, catalogByName]);
  const plannedReserve = useMemo(() => plan.steps.reduce((total, name) => total + (effectiveCosts[name] ?? catalogByName.get(name)?.cost_reserve ?? 0), 0), [plan.steps, effectiveCosts, catalogByName]);
  const unavailableSteps = plan.steps.filter((name) => !mainNames.includes(name) && !materialNames.includes(name));
  const duplicateStep = plan.steps.some((name, index) => plan.steps.indexOf(name) !== index);

  function setNumber(key: Exclude<keyof LineState, "steps" | "requiredMaterial">, value: number) {
    setPlan((current) => ({ ...current, [key]: Math.max(0, Math.round(value) || 0) }));
  }

  function addStep(name: string) {
    if (!name) return;
    setPlan((current) => ({ ...current, steps: [...current.steps, name] }));
  }

  function toggleMaterial(name: string) {
    setPlan((current) => ({ ...current, requiredMaterial: current.requiredMaterial.includes(name) ? current.requiredMaterial.filter((entry) => entry !== name) : [...current.requiredMaterial, name] }));
  }

  return <Panel className="mt-4" data-component="LinePlanner">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ctp-text">Line planner</h2>
        <p className="mt-1 text-xs leading-5 text-ctp-subtext1">Describe the state and ordered plays that turn card access into a win. Access odds above remain exact; these conditions are explicit Goldfish checks.</p>
      </div>
      <span className="rounded-full bg-ctp-mauve/10 px-2.5 py-1 text-xs font-semibold text-ctp-mauve">Manual state checks</span>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <NumberField label="Win by turn" value={plan.targetTurn} min={1} max={20} onChange={(value) => setNumber("targetTurn", value)} />
      <NumberField label="Champion level" value={plan.targetLevel} min={1} max={20} onChange={(value) => setNumber("targetLevel", value)} />
      <NumberField label="Planned damage" value={plan.damage} min={0} max={999} onChange={(value) => setNumber("damage", value)} />
      <NumberField label="Fire cards in graveyard" value={plan.fireInGraveyard} min={0} max={60} onChange={(value) => setNumber("fireInGraveyard", value)} />
      <NumberField label="Animal / Beast bodies" value={plan.animalOrBeast} min={0} max={20} onChange={(value) => setNumber("animalOrBeast", value)} />
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-ctp-surface1 bg-ctp-base/35 p-3">
        <h3 className="text-sm font-semibold text-ctp-text">Ordered plays</h3>
        <p className="mt-1 text-xs text-ctp-subtext0">Repeat a card when an effect lets you play it again; this is intentional for replay lines.</p>
        <label className="mt-3 block text-xs text-ctp-subtext0">Add a play
          <select defaultValue="" onChange={(event) => { addStep(event.target.value); event.target.value = ""; }} className="mt-1 block min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text">
            <option value="">Choose a main or material card…</option>
            {[...mainNames, ...materialNames.filter((name) => !mainNames.includes(name))].map((name) => <option key={name} value={name}>{name} · R{effectiveCosts[name] ?? catalogByName.get(name)?.cost_reserve ?? 0}</option>)}
          </select>
        </label>
        {plan.steps.length === 0 ? <p className="mt-3 text-sm text-ctp-subtext1">Add the sequence you intend to execute.</p> : <ol className="mt-3 space-y-2">{plan.steps.map((name, index) => <li key={`${name}-${index}`} className="flex min-h-12 items-center gap-2 rounded-lg bg-ctp-mantle px-3 text-sm"><span className="w-5 shrink-0 font-semibold text-ctp-mauve">{index + 1}</span><span className="min-w-0 flex-1 truncate text-ctp-text">{name}</span><span className="text-xs tabular-nums text-ctp-subtext0">R{effectiveCosts[name] ?? catalogByName.get(name)?.cost_reserve ?? 0}</span><button type="button" onClick={() => setPlan((current) => ({ ...current, steps: current.steps.filter((_, stepIndex) => stepIndex !== index) }))} className="min-h-11 px-2 text-xs font-semibold text-ctp-red">Remove</button></li>)}</ol>}
        <p className="mt-3 text-xs text-ctp-subtext1">Planned listed cost: <b className="text-ctp-text">{plannedReserve} Reserve</b>. Confirm timing, reductions, and shared resource use in Goldfish.</p>
      </section>

      <section className="rounded-xl border border-ctp-surface1 bg-ctp-base/35 p-3">
        <h3 className="text-sm font-semibold text-ctp-text">Required material</h3>
        <p className="mt-1 text-xs text-ctp-subtext0">Mark material cards that must be materialized or remain available for the line.</p>
        <div className="mt-3 grid gap-1.5">{materialNames.map((name) => <label key={name} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm text-ctp-text hover:bg-ctp-mantle"><input type="checkbox" checked={plan.requiredMaterial.includes(name)} onChange={() => toggleMaterial(name)} className="size-4 accent-ctp-mauve" /><span>{name}</span></label>)}</div>
      </section>
    </div>

    <div className="mt-4 rounded-xl border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">
      <p><b className="text-ctp-text">Preflight:</b> aim for level {plan.targetLevel}, {plan.damage} damage, {plan.fireInGraveyard} Fire cards in graveyard, and {plan.animalOrBeast} Animal/Beast bodies by turn {plan.targetTurn}.</p>
      <p className="mt-1">Your deck contains {animalOrBeastSources} Animal/Beast-card sources. {plan.requiredMaterial.length ? `Material check: ${plan.requiredMaterial.join(", ")}.` : "No material requirement selected yet."}</p>
      {duplicateStep && <p className="mt-2 text-ctp-yellow">A repeated play is listed. Verify the replay or recursion effect and its additional cost.</p>}
      {unavailableSteps.length > 0 && <p className="mt-2 text-ctp-red">Not in the loaded deck: {unavailableSteps.join(", ")}.</p>}
    </div>
  </Panel>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="text-xs text-ctp-subtext0">{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" /></label>;
}
