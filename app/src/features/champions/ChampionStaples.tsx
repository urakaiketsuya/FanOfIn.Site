import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DEFAULT_STAPLE_FILTERS, findStapleCohort, stapleChampionBuilds, staplePopulation, selectStapleRows, type CardStaplesData, type StapleSection } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedData, usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import { useCardsByNames } from "../events/useCardsByNames";
import StapleCardGrid from "../cards/staples/StapleCardGrid";

const PAGE_SIZE = 8;
const FORMAT = "standard";
const SECTIONS: { key: StapleSection; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }];
/** Tonal fill, lift and a check mark mark the selected option; color is never the only cue. */
const optionClass = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] aria-pressed:border-ctp-blue aria-pressed:bg-ctp-blue/15 aria-pressed:text-ctp-blue aria-pressed:shadow-md aria-pressed:font-semibold";

/** True once the element nears the viewport. card-staples.json is large, so a champion page
 * only fetches it when a visitor scrolls toward this section. */
function useNearViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const node = ref.current;
    if (near || !node) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setNear(true); }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/** Staples for one champion: the same cohorts, rows and denominators as `/cards/staples`.
 * Spirit element is a different thing from card element and is not a staples cohort, so the
 * Spirit breakdown stays in the section below this one. */
export default function ChampionStaples({ championName, embedded = false }: { championName: string; embedded?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [wrapper, near] = useNearViewport();
  const data = usePublishedData<CardStaplesData>("analysis-card-staples", "/data/analysis/card-staples.json", near);
  const status = usePublishedDataStatus("analysis-card-staples", "/data/analysis/card-staples.json", near);
  const [section, setSection] = useState<StapleSection>("main");
  const [count, setCount] = useState(PAGE_SIZE);
  const [pending, startTransition] = useTransition();
  const requested = params.get("build") ?? "";
  const builds = useMemo(() => data ? stapleChampionBuilds(data, "all", FORMAT, championName) : [], [data, championName]);
  // Preserve the requested population; a stale build must never silently show all builds.
  const build = requested;
  const cohort = data ? findStapleCohort(data, "all", FORMAT, championName, build || null) : undefined;
  const stats = cohort?.sections[section];
  const rows = useMemo(() => data && stats ? selectStapleRows(data.cards, stats.rows, DEFAULT_STAPLE_FILTERS) : [], [data, stats]);
  const population = data && stats ? staplePopulation(data, stats, DEFAULT_STAPLE_FILTERS) : null;
  const visible = rows.slice(0, count);
  const art = useCardsByNames(visible.map(row => data!.cards[row[0]].name));
  const levelOf = (name: string) => data?.cards.find(card => card.name === name)?.championLevel;
  function chooseBuild(next: string) {
    setCount(PAGE_SIZE);
    startTransition(() => setParams(prev => { const value = new URLSearchParams(prev); if (next) value.set("build", next); else value.delete("build"); return value; }, { replace: true }));
  }
  const link = `/cards/staples?${new URLSearchParams({ champion: championName, ...(build ? { build } : {}), section, period: "all" })}`;
  const viewAll = <Link to={link} className="inline-flex min-h-control items-center rounded-md px-3 text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">View all staples &rarr;</Link>;
  const content = <div ref={wrapper}>
      <PublishedSourceStatus label="Tournament staples" status={status} hasData={!!data} />
      {(builds.length > 0 || build) && <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Champion build">
        <Button size="sm" className={optionClass} aria-pressed={!build} onClick={() => chooseBuild("")}>{!build && "✓ "}All builds</Button>
        {builds.map(item => <Button key={item.card} size="sm" className={optionClass} aria-pressed={build === item.card} onClick={() => chooseBuild(item.card)}>{build === item.card && "✓ "}{item.card}{levelOf(item.card) != null ? ` · Level ${levelOf(item.card)}` : ""} ({item.decks.toLocaleString()})</Button>)}
      </div>}
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Deck section">
        {SECTIONS.map(item => <Button key={item.key} size="sm" className={optionClass} aria-pressed={section === item.key} onClick={() => { setSection(item.key); setCount(PAGE_SIZE); }}>{section === item.key && "✓ "}{item.label}</Button>)}
      </div>
      {pending && <p role="status" className="mt-3 text-sm">Recalculating…</p>}
      {data && !cohort && <InlineState className="mt-4 text-sm">No standard-format tournament decks recorded{build ? ` for ${build}` : " for this selection"}. {build && "Choose All builds to reset."}</InlineState>}
      {data && cohort && <p aria-live="polite" className="mt-3 text-sm text-ctp-subtext1">{rows.length.toLocaleString()} cards · {population === null ? "Population unavailable" : `${population.toLocaleString()} ${section} sections`} · Standard, all recorded results · at least {DEFAULT_STAPLE_FILTERS.minDecks} decks</p>}
      {data && cohort && rows.length === 0 && <InlineState className="mt-4 text-sm">No cards reach the minimum sample size.</InlineState>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
        {data && <StapleCardGrid data={data} rows={visible} population={population} art={art} heading="h3" />}
      </div>
      {rows.length > count && <Button className="mt-4" onClick={() => setCount(count + PAGE_SIZE)}>Show more cards</Button>}
  </div>;
  // Embedded in a page section that already owns the heading, so only the link is added.
  if (embedded) return <div><div className="flex justify-end">{viewAll}</div>{content}</div>;
  return <Section className="mt-6" heading="compact" title="Staples"
    description={`The cards players bring with ${championName}, from tournament decks. Same numbers as the Staples page.`}
    actions={viewAll}>{content}</Section>;
}
