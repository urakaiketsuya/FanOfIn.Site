import type { ChampionSeasonPerformance } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";

const WIDTH = 720;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 52, bottom: 58, left: 48 };

function points(values: number[], max: number): string {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  return values
    .map((value, index) => {
      const x = MARGIN.left + (values.length === 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth);
      const y = MARGIN.top + plotHeight - (value / max) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function shortSeasonName(name: string): string {
  const words = name.split(/\s+/);
  if (name.length <= 15) return name;
  return words.map((word, index) => (index === 0 ? word : `${word.charAt(0)}.`)).join(" ");
}

export default function ChampionSeasonChart({ seasons }: { seasons: ChampionSeasonPerformance[] }) {
  if (seasons.length < 2) return null;

  const shareValues = seasons.map((season) => season.shareOfSeason * 100);
  const winRateValues = seasons.map((season) => season.avgWinRate * 100);
  const shareMax = Math.max(5, Math.ceil(Math.max(...shareValues) / 5) * 5);
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) => MARGIN.left + (index / (seasons.length - 1)) * plotWidth;
  const shareY = (value: number) => MARGIN.top + plotHeight - (value / shareMax) * plotHeight;
  const winY = (value: number) => MARGIN.top + plotHeight - (value / 100) * plotHeight;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <Panel as="figure" padding="sm" className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ctp-subtext1">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ctp-blue" />Meta share</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ctp-mauve" />Win rate</span>
        <span className="ml-auto text-ctp-subtext0">Hover a point for season details</span>
      </div>
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[40rem]" role="img" aria-label="Champion metagame share and win rate by season">
        {ticks.map((tick) => {
          const y = MARGIN.top + plotHeight - tick * plotHeight;
          return (
            <g key={tick}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} stroke="var(--color-ctp-surface1)" strokeWidth="1" />
              <text x={MARGIN.left - 8} y={y + 4} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{Math.round(tick * shareMax)}%</text>
              <text x={WIDTH - MARGIN.right + 8} y={y + 4} textAnchor="start" className="fill-ctp-subtext0 text-[10px]">{Math.round(tick * 100)}%</text>
            </g>
          );
        })}
        <polyline points={points(shareValues, shareMax)} fill="none" stroke="var(--color-ctp-blue)" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={points(winRateValues, 100)} fill="none" stroke="var(--color-ctp-mauve)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 4" />
        {seasons.map((season, index) => (
          <g key={season.seasonId}>
            <circle cx={x(index)} cy={shareY(shareValues[index])} r="5" fill="var(--color-ctp-blue)" stroke="var(--color-ctp-mantle)" strokeWidth="2">
              <title>{`${season.seasonName}: ${shareValues[index].toFixed(1)}% share, ${winRateValues[index].toFixed(0)}% win rate, ${season.deckCount.toLocaleString()} decks, ${season.topCutCount.toLocaleString()} top cuts`}</title>
            </circle>
            <circle cx={x(index)} cy={winY(winRateValues[index])} r="4" fill="var(--color-ctp-mauve)" stroke="var(--color-ctp-mantle)" strokeWidth="2">
              <title>{`${season.seasonName}: ${winRateValues[index].toFixed(0)}% win rate over ${season.deckCount.toLocaleString()} decks`}</title>
            </circle>
            <text x={x(index)} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle" className="fill-ctp-subtext0 text-[10px]">
              <title>{season.seasonName}</title>
              {shortSeasonName(season.seasonName)}
            </text>
          </g>
        ))}
        <text x="12" y={MARGIN.top + plotHeight / 2} transform={`rotate(-90 12 ${MARGIN.top + plotHeight / 2})`} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Meta share</text>
        <text x={WIDTH - 10} y={MARGIN.top + plotHeight / 2} transform={`rotate(90 ${WIDTH - 10} ${MARGIN.top + plotHeight / 2})`} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Win rate</text>
      </svg>
      </div>
    </Panel>
  );
}
