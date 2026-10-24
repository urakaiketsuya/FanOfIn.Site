interface CardsSeenPoint { turn: number; seen: number; adjustedSeen: number; influence: number; hand: number; memory: number }

export default function CardsSeenReport({ points, deckSize, hasExtraDraws }: { points: CardsSeenPoint[]; deckSize: number; hasExtraDraws: boolean }) {
  return <div>
      <div className="mt-4 space-y-4" aria-label="Cards seen by turn">{points.map((point) => <div key={point.turn}>
        <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-sm"><span>Turn {point.turn}</span><strong>Cards seen: {point.adjustedSeen} / {deckSize}</strong></div>
        <div aria-hidden="true" className="flex h-7 overflow-hidden rounded bg-ctp-surface0"><div className="bg-ctp-blue transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${deckSize ? point.seen / deckSize * 100 : 0}%` }} />{hasExtraDraws && <div className="bg-ctp-teal transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${deckSize ? (point.adjustedSeen - point.seen) / deckSize * 100 : 0}%` }} />}</div>
        {hasExtraDraws && <p className="mt-1 text-xs text-ctp-subtext1">Expected total · {point.seen} from natural draws</p>}
        <p className="mt-1 text-xs text-ctp-subtext1">Expected influence: {point.influence.toFixed(1)} cards</p>
        <p className="mt-1 text-xs text-ctp-subtext1">{point.hand.toFixed(1)} in hand + {point.memory.toFixed(1)} in memory</p>
      </div>)}</div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs"><span>Blue · natural draws</span>{hasExtraDraws && <span>Teal · estimated extra draws</span>}</div>
  </div>;
}
