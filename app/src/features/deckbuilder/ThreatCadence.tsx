import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import type { GamePlanRole } from "../../lib/gamePlanReadiness";
import { computeThreatCadence } from "../../lib/threatCadence";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";

interface Line { name: string; quantity: number }
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ThreatCadence({ mainLines, materialLines, catalogByName, sharedAssignments = {} }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card>; sharedAssignments?: Record<string, GamePlanRole | ""> }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [startTurn, setStartTurn] = useState(2);
  const [endTurn, setEndTurn] = useState(4);
  const [playOrder, setPlayOrder] = useState<PlayOrder>("first");
  const [query, setQuery] = useState("");
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const copies = mainLines.filter((line) => selected.has(line.name)).reduce((sum, line) => sum + line.quantity, 0);
  const opening = inferStartingHandSize(materialLines, catalogByName);
  const result = computeThreatCadence(deckSize, copies, opening, startTurn, endTurn, playOrder);
  const filtered = useMemo(() => mainLines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase())), [mainLines, query]);
  function toggle(name: string) { setSelected((current) => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next; }); }

  const preparedPayoffs = mainLines.filter((line) => sharedAssignments[line.name] === "payoff").map((line) => line.name);
  return <section data-component="ThreatCadence" className="pt-3">
    <div><h3 className="font-semibold text-ctp-text">Pressure Continuity</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">How often will you draw enough primary plays to present one on every turn in a chosen window?</p></div>
    <div className="mt-3 rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-xs leading-5 text-ctp-subtext1"><strong className="text-ctp-text">Count a card when</strong> you would be happy for it to be your main proactive play that turn. This is not about interaction or cards you do not mind wasting.</div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><div>
      <div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter primary plays…" aria-label="Filter primary plays" className="min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" />{preparedPayoffs.length > 0 && <button type="button" onClick={() => setSelected(new Set(preparedPayoffs))} className="min-h-11 shrink-0 rounded-lg border border-ctp-blue/50 px-3 text-sm font-medium text-ctp-blue hover:bg-ctp-blue/10">Use prepared payoffs</button>}</div>
      <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">{filtered.map((line) => { const card = catalogByName.get(line.name); return <label key={line.name} className={`grid min-h-16 cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-2 transition-colors ${selected.has(line.name) ? "border-ctp-blue/60 bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-mantle hover:bg-ctp-surface0/40"}`}>
        {card?.editions[0] ? <CardImage image={card.editions[0].image} alt="" className="h-12 w-9 rounded object-cover object-top" /> : <span className="h-12 w-9 rounded bg-ctp-surface0" />}
        <span className="min-w-0"><span className="block truncate text-sm font-medium text-ctp-text">{line.name}</span><span className="text-xs tabular-nums text-ctp-subtext0">{line.quantity} cop{line.quantity === 1 ? "y" : "ies"}</span></span><input type="checkbox" checked={selected.has(line.name)} onChange={() => toggle(line.name)} aria-label={`Count ${line.name} as a primary play`} className="h-5 w-5" />
      </label>; })}</div></div>
      <div className="space-y-3"><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"><Control label="Pressure starts" value={startTurn} onChange={(value) => { setStartTurn(value); setEndTurn((current) => Math.max(current, value)); }} /><Control label="Pressure ends" value={endTurn} onChange={(value) => setEndTurn(Math.max(startTurn, value))} /><label className="text-xs text-ctp-subtext0">Play order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text"><option value="first">Going first</option><option value="second">Going second</option></select></label></div><div className="rounded-xl border border-ctp-surface1 bg-ctp-base/40 p-3"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Primary-play pool</p><p className="mt-1 text-2xl font-bold tabular-nums text-ctp-text">{copies} copies</p><p className="text-xs text-ctp-subtext0">across {selected.size} card name{selected.size === 1 ? "" : "s"}</p></div>{copies === 0 ? <div className="rounded-xl border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Choose the cards you want available as your main play.</div> : <><div className="grid grid-cols-2 gap-2"><Metric label="Every turn" value={percent(result.cadenceProbability)} /><Metric label="One or more gaps" value={percent(result.gapProbability)} /></div><p className="rounded-xl border border-ctp-surface1 bg-ctp-base/35 p-3 text-xs text-ctp-green">One additional primary-play copy improves full-window access by {(result.additionalCopyGain * 100).toFixed(1)} points.</p></>}</div></div>
    {copies > 0 && <details className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-base/25"><summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-medium text-ctp-text">Inspect each turn</summary><div className="grid gap-2 border-t border-ctp-surface1 p-3 sm:grid-cols-2 lg:grid-cols-4">{result.checkpoints.map((point) => <div key={point.turn} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex items-center justify-between"><span className="font-semibold text-ctp-text">Turn {point.turn}</span><span className="font-bold tabular-nums text-ctp-mauve">{percent(point.probability)}</span></div><p className="mt-1 text-[10px] text-ctp-subtext0">Draw at least {point.required} selected card{point.required === 1 ? "" : "s"} among {point.seen} cards seen</p></div>)}</div></details>}
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">Exact without-replacement draw odds. One selected card is consumed at each deadline. This measures access only; it does not prove the cards are affordable or playable, and it does not model cost reductions, activation timing, board state, extra draws, or opponent responses.</p>
  </section>;
}

function Control({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-ctp-subtext0">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>Turn {turn}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{value}</p></div>; }
