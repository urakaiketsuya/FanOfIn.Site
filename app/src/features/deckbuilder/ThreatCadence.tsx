import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { computeThreatCadence } from "../../lib/threatCadence";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";

interface Line { name: string; quantity: number }
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ThreatCadence({ mainLines, materialLines, catalogByName }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card> }) {
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

  return <section data-component="ThreatCadence" className="pt-3">
    <div><h3 className="font-semibold text-ctp-text">Threat Cadence</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Choose cards you are willing to spend as threats. The calculator asks whether a fresh copy is available at every deadline in the pressure window.</p></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cards…" aria-label="Filter threat cards" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /><div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-ctp-surface1">{filtered.map((line) => <label key={line.name} className="flex cursor-pointer items-center gap-3 border-b border-ctp-surface0 px-3 py-2 last:border-0"><input type="checkbox" checked={selected.has(line.name)} onChange={() => toggle(line.name)} /><span className="min-w-0 flex-1 truncate text-sm text-ctp-text">{line.name}</span><span className="text-xs tabular-nums text-ctp-subtext0">{line.quantity}×</span></label>)}</div></div>
      <div className="space-y-3"><div className="grid grid-cols-3 gap-2"><Control label="Start" value={startTurn} onChange={(value) => { setStartTurn(value); setEndTurn((current) => Math.max(current, value)); }} /><Control label="End" value={endTurn} onChange={(value) => setEndTurn(Math.max(startTurn, value))} /><label className="text-xs text-ctp-subtext0">Order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text"><option value="first">First</option><option value="second">Second</option></select></label></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Threat pool</p><p className="mt-1 text-2xl font-bold tabular-nums text-ctp-text">{copies} copies</p><p className="text-xs text-ctp-subtext0">{selected.size} card name{selected.size === 1 ? "" : "s"}</p></div>{copies === 0 ? <div className="rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Select the cards that count as threats.</div> : <><div className="grid grid-cols-2 gap-2"><Metric label="Full cadence" value={percent(result.cadenceProbability)} /><Metric label="At least one gap" value={percent(result.gapProbability)} /></div><p className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3 text-xs text-ctp-green">One additional threat copy improves the full-window chance by {(result.additionalCopyGain * 100).toFixed(1)} points.</p></>}</div></div>
    {copies > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{result.checkpoints.map((point) => <div key={point.turn} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex items-center justify-between"><span className="font-semibold text-ctp-text">Turn {point.turn}</span><span className="font-bold tabular-nums text-ctp-mauve">{percent(point.probability)}</span></div><p className="mt-1 text-[10px] text-ctp-subtext0">Need {point.required} threat{point.required === 1 ? "" : "s"} among {point.seen} cards seen</p></div>)}</div>}
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">Exact without-replacement access odds. Each deadline assumes one selected threat is consumed per turn. Costs, activation timing, board state, extra draws, and whether a card is strategically threatening are not modeled.</p>
  </section>;
}

function Control({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-ctp-subtext0">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>T{turn}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{value}</p></div>; }
