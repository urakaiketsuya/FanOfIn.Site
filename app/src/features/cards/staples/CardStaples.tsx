import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { blendCardStaples, findStapleCohort, stapleChampionBuilds, staplePopulation, selectStapleRows, type CardStaplesData, type StapleFilters, type StaplePeriod, type StapleSection } from "@gatcg/shared";
import PublishedSourceStatus from "../../../components/PublishedSourceStatus";
import PageLayout from "../../../components/layout/PageLayout";
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/ui/Button";
import Tabs, { TabPanel } from "../../../components/ui/Tabs";
import { usePublishedData, usePublishedDataStatus } from "../../../lib/sync/usePublishedData";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { useCardsByNames } from "../../events/useCardsByNames";
import StapleCardGrid from "./StapleCardGrid";
import StaplesFilters, { FilterField } from "./StaplesFilters";
import { fieldClass, titleCase } from "./staplesPresentation";

const PAGE_SIZE = 24;
const sections: { key: StapleSection; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }, { key: "sideboard", label: "Sideboard" }];
const linkClass = "inline-flex min-h-control items-center rounded px-2 text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue";

export default function CardStaples() {
  useDocumentTitle("Card Staples", "Discover the most played cards by deck section, element, keyword, and champion.");
  const [params, setParams] = useSearchParams();
  const community = params.get("source") === "community";
  const blended = params.get("source") === "blended";
  // Keep each published-data subscription bound to a stable key. Only the selected
  // source loads, and switching preserves keyboard focus and URL-owned selections.
  const tournamentData = usePublishedData<CardStaplesData>("analysis-card-staples", "/data/analysis/card-staples.json", !community);
  const communityData = usePublishedData<CardStaplesData>("analysis-community-card-staples", "/data/analysis/community-card-staples.json", community || blended);
  const tournamentStatus = usePublishedDataStatus("analysis-card-staples", "/data/analysis/card-staples.json", !community);
  const communityStatus = usePublishedDataStatus("analysis-community-card-staples", "/data/analysis/community-card-staples.json", community || blended);
  const blend = useMemo(() => blended && tournamentData && communityData ? blendCardStaples(tournamentData, communityData) : undefined, [blended, tournamentData, communityData]);
  const data = blended ? blend : community ? communityData : tournamentData;
  const [pending, startTransition] = useTransition();
  const requestedParams = useRef(params);
  useEffect(() => { if (!pending) requestedParams.current = params; }, [params, pending]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ key: "", count: PAGE_SIZE });
  const key = params.toString();
  const section: StapleSection = params.get("section") === "material" ? "material" : params.get("section") === "sideboard" ? "sideboard" : "main";
  const period: StaplePeriod = community || blended || params.get("period") === "all" ? "all" : params.get("period") === "30" ? "30" : "90";
  const format = params.get("format") ?? "standard";
  const champion = params.get("champion") ?? "";
  // A build is a champion card of the selected champion; without a champion it means nothing.
  const build = champion ? params.get("build") ?? "" : "";
  const filters = useMemo<StapleFilters>(() => ({
    search: params.get("q") ?? "", elements: [...new Set(params.getAll("element"))], keywords: [...new Set(params.getAll("keyword"))],
    keywordMode: params.get("match") === "all" ? "all" : "any", type: params.get("type") ?? "", cardClass: params.get("class") ?? "",
    level: /^[0-4]$/.test(params.get("level") ?? "") ? params.get("level")! : "",
    costKind: params.get("cost") === "memory" ? "memory" : "reserve",
    maxCost: /^(?:[0-9]|1[0-5])$/.test(params.get("max") ?? "") ? params.get("max")! : "",
    minDecks: [1, 5, 10, 20, 50].includes(Number(params.get("min"))) ? Number(params.get("min")) : 5,
    sort: !community && params.get("sort") === "winning" ? "winning" : params.get("sort") === "quantity" ? "quantity" : "usage",
  }), [params, community]);
  const cohort = data ? findStapleCohort(data, period, format || null, champion || null, build || null) : undefined;
  const stats = cohort?.sections[section];
  const rows = useMemo(() => selectStapleRows(data?.cards ?? [], stats?.rows ?? [], filters), [data, stats, filters]);
  const population = useMemo(() => data && stats ? staplePopulation(data, stats, filters) : null, [data, stats, filters]);
  const count = pagination.key === key ? pagination.count : PAGE_SIZE;
  const visible = rows.slice(0, count);
  const art = useCardsByNames(visible.map(row => data!.cards[row[0]].name));
  const champions = useMemo(() => [...new Set([...(data?.cohorts.flatMap(c => c.period === period && c.format === (format || null) && c.champion ? [c.champion] : []) ?? []), ...(champion ? [champion] : [])])].sort(), [data, period, format, champion]);
  const builds = useMemo(() => data && champion ? stapleChampionBuilds(data, period, format || null, champion) : [], [data, period, format, champion]);
  const buildLabel = (name: string) => { const level = data?.cards.find(card => card.name === name)?.championLevel; return level == null ? name : `${name} · Level ${level}`; };
  const elements = useMemo(() => [...new Set([...(data?.cards.flatMap(card => card.elements) ?? []), ...filters.elements])].sort(), [data, filters.elements]);
  function change(name: string, value: string | string[]) {
    // Router search-param setters do not queue like React state setters. Keep quick
    // successive filter actions based on the latest requested URL during a transition.
    const next = new URLSearchParams(requestedParams.current);
    next.delete(name);
    // A build belongs to one champion, so choosing another champion drops it.
    if (name === "champion") next.delete("build");
    if (Array.isArray(value)) value.forEach(item => next.append(name, item));
    else if (value || name === "format") next.set(name, value);
    requestedParams.current = next;
    startTransition(() => setParams(next, { replace: name === "q" }));
  }
  const chips: { key: string; value: string; label: string }[] = [
    ...filters.elements.map(value => ({ key: "element", value, label: titleCase(value) })),
    ...filters.keywords.map(value => ({ key: "keyword", value, label: value })),
    ...(champion ? [{ key: "champion", value: champion, label: `${champion} decks` }] : []),
    ...(build ? [{ key: "build", value: build, label: buildLabel(build) }] : []),
    ...(filters.type ? [{ key: "type", value: filters.type, label: titleCase(filters.type) }] : []),
    ...(filters.cardClass ? [{ key: "class", value: filters.cardClass, label: titleCase(filters.cardClass) }] : []),
    ...(filters.level ? [{ key: "level", value: filters.level, label: `Level ${filters.level} champions` }] : []),
    ...(filters.maxCost !== "" ? [{ key: "max", value: filters.maxCost, label: `${titleCase(filters.costKind)} ≤ ${filters.maxCost}` }] : []),
    ...(filters.minDecks !== 5 ? [{ key: "min", value: String(filters.minDecks), label: `Minimum ${filters.minDecks} decks` }] : []),
  ];
  function clearFilters() {
    const next = new URLSearchParams();
    for (const name of ["source", "section", "period", "format", "sort"]) if (requestedParams.current.has(name)) next.set(name, requestedParams.current.get(name)!);
    requestedParams.current = next;
    startTransition(() => setParams(next));
  }
  return <PageLayout width="wide" data-component="CardStaples">
    <PageHeader title="Card Staples" description="Find the cards players return to, across tournament and community decks." actions={<Link to="/cards/stats" className={linkClass}>Detailed card stats →</Link>} />
    <div className="mb-4 max-w-sm"><FilterField label="Deck source"><select className={fieldClass} value={blended ? "blended" : community ? "community" : "tournament"} onChange={e => change("source", e.target.value)}><option value="tournament">Tournament results</option><option value="community">Community decklists</option><option value="blended">Blended · Tournament + community</option></select></FilterField></div>
    <Tabs tabs={sections} active={section} onChange={value => change("section", value)} baseId="staples" label="Deck section" variant="pill" wrap />
    <div className="mt-4 flex items-end gap-3">
      <div className="min-w-0 flex-1"><FilterField label="Find a card"><input type="search" className={fieldClass} value={filters.search} onChange={e => change("q", e.target.value)} placeholder="Card name" /></FilterField></div>
      <Button onClick={() => setShowFilters(true)}>Filters{chips.length ? ` (${chips.length})` : ""}</Button>
    </div>
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><FilterField label="Element"><select className={fieldClass} value={filters.elements.length === 1 ? filters.elements[0] : ""} onChange={e => change("element", e.target.value ? [e.target.value] : [])}><option value="">All elements</option>{elements.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></FilterField></div>
      <div className="min-w-0 flex-1"><FilterField label="Champion"><select className={fieldClass} value={champion} onChange={e => change("champion", e.target.value)}><option value="">All champions</option>{champions.map(name => <option key={name} value={name}>{name}</option>)}</select></FilterField></div>
      {champion && <div className="min-w-0 flex-1"><FilterField label="Build"><select className={fieldClass} value={build} onChange={e => change("build", e.target.value)}><option value="">All {champion} builds</option>{builds.map(item => <option key={item.card} value={item.card}>{buildLabel(item.card)} ({item.decks.toLocaleString()})</option>)}{build && !builds.some(item => item.card === build) && <option value={build}>{buildLabel(build)}</option>}</select></FilterField></div>}
      <div className="min-w-0 flex-1"><FilterField label="Rank by"><select className={fieldClass} value={filters.sort} onChange={e => change("sort", e.target.value)}><option value="usage">Most played</option>{!community && <option value="winning">Adjusted win rate</option>}<option value="quantity">Average copies</option></select></FilterField></div>
    </div>
    {(chips.length > 0 || filters.search) && <div className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map(chip => <Button size="sm" key={`${chip.key}:${chip.value}`} aria-label={`Remove ${chip.label} filter`} onClick={() => change(chip.key, ["element", "keyword"].includes(chip.key) ? params.getAll(chip.key).filter(value => value !== chip.value) : "")}>{chip.label} ×</Button>)}
      <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
    </div>}
    {!community && <PublishedSourceStatus label="Tournament staples" status={tournamentStatus} hasData={!!tournamentData} />}
    {(community || blended) && <PublishedSourceStatus label="Community staples" status={communityStatus} hasData={!!communityData} />}
    <TabPanel baseId="staples" tab={section} active={section} className="mt-5 focus-visible:outline-2 focus-visible:outline-ctp-blue">
      <div aria-live="polite" className="mb-4 text-sm text-ctp-subtext1">
        {pending ? "Recalculating…" : data ? `${rows.length.toLocaleString()} cards · ${population === null ? "Population unavailable" : `${population.toLocaleString()} matching ${section} sections`}${champion ? ` · ${build ? buildLabel(build) : champion}` : ""}` : ""}
        {data && <span className="mt-1 block">{format ? titleCase(format) : "All formats"} · {blended ? "Tournament entries + unique community lists · Full archive" : community ? "Unique community lists · Full archive" : period === "all" ? "All recorded results" : `Last ${period} days`}</span>}
        {data && community && <span className="mt-1 block text-xs text-ctp-subtext0">ShoutAtYourDecks · Sleeved · TcgArchitect{section === "sideboard" ? ` · ${stats?.decks ?? 0} of ${cohort?.decks ?? 0} lists report a sideboard` : ""}</span>}
        {data?.throughDate && <span className="mt-1 block text-xs text-ctp-subtext0">Results through {data.throughDate}{section === "sideboard" ? ` · ${stats?.decks ?? 0} of ${cohort?.decks ?? 0} decks report a sideboard` : ""}</span>}
      </div>
      {data && rows.length === 0 && <div role="status" className="rounded-xl border border-ctp-surface1 p-5"><p>No cards match this selection.</p><Button className="mt-3" onClick={clearFilters}>Clear card filters</Button></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
        {data && <StapleCardGrid data={data} rows={visible} population={population} art={art} unit={community ? "unique lists" : "decks"} showCopies={!blended} />}
      </div>
      {rows.length > count && <Button className="mt-5 w-full" onClick={() => setPagination({ key, count: count + PAGE_SIZE })}>Show more cards</Button>}
    </TabPanel>
    {showFilters && <StaplesFilters community={community || blended} data={data} filters={filters} format={format} period={period} onChange={change} onDismiss={() => setShowFilters(false)} />}
  </PageLayout>;
}
