import { useId, useState } from "react";
import { calculateDefenseScenario, type Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import Panel from "../../components/ui/Panel";
import { probabilityAtLeast } from "../deckbuilder/synergyReadiness";

type Line = { name: string; quantity: number };
const supported = ["Veiling Breeze", "Crystallized Destiny", "Flourishing Restoration"];
export default function DefenseRecovery({ mainLines, cardsByName }: { mainLines: Line[]; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [wind, setWind] = useState(2);
  const [damage, setDamage] = useState(3);
  const [events, setEvents] = useState(1);
  const [allies, setAllies] = useState(0);
  const [taken, setTaken] = useState(9);
  const grouped = new Map<string, number>();
  for (const line of mainLines) if (line.quantity > 0) grouped.set(line.name, (grouped.get(line.name) ?? 0) + line.quantity);
  const lines = [...grouped].map(([name, quantity]) => ({ name, quantity }));
  const cards = lines.filter(line => supported.includes(line.name));
  if (!cards.length) return null;
  const size = Math.max(60, lines.reduce((sum, line) => sum + line.quantity, 0));
  const result = calculateDefenseScenario(wind, damage, events, allies, taken);
  const has = (name: string) => grouped.has(name);
  const prevention = has(supported[0]) || has(supported[1]);
  const windCards = lines.filter(line => cardsByName.get(line.name)?.elements.includes("WIND"));
  const field = (key: string, label: string, value: number, setter: (value: number) => void, max = 100) => <label htmlFor={`${id}-${key}`} className="block min-w-0 text-xs font-medium">{label}<input id={`${id}-${key}`} type="number" min={0} max={max} step={1} value={value} onChange={event => setter(Math.min(max, Math.max(0, Math.floor(Number(event.target.value) || 0))))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" /></label>;
  return <Panel data-component="DefenseRecovery">
    <h3 className="text-sm font-semibold">Prevention & recovery</h3>
    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(line => <div key={line.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
        <AssociatedCards lines={[line]} cardsByName={cardsByName} label={line.name} />
        <div aria-live="polite" className="mt-3">
          <p className="text-2xl font-semibold">{line.name === supported[0] ? `${result.breezeTotal} prevented` : line.name === supported[1] ? `${result.destinyPrevented} prevented` : `${result.recovered} recovered`}</p>
          <p className="mt-1 text-xs text-ctp-subtext1">{line.name === supported[0] ? `${result.breezePerEvent} per event · this turn` : line.name === supported[1] ? `Next event this turn · ${result.destinyTax ? "opponent activations +2" : "7+ prevented triggers +2 activation cost"}` : `${result.recoveryCapacity} recovery available`}</p>
        </div>
        <p className="mt-3 text-xs text-ctp-subtext1">{Math.round(probabilityAtLeast(size, line.quantity, 10, 1) * 100)}% to find · 10 cards seen</p>
      </div>)}
    </div>
    <h4 className="mt-4 text-xs font-semibold">Scenario · one resolved copy of each card</h4>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {prevention && field("damage", "Incoming damage per event", damage, setDamage)}
      {prevention && field("events", "Damage events this turn", events, setEvents)}
      {has(supported[0]) && field("wind", "Wind cards revealed from memory", wind, setWind)}
      {has(supported[2]) && field("allies", "Opposing allies", allies, setAllies)}
      {has(supported[2]) && field("taken", "Damage already on champion", taken, setTaken)}
    </div>
    {has(supported[0]) && <div className="mt-4"><p className="mb-2 text-xs font-medium">Wind cards in Main · {windCards.reduce((sum, line) => sum + line.quantity, 0)} known copies{lines.some(line => !cardsByName.has(line.name)) ? " · card data incomplete" : ""}</p><AssociatedCards lines={windCards} cardsByName={cardsByName} label="Wind support" /></div>}
  </Panel>;
}
