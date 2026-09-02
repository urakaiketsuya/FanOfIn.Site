import { Link } from "react-router-dom";
import Surface from "../../components/ui/Surface";
import Section from "../../components/ui/Section";
import { gatcgApi } from "../../lib/api/client";
import { archetypeElement } from "../../lib/archetypeElement";

export interface ArchetypeMetaPoint {
  id: string;
  name: string;
  playerCount: number;
  deckCount: number;
  avgWinRate: number;
  metaShare?: number;
}

const WIDTH = 720;
const HEIGHT = 410;
const MARGIN = { top: 28, right: 30, bottom: 48, left: 58 };

export default function ArchetypeMetaMap({ builds, scopeLabel }: { builds: ArchetypeMetaPoint[]; scopeLabel: string }) {
  const points = builds.filter((build) => build.metaShare !== undefined && build.playerCount >= 5);
  if (points.length < 2) return null;
  const shares = points.map((build) => (build.metaShare ?? 0) * 100);
  const rates = points.map((build) => build.avgWinRate * 100);
  const maxShare = Math.max(5, Math.ceil(Math.max(...shares) / 5) * 5);
  const minRate = Math.floor((Math.min(45, ...rates) - 2) / 5) * 5;
  const maxRate = Math.ceil((Math.max(55, ...rates) + 2) / 5) * 5;
  const maxPlayers = Math.max(...points.map((build) => build.playerCount));
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (share: number) => MARGIN.left + (share / maxShare) * plotWidth;
  const y = (rate: number) => MARGIN.top + plotHeight - ((rate - minRate) / (maxRate - minRate)) * plotHeight;
  const radius = (players: number) => 7 + Math.sqrt(players / maxPlayers) * 10;
  const labeled = new Set([...points].sort((a, b) => b.playerCount - a.playerCount).slice(0, 14).map((build) => build.id));
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = Array.from({ length: Math.floor((maxRate - minRate) / 5) + 1 }, (_, index) => minRate + index * 5);

  return (
    <Surface as="figure" className="mt-5 p-3">
      <Section
        as="figcaption"
        heading="compact"
        title="Build metagame map"
        description={`Further right means more popular; higher means a stronger win rate. Bubble size represents players. Showing ${scopeLabel}; builds below five players are omitted.`}
      >
        {null}
      </Section>
      <div className="mt-2 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[40rem]" role="img" aria-label={`Archetype metagame share versus win rate for ${scopeLabel}`}>
          {xTicks.map((tick) => { const px = MARGIN.left + tick * plotWidth; return <g key={tick}><line x1={px} x2={px} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke="var(--color-ctp-surface1)" /><text x={px} y={HEIGHT - 20} textAnchor="middle" className="fill-ctp-subtext0 text-[10px]">{(tick * maxShare).toFixed(0)}%</text></g>; })}
          {yTicks.map((tick) => <g key={tick}><line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-ctp-surface1)" /><text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-ctp-subtext0 text-[10px]">{tick}%</text></g>)}
          {minRate <= 50 && maxRate >= 50 && <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(50)} y2={y(50)} stroke="var(--color-ctp-subtext0)" strokeDasharray="4 4" />}
          {points.map((build) => {
            const px = x((build.metaShare ?? 0) * 100); const py = y(build.avgWinRate * 100); const r = radius(build.playerCount); const element = archetypeElement(build.name);
            return <Link key={build.id} to={`/archetypes/${build.id}`}><g className="cursor-pointer"><circle cx={px} cy={py} r={r} fill="var(--color-ctp-surface0)" stroke="var(--color-ctp-blue)" strokeWidth="1.5"><title>{`${build.name}: ${((build.metaShare ?? 0) * 100).toFixed(1)}% share, ${(build.avgWinRate * 100).toFixed(1)}% win rate, ${build.playerCount} players, ${build.deckCount} decks`}</title></circle>{element && <image href={gatcgApi.iconUrl("elements", element)} x={px - r * 0.62} y={py - r * 0.62} width={r * 1.24} height={r * 1.24} className="pointer-events-none" />}{labeled.has(build.id) && <text x={px} y={py - r - 3} textAnchor="middle" className="pointer-events-none fill-ctp-text text-[8px]">{build.name}</text>}</g></Link>;
          })}
          <text x={MARGIN.left + plotWidth / 2} y={HEIGHT - 5} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Build metagame share</text>
          <text x="13" y={MARGIN.top + plotHeight / 2} transform={`rotate(-90 13 ${MARGIN.top + plotHeight / 2})`} textAnchor="middle" className="fill-ctp-subtext0 text-[10px] uppercase">Win rate</text>
        </svg>
      </div>
    </Surface>
  );
}
