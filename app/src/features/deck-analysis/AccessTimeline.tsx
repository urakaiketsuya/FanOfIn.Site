import { useState } from 'react';
import Button from '../../components/ui/Button';
import type { PlayOrder } from '../../lib/turnToPlay';

export interface AnalysisScenario { turn: number; order: PlayOrder }
export function ScenarioControls({ value, onChange }: { value: AnalysisScenario; onChange: (value: AnalysisScenario) => void }) {
  const input = 'mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm';
  return <div className="my-4 grid max-w-md grid-cols-2 gap-3"><label className="text-sm">Deadline<select className={input} value={value.turn} onChange={(e) => onChange({ ...value, turn: Number(e.target.value) })}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>Turn {i + 1}</option>)}</select></label><label className="text-sm">Play order<select className={input} value={value.order} onChange={(e) => onChange({ ...value, order: e.target.value as PlayOrder })}><option value="first">Going first</option><option value="second">Going second</option></select></label></div>;
}
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
/** Snapshots store values and their context, never a reference to mutable scenario inputs. */
export default function AccessTimeline({ values, label, scenario, onTurnChange }: { values: number[]; label: string; scenario: AnalysisScenario; onTurnChange: (turn: number) => void }) {
  const [baseline, setBaseline] = useState<{ values: number[]; label: string; order: PlayOrder } | null>(null);
  const current = values[scenario.turn - 1];
  const previous = baseline?.values[scenario.turn - 1];
  return <section className="mt-4 min-w-0 space-y-3" aria-label="Access by turn">
    <h3 className="font-semibold">Access by turn</h3>
    <p className="break-words text-sm">{label} · going {scenario.order}</p>
    <p className="text-xs text-ctp-subtext1">Natural draw odds</p>
    <div className="space-y-1">{values.map((value, index) => <button type="button" key={index} onClick={() => onTurnChange(index + 1)} aria-pressed={scenario.turn === index + 1} aria-label={`Turn ${index + 1}: ${percent(value)}${baseline ? `; saved comparison ${percent(baseline.values[index])}` : ''}`} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-xs focus-visible:outline-2 focus-visible:outline-ctp-blue ${scenario.turn === index + 1 ? 'bg-ctp-blue/10 ring-1 ring-inset ring-ctp-blue' : ''}`}><span className="shrink-0">Turn {index + 1}</span><span aria-hidden="true" className="relative h-5 flex-1 overflow-hidden rounded bg-ctp-surface0"><span className="absolute left-0 top-0 h-3 rounded bg-ctp-blue transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${value * 100}%` }} />{baseline && <span className="absolute bottom-0 left-0 h-1 border-t-2 border-dashed border-ctp-text transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${baseline.values[index] * 100}%` }} />}</span><span className="w-14 text-right tabular-nums">{percent(value)}</span></button>)}</div>
    <p role="status" className="text-sm tabular-nums">Turn {scenario.turn}: {percent(current)}{previous !== undefined && <> · saved {percent(previous)} · {current >= previous ? '+' : ''}{((current - previous) * 100).toFixed(1)} percentage points</>}</p>
    {baseline && <p className="break-words text-xs text-ctp-subtext1">Dashed line: {baseline.label} · going {baseline.order}.</p>}
    <div className="flex flex-wrap gap-2"><Button onClick={() => setBaseline({ values: [...values], label, order: scenario.order })}>{baseline ? 'Update comparison' : 'Save for comparison'}</Button>{baseline && <Button onClick={() => setBaseline(null)}>Clear comparison</Button>}</div>

  </section>;
}
