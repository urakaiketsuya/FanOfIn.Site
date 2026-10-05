import type { ReservePressureTurn } from '../deckbuilder/reserveSequence';

export default function SequenceResources({ pressure }: { pressure: ReservePressureTurn[] }) {
  const maximum = Math.max(1, ...pressure.flatMap((point) => [point.cardsNeeded, point.handCeiling]));
  return (
    <section aria-label="Resources by turn" className="space-y-3">
      <h3 className="text-sm font-semibold">Resources by turn</h3>
      <ol className="space-y-3">
        {pressure.map((point) => (
          <li key={point.turn} className="rounded-xl bg-ctp-base/50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
              <span>Turn {point.turn}</span>
              <span className={point.margin < 0 ? 'text-ctp-red' : 'text-ctp-text'}>
                {point.margin < 0 ? `${Math.abs(point.margin)} ${point.margin === -1 ? 'card' : 'cards'} short` : point.margin === 0 ? 'Exact fit' : `${point.margin} ${point.margin === 1 ? 'card' : 'cards'} spare`}
              </span>
            </div>
            <p className="mt-1 break-words text-xs text-ctp-subtext1">{point.cards.join(' + ')}</p>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Cards needed', value: point.cardsNeeded, color: point.margin < 0 ? 'bg-ctp-red' : 'bg-ctp-blue' },
                { label: 'Hand ceiling', value: point.handCeiling, color: 'bg-ctp-overlay1' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between gap-2 text-xs"><span>{row.label}</span><span className="font-semibold tabular-nums">{row.value}</span></div>
                  <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-ctp-surface0">
                    <div className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${row.color}`} style={{ width: `${Math.max(0, row.value) / maximum * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ctp-subtext0">{point.cards.length} to play + {point.reserveCost} Reserve</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
