import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BattleChartEntry } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import Section from "../../components/ui/Section";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { championNameToSlug } from "../../lib/championSlug";
import { championMatchups } from "./matchupResults";

const VIEWS = ["All", "Favorable", "Unfavorable", "Even"] as const;
export default function ChampionMatchups({ championName, rows }: { championName: string; rows: BattleChartEntry[] }) {
  const [view, setView] = useState<typeof VIEWS[number]>("All");
  const matchups = useMemo(() => championMatchups(championName, rows), [championName, rows]);
  const images = useChampionCardImages(matchups.map(row => row.opponent));
  return <Section className="mt-5" heading="compact" title="Observed matchups" description="All recorded events · most-played opponents first">
    <Tabs baseId="champion-matchups" label="Matchup results" variant="pill" wrap active={view} onChange={setView} tabs={VIEWS.map(key => ({ key, label: `${key} (${key === "All" ? matchups.length : matchups.filter(row => row.outlook === key).length})` }))} />
    {VIEWS.map(key => <TabPanel key={key} baseId="champion-matchups" tab={key} active={view}>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {matchups.filter(row => key === "All" || row.outlook === key).map(row => <Link key={row.opponent} to={`/champions/${championNameToSlug(row.opponent)}?tab=matchups`} className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">
          <CardArtTile card={images.get(row.opponent)} name={row.opponent} />
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-ctp-text">{row.opponent}</h3>
            <p className={`text-sm font-medium ${row.outlook === "Favorable" ? "text-ctp-green" : row.outlook === "Unfavorable" ? "text-ctp-peach" : "text-ctp-subtext1"}`}>{row.outlook}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{(row.winRate * 100).toFixed(1)}% <span className="text-sm font-normal">wins</span></p>
            <p className="text-sm text-ctp-subtext1">{row.wins}W · {row.losses}L · {row.ties}D</p>
            <p className="text-sm text-ctp-subtext1">{row.games.toLocaleString()} matches</p>
          </div>
        </Link>)}
      </div>
      {!matchups.some(row => key === "All" || row.outlook === key) && <p role="status" className="mt-4 text-sm text-ctp-subtext1">{matchups.length === 0 ? "No qualifying matchups published for this champion." : `No ${key.toLowerCase()} matchups in the published sample.`}</p>}
    </TabPanel>)}
  </Section>;
}
