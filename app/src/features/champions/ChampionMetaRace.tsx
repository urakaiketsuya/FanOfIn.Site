import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ChampionTrendsData } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { championNameToSlug } from "../../lib/championSlug";
import { championRaceFrames, type RaceMetric } from "./championRace";

export default function ChampionMetaRace({ data, active = true }: { data: ChampionTrendsData; active?: boolean }) {
  const [metric, setMetric] = useState<RaceMetric>("shareOfSeason");
  const [selection, setSelection] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const frames = useMemo(() => championRaceFrames(data, metric), [data, metric]);
  const selectedIndex = frames.findIndex((frame) => frame.name === selection);
  const index = selectedIndex < 0 ? frames.length - 1 : selectedIndex;
  const frame = frames[index];
  const images = useChampionCardImages(data.champions.map((champion) => champion.championName));
  const listRef = useRef<HTMLOListElement>(null);
  const previousPositions = useRef(new Map<string, number>());
  const rows = frame?.rows.slice(0, showAll ? undefined : 6) ?? [];
  const ceiling = Math.max(metric === "shareOfSeason" ? 0.05 : 1, ...frames.flatMap((entry) => entry.rows.map((row) => row.value)));
  const format = (value: number) => metric === "shareOfSeason" ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();

  useEffect(() => {
    if (!playing || !active) return;
    if (index >= frames.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setSelection(frames[index + 1].name), 1500);
    return () => window.clearTimeout(timer);
  }, [playing, active, index, frames]);
  useEffect(() => { if (!active) setPlaying(false); }, [active]);

  // FLIP keeps natural row heights, DOM reading order and keyboard order aligned.
  useLayoutEffect(() => {
    const positions = new Map<string, number>();
    const animations: Animation[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const row of listRef.current?.children ?? []) {
      const element = row as HTMLElement;
      const name = element.dataset.champion!;
      const top = element.offsetTop;
      const oldTop = previousPositions.current.get(name);
      positions.set(name, top);
      if (!reduceMotion && oldTop !== undefined && oldTop !== top) {
        animations.push(element.animate([{ transform: `translateY(${oldTop - top}px)` }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" }));
      }
    }
    previousPositions.current = positions;
    return () => animations.forEach((animation) => animation.cancel());
  }, [frame, showAll, active]);

  function select(name: string) { setPlaying(false); setSelection(name); }
  if (!frame) return <Panel className="mt-5"><h2 className="text-xl font-semibold">Meta race</h2><p role="status" className="mt-2">No season results have been published yet.</p></Panel>;

  return <Panel className="mt-5" data-component="ChampionMetaRace" aria-labelledby="meta-race-heading">
    <h2 id="meta-race-heading" className="text-2xl font-semibold">Meta race</h2>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <Button variant="primary" disabled={frames.length < 2} aria-pressed={playing} onClick={() => {
        if (playing) { setPlaying(false); return; }
        if (index === frames.length - 1) setSelection(frames[0].name);
        setPlaying(true);
      }}>{playing ? "Pause race" : "Play race"}</Button>
      <label className="flex min-w-0 flex-col gap-1 text-sm">Rank by
        <span className="relative min-w-0">
        <select aria-label="Rank by" className="min-h-control w-full appearance-none rounded-md border border-ctp-surface1 bg-ctp-base pl-3 pr-10 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" value={metric} onChange={(event) => { setPlaying(false); setMetric(event.target.value as RaceMetric); }}>
          <option value="shareOfSeason">Weighted meta share</option><option value="topCutCount">Top cuts</option>
        </select>
        <DisclosureChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </span>
      </label>
      <label className="flex min-w-0 max-w-full flex-col gap-1 text-sm">Season
        <span className="relative min-w-0">
        <select aria-label="Season" className="min-h-control w-full appearance-none rounded-md border border-ctp-surface1 bg-ctp-base pl-3 pr-10 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" value={frame.name} onChange={(event) => select(event.target.value)}>
          {frames.map((entry) => <option key={entry.name}>{entry.name}</option>)}
        </select>
        <DisclosureChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </span>
      </label>
    </div>
    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-lg font-semibold">{frame.name}</h3>
      <span className="text-sm text-ctp-subtext1">{metric === "shareOfSeason" ? "Weighted meta share" : "Recorded top cuts"}</span>
    </div>
    {!rows.length && <p role="status" className="py-6">No champion results for this season.</p>}
    <ol ref={listRef} className="relative mt-3 space-y-2" aria-label="Champion standings">
      {rows.map((row) => {
        const prior = frames[index - 1]?.rows.find((entry) => entry.name === row.name);
        const delta = prior ? prior.rank - row.rank : 0;
        const movement = index === 0 ? "" : !prior ? "New" : delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${-delta}` : "—";
        return <li key={row.name} data-champion={row.name} className="relative grid grid-cols-[1.5rem_3rem_minmax(0,1fr)] items-center gap-2 rounded-lg bg-ctp-mantle py-2 sm:grid-cols-[2rem_4rem_minmax(0,1fr)] sm:gap-3">
          <span className="text-center text-sm tabular-nums text-ctp-subtext1" aria-label={`Rank ${row.rank}`}>{row.rank}</span>
          <div aria-hidden="true"><CardArtTile card={images.get(row.name)} name={row.name} /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Link className="inline-flex min-h-control min-w-control items-center break-words font-semibold text-ctp-text hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/champions/${championNameToSlug(row.name)}`} onFocus={() => setPlaying(false)}>{row.name}</Link>
              <span className="tabular-nums">{format(row.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-ctp-surface0" aria-hidden="true"><div className="h-full rounded bg-ctp-blue transition-[width] duration-[650ms] ease-in-out motion-reduce:transition-none" style={{ width: `${row.value / ceiling * 100}%` }} /></div>
            <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-xs text-ctp-subtext1"><span>{row.deckCount.toLocaleString()} decks</span>{movement && <span aria-label={movement === "New" ? "New this season" : delta ? `${Math.abs(delta)} places ${delta > 0 ? "up" : "down"} from previous season` : "Rank unchanged"}>{movement}</span>}</div>
          </div>
        </li>;
      })}
    </ol>
    {frame.rows.length > 6 && <Button className="mt-3" aria-expanded={showAll} onClick={() => { setPlaying(false); setShowAll((value) => !value); }}>{showAll ? "Show top six" : "Show all champions"}</Button>}
    <div className="mt-5 border-t border-ctp-surface1 pt-4">
      <label htmlFor="champion-race-timeline" className="flex justify-between gap-3 text-sm"><span>Season timeline</span><span className="tabular-nums text-ctp-subtext1">{index + 1} of {frames.length}</span></label>
      <input id="champion-race-timeline" type="range" className="min-h-control w-full accent-ctp-blue" min={0} max={Math.max(0, frames.length - 1)} step={1} value={index} disabled={frames.length < 2} aria-valuetext={frame.name} onChange={(event) => select(frames[Number(event.target.value)].name)} />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-ctp-subtext1"><span>Rank change vs. previous season</span><span>Bar scale: 0–{format(ceiling)}</span></div>
    </div>
    <p className="sr-only" role="status">{!playing ? `${frame.name}. ${rows[0] ? `${rows[0].name} leads with ${format(rows[0].value)}.` : "No results."}` : "Playing season race."}</p>
  </Panel>;
}
