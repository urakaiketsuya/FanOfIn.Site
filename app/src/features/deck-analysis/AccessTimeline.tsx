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
    <div role="status" className="flex flex-wrap items-end justify-between gap-2 rounded-xl bg-ctp-blue/10 p-4">
      <div><p className="text-sm text-ctp-subtext1">By turn {scenario.turn}</p><p className="text-4xl font-semibold tabular-nums text-ctp-blue">{percent(current)}</p></div>
      {previous !== undefined && <p className="text-sm tabular-nums">Saved {percent(previous)}<span className="block font-semibold">{current >= previous ? '+' : ''}{((current - previous) * 100).toFixed(1)} percentage points</span></p>}
    </div>
    <svg viewBox="0 0 360 200" className="w-full" role="img" aria-label={`Natural draw odds for ${label}, going ${scenario.order}. By turn ${scenario.turn}: ${percent(current)}. Select a turn below for exact odds.`}>
      {[0, 0.25, 0.5, 0.75, 1].map(value => <g key={value}><line x1="38" x2="344" y1={170 - value * 150} y2={170 - value * 150} className="stroke-ctp-surface1" /><text x="30" y={174 - value * 150} textAnchor="end" className="fill-ctp-subtext1 text-[10px]">{value * 100}%</text></g>)}
      <polygon points={`38,170 ${values.map((value, index) => `${38 + index * 306 / Math.max(1, values.length - 1)},${170 - value * 150}`).join(' ')} 344,170`} className="fill-ctp-blue/10" />
      {baseline && <polyline points={baseline.values.map((value, index) => `${38 + index * 306 / Math.max(1, values.length - 1)},${170 - value * 150}`).join(' ')} fill="none" strokeWidth="2" strokeDasharray="5 4" className="stroke-ctp-text" />}
      <polyline points={values.map((value, index) => `${38 + index * 306 / Math.max(1, values.length - 1)},${170 - value * 150}`).join(' ')} fill="none" strokeWidth="3" strokeLinejoin="round" className="stroke-ctp-blue" />
      {values.map((value, index) => <g key={index}>
        {scenario.turn === index + 1 && <line x1={38 + index * 306 / Math.max(1, values.length - 1)} x2={38 + index * 306 / Math.max(1, values.length - 1)} y1="20" y2="170" strokeDasharray="2 4" className="stroke-ctp-blue" />}
        <circle cx={38 + index * 306 / Math.max(1, values.length - 1)} cy={170 - value * 150} r={scenario.turn === index + 1 ? 6 : 3} strokeWidth="2" className="fill-ctp-base stroke-ctp-blue" />
        <text x={38 + index * 306 / Math.max(1, values.length - 1)} y="190" textAnchor="middle" className="fill-ctp-subtext1 text-[11px]">{index + 1}</text>
      </g>)}
    </svg>
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Select turn">{values.map((value, index) => <button type="button" key={index} onClick={() => onTurnChange(index + 1)} aria-pressed={scenario.turn === index + 1} aria-label={`Turn ${index + 1}: ${percent(value)}${baseline ? `; saved comparison ${percent(baseline.values[index])}` : ''}`} className={`min-h-12 rounded-lg border p-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue transition-colors duration-200 motion-reduce:transition-none ${scenario.turn === index + 1 ? 'border-ctp-blue bg-ctp-blue/10' : 'border-ctp-surface1 hover:bg-ctp-surface0'}`}><span className="block text-ctp-subtext1">Turn {index + 1}</span><span className="block text-sm font-semibold tabular-nums">{percent(value)}</span></button>)}</div>
    {baseline && <p className="break-words text-xs text-ctp-subtext1">Dashed line: {baseline.label} · going {baseline.order}.</p>}
    <div className="flex flex-wrap gap-2"><Button onClick={() => setBaseline({ values: [...values], label, order: scenario.order })}>{baseline ? 'Update comparison' : 'Save for comparison'}</Button>{baseline && <Button onClick={() => setBaseline(null)}>Clear comparison</Button>}</div>

  </section>;
}
