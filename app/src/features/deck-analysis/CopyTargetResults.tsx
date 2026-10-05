import { probabilityAtLeast } from '../deckbuilder/synergyReadiness';

export default function CopyTargetResults({ size, seen, required, target, needed, current, hasSelection, turn }: {
  size: number; seen: number; required: number; target: number; needed: number | null;
  current: number; hasSelection: boolean; turn: number;
}) {
  const candidates = [...new Set([
    ...(hasSelection ? [current] : []),
    ...(needed === null ? [size] : [needed - 1, needed, needed + 1]),
  ])].filter((count) => count >= 0 && count <= size).sort((a, b) => a - b);
  return <section aria-label="Matching copies and access" className="space-y-4">
    <div><p className="text-sm text-ctp-subtext1">{target}% target · find {required}+ by turn {turn}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-ctp-blue">{needed === null ? 'Unreachable' : `${needed} copies`}</p>
    </div>
    <p className="text-xs text-ctp-subtext0">Target marker: {target}% · {size}-card deck</p>
    <dl className="space-y-4">{candidates.map((count) => {
      const chance = probabilityAtLeast(size, count, seen, required);
      const selected = hasSelection && count === current;
      const minimum = count === needed;
      return <div key={count} className={`rounded-xl border p-3 ${minimum ? 'border-ctp-blue bg-ctp-blue/5' : 'border-ctp-surface1 bg-ctp-base/50'}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <dt className="font-medium">{count} copies{selected && <span className="ml-2 text-xs text-ctp-subtext1">Selected pool</span>}{minimum && <span className="ml-2 text-xs text-ctp-blue">Target met</span>}</dt>
          <dd className="font-semibold tabular-nums">{(chance * 100).toFixed(1)}%</dd>
        </div>
        <div aria-hidden="true" className="relative mt-3 h-4 rounded bg-ctp-surface0">
          <div className={`h-full rounded transition-[width] duration-200 motion-reduce:transition-none ${minimum ? 'bg-ctp-blue' : 'bg-ctp-mauve'}`} style={{ width: `${chance * 100}%` }} />
          <div className="absolute -top-1 h-6 border-l-2 border-dashed border-ctp-text" style={{ left: `${target}%`, transform: 'translateX(-1px)' }} />
        </div>
      </div>;
    })}</dl>
    {hasSelection && needed !== null && <p className="text-sm font-medium">{current < needed ? `${needed - current} more matching ${needed - current === 1 ? 'copy' : 'copies'} to reach your target` : 'Your selected pool meets the target'}</p>}
  </section>;
}
