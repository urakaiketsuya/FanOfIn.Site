export interface GoalForecastSeries {
  label: string;
  color: string;
  values: (number | null)[];
}

export default function GoalForecastChart({ title, subtitle, turns, series }: {
  title: string;
  subtitle: string;
  turns: number[];
  series: GoalForecastSeries[];
}) {
  const width = 720;
  const height = 230;
  const left = 42;
  const right = 14;
  const top = 15;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (turns.length <= 1 ? 0 : index * plotWidth / (turns.length - 1));
  const y = (value: number) => top + (1 - Math.min(1, Math.max(0, value))) * plotHeight;
  const summary = series.map((item) => `${item.label}: ${item.values.map((value, index) => value === null ? `turn ${turns[index]} unavailable` : `${Math.round(value * 100)}% on turn ${turns[index]}`).join(", ")}`).join(". ");

  return <figure className="rounded-xl border border-ctp-surface1 bg-ctp-mantle/60 p-4">
    <figcaption>
      <h2 className="font-semibold text-ctp-text">{title}</h2>
      <p className="mt-1 text-xs text-ctp-subtext0">{subtitle}</p>
    </figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label={`${title}. ${summary}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((value) => <g key={value}>
        <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="stroke-ctp-surface1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <text x={left - 8} y={y(value) + 4} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{Math.round(value * 100)}%</text>
      </g>)}
      {turns.map((turn, index) => <text key={turn} x={x(index)} y={height - 7} textAnchor="middle" className="fill-ctp-subtext0 text-[10px]">T{turn}</text>)}
      {series.map((item) => {
        const points = item.values.map((value, index) => value === null ? null : `${x(index)},${y(value)}`).filter(Boolean).join(" ");
        return <g key={item.label}>
          <polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {item.values.map((value, index) => value === null ? null : <circle key={turns[index]} cx={x(index)} cy={y(value)} r="4" fill={item.color} className="stroke-ctp-mantle" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
        </g>;
      })}
    </svg>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{series.map((item) => <span key={item.label} className="flex items-center gap-1.5 text-xs text-ctp-subtext1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>
  </figure>;
}
