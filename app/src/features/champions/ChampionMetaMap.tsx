import { Link } from "react-router-dom";
import type { ArchetypeSummary, ChampionTrend } from "@gatcg/shared";
import Surface from "../../components/ui/Surface";
import { championNameToSlug } from "../../lib/championSlug";

const WIDTH = 720;
const HEIGHT = 390;
const MARGIN = { top: 22, right: 24, bottom: 48, left: 58 };

export default function ChampionMetaMap({ champions, trends }: { champions: ArchetypeSummary[]; trends: ChampionTrend[] }) {
  const trendByName = new Map(trends.map((trend) => [trend.championName, trend]));
  const points = champions.flatMap((champion) => {
    const latest = trendByName.get(champion.signature)?.seasons.at(-1);
    return latest && latest.deckCount >= 200 ? [{ champion, latest }] : [];
  });
  if (points.length < 2) return null;

  const shares = points.map((point) => point.latest.shareOfSeason * 100);
  const rates = points.map((point) => point.latest.avgWinRate * 100);
  const maxShare = Math.max(5, Math.ceil(Math.max(...shares) / 5) * 5);
  const minRate = Math.floor((Math.min(45, ...rates) - 2) / 5) * 5;
  const maxRate = Math.ceil((Math.max(55, ...rates) + 2) / 5) * 5;
  const maxDecks = Math.max(...points.map((point) => point.latest.deckCount));
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (share: number) => MARGIN.left + (share / maxShare) * plotWidth;
  const y = (rate: number) => MARGIN.top + plotHeight - ((rate - minRate) / (maxRate - minRate)) * plotHeight;
  const radius = (decks: number) => 4 + Math.sqrt(decks / maxDecks) * 11;
  const labeled = new Set([...points].sort((a, b) => b.latest.deckCount - a.latest.deckCount).slice(0, 12).map((p) => p.champion.signature));
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = Array.from({ length: Math.floor((maxRate - minRate) / 5) + 1 }, (_, index) => minRate + index * 5);

  return (
    <Surface data-component="ChampionMetaMap" as="figure" className="mt-6 p-3">
      <figcaption>
        <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Current metagame map</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">Further right means more popular; higher means a stronger current-season win rate. Bubble size represents deck count; Champions below 200 decks are omitted.</p>
      </figcaption>
      <div className="mt-2 overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[40rem]" role="img" aria-label="Champion metagame share versus win rate">
        {xTicks.map((tick) => {
          const px = MARGIN.left + tick * plotWidth;
          return <g key={tick}><line x1={px} x2={px} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke="var(--color-ctp-surface1)" /><text x={px} y={HEIGHT - 20} textAnchor="middle" className="fill-ctp-subtext0 text-[10px]">{Math.round(tick * maxShare)}%</text></g>;
        })}
        {yTicks.map((tick) => <g key={tick}><line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-ctp-surface1)" /><text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{tick}%</text></g>)}
        {minRate <= 50 && maxRate >= 50 && <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(50)} y2={y(50)} stroke="var(--color-ctp-subtext0)" strokeDasharray="4 4" />}
        {points.map(({ champion, latest }) => {
          const px = x(latest.shareOfSeason * 100);
          const py = y(latest.avgWinRate * 100);
          return (
            <Link key={champion.signature} to={`/champions/${championNameToSlug(champion.signature)}`}>
              <g className="cursor-pointer">
                <circle cx={px} cy={py} r={radius(latest.deckCount)} fill="var(--color-ctp-blue)" fillOpacity="0.42" stroke="var(--color-ctp-blue)" strokeWidth="1.5">
                  <title>{`${champion.signature}: ${(latest.shareOfSeason * 100).toFixed(1)}% share, ${(latest.avgWinRate * 100).toFixed(1)}% win rate, ${latest.deckCount.toLocaleString()} decks`}</title>
                </circle>
                {labeled.has(champion.signature) && <text x={px} y={py - radius(latest.deckCount) - 3} textAnchor="middle" className="pointer-events-none fill-ctp-text text-[9px]">{champion.signature}</text>}
              </g>
            </Link>
          );
        })}
        <text x={MARGIN.left + plotWidth / 2} y={HEIGHT - 5} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Current-season metagame share</text>
        <text x="13" y={MARGIN.top + plotHeight / 2} transform={`rotate(-90 13 ${MARGIN.top + plotHeight / 2})`} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Win rate</text>
      </svg>
      </div>
    </Surface>
  );
}
