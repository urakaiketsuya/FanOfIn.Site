import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { selectStapleRows, type CardStaplesData, type StapleFilters, type StaplePeriod, type StapleSection } from "@gatcg/shared";
import CardArtTile from "../../../components/CardArtTile";
import PublishedSourceStatus from "../../../components/PublishedSourceStatus";
import PageLayout from "../../../components/layout/PageLayout";
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/ui/Button";
import Tabs, { TabPanel } from "../../../components/ui/Tabs";
import { usePublishedData, usePublishedDataStatus } from "../../../lib/sync/usePublishedData";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { useCardsByNames } from "../../events/useCardsByNames";
import StaplesFilters, { FilterField } from "./StaplesFilters";
import { fieldClass, titleCase } from "./staplesPresentation";

const PAGE_SIZE = 24;
const sections: { key: StapleSection; label: string }[] = [{ key: "main", label: "Main" }, { key: "material", label: "Material" }, { key: "sideboard", label: "Sideboard" }];
const linkClass = "inline-flex min-h-control items-center rounded px-2 text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue";
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function CardStaples() {
  useDocumentTitle("Card Staples", "Discover the most played cards by deck section, element, keyword, and champion.");
  const [params, setParams] = useSearchParams();
  const community = params.get("source") === "community";
  // Keep each published-data subscription bound to a stable key. Only the selected
  // source loads, and switching preserves keyboard focus and URL-owned selections.
  const tournamentData = usePublishedData<CardStaplesData>("analysis-card-staples", "/data/analysis/card-staples.json", !community);
  const communityData = usePublishedData<CardStaplesData>("analysis-community-card-staples", "/data/analysis/community-card-staples.json", community);
  const tournamentStatus = usePublishedDataStatus("analysis-card-staples", "/data/analysis/card-staples.json", !community);
  const communityStatus = usePublishedDataStatus("analysis-community-card-staples", "/data/analysis/community-card-staples.json", community);
  const data = community ? communityData : tournamentData;
  const status = community ? communityStatus : tournamentStatus;
  const [pending, startTransition] = useTransition();
  const requestedParams = useRef(params);
  useEffect(() => { if (!pending) requestedParams.current = params; }, [params, pending]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ key: "", count: PAGE_SIZE });
  const key = params.toString();
  const section: StapleSection = params.get("section") === "material" ? "material" : params.get("section") === "sideboard" ? "sideboard" : "main";
  const period: StaplePeriod = community || params.get("period") === "all" ? "all" : params.get("period") === "30" ? "30" : "90";
  const format = params.get("format") ?? "standard";
  const champion = params.get("champion") ?? "";
  const filters = useMemo<StapleFilters>(() => ({
    search: params.get("q") ?? "", elements: [...new Set(params.getAll("element"))], keywords: [...new Set(params.getAll("keyword"))],
    keywordMode: params.get("match") === "all" ? "all" : "any", type: params.get("type") ?? "", cardClass: params.get("class") ?? "",
    level: /^[0-4]$/.test(params.get("level") ?? "") ? params.get("level")! : "",
    costKind: params.get("cost") === "memory" ? "memory" : "reserve",
    maxCost: /^(?:[0-9]|1[0-5])$/.test(params.get("max") ?? "") ? params.get("max")! : "",
    minDecks: [1, 5, 10, 20, 50].includes(Number(params.get("min"))) ? Number(params.get("min")) : 5,
    sort: !community && params.get("sort") === "winning" ? "winning" : params.get("sort") === "quantity" ? "quantity" : "usage",
  }), [params, community]);
  const cohort = data?.cohorts.find(c => c.period === period && c.format === (format || null) && c.champion === (champion || null));
  const stats = cohort?.sections[section];
  const rows = useMemo(() => selectStapleRows(data?.cards ?? [], stats?.rows ?? [], filters), [data, stats, filters]);
  const count = pagination.key === key ? pagination.count : PAGE_SIZE;
  const visible = rows.slice(0, count);
  const art = useCardsByNames(visible.map(row => data!.cards[row[0]].name));
  const elements = useMemo(() => [...new Set([...(data?.cards.flatMap(card => card.elements) ?? []), ...filters.elements])].sort(), [data, filters.elements]);
  function change(name: string, value: string | string[]) {
    // Router search-param setters do not queue like React state setters. Keep quick
    // successive filter actions based on the latest requested URL during a transition.
    const next = new URLSearchParams(requestedParams.current);
    next.delete(name);
    if (Array.isArray(value)) value.forEach(item => next.append(name, item));
    else if (value || name === "format") next.set(name, value);
    requestedParams.current = next;
    startTransition(() => setParams(next, { replace: name === "q" }));
  }
  const chips: { key: string; value: string; label: string }[] = [
    ...filters.elements.map(value => ({ key: "element", value, label: titleCase(value) })),
    ...filters.keywords.map(value => ({ key: "keyword", value, label: value })),
    ...(champion ? [{ key: "champion", value: champion, label: `${champion} decks` }] : []),
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
    <div className="mb-4 max-w-sm"><FilterField label="Deck source"><select className={fieldClass} value={community ? "community" : "tournament"} onChange={e => change("source", e.target.value)}><option value="tournament">Tournament results</option><option value="community">Community decklists</option></select></FilterField></div>
    <Tabs tabs={sections} active={section} onChange={value => change("section", value)} baseId="staples" label="Deck section" variant="pill" wrap />
    <div className="mt-4 flex items-end gap-3">
      <div className="min-w-0 flex-1"><FilterField label="Find a card"><input type="search" className={fieldClass} value={filters.search} onChange={e => change("q", e.target.value)} placeholder="Card name" /></FilterField></div>
      <Button onClick={() => setShowFilters(true)}>Filters{chips.length ? ` (${chips.length})` : ""}</Button>
    </div>
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><FilterField label="Element"><select className={fieldClass} value={filters.elements.length === 1 ? filters.elements[0] : ""} onChange={e => change("element", e.target.value ? [e.target.value] : [])}><option value="">All elements</option>{elements.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></FilterField></div>
      <div className="min-w-0 flex-1"><FilterField label="Rank by"><select className={fieldClass} value={filters.sort} onChange={e => change("sort", e.target.value)}><option value="usage">Most played</option>{!community && <option value="winning">Adjusted win rate</option>}<option value="quantity">Average copies</option></select></FilterField></div>
    </div>
    {(chips.length > 0 || filters.search) && <div className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map(chip => <Button size="sm" key={`${chip.key}:${chip.value}`} aria-label={`Remove ${chip.label} filter`} onClick={() => change(chip.key, ["element", "keyword"].includes(chip.key) ? params.getAll(chip.key).filter(value => value !== chip.value) : "")}>{chip.label} ×</Button>)}
      <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
    </div>}
    <PublishedSourceStatus label={community ? "Community staples" : "Card staples"} status={status} hasData={!!data} />
    <TabPanel baseId="staples" tab={section} active={section} className="mt-5 focus-visible:outline-2 focus-visible:outline-ctp-blue">
      <div aria-live="polite" className="mb-4 text-sm text-ctp-subtext1">
        {pending ? "Recalculating…" : data ? `${rows.length.toLocaleString()} cards · ${(stats?.decks ?? 0).toLocaleString()} reported ${section} sections${champion ? ` · ${champion}` : ""}` : ""}
        {data && <span className="mt-1 block">{format ? titleCase(format) : "All formats"} · {community ? "Unique community lists · Full archive" : period === "all" ? "All recorded results" : `Last ${period} days`}</span>}
        {data && community && <span className="mt-1 block text-xs text-ctp-subtext0">ShoutAtYourDecks · Sleeved · TcgArchitect{section === "sideboard" ? ` · ${stats?.decks ?? 0} of ${cohort?.decks ?? 0} lists report a sideboard` : ""}</span>}
        {data?.throughDate && <span className="mt-1 block text-xs text-ctp-subtext0">Results through {data.throughDate}{section === "sideboard" ? ` · ${stats?.decks ?? 0} of ${cohort?.decks ?? 0} decks report a sideboard` : ""}</span>}
      </div>
      {data && rows.length === 0 && <div role="status" className="rounded-xl border border-ctp-surface1 p-5"><p>No cards match this selection.</p><Button className="mt-3" onClick={clearFilters}>Clear card filters</Button></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
        {visible.map((row, index) => {
          const card = data!.cards[row[0]];
          const identity = <><div className="w-24 shrink-0"><CardArtTile card={art.get(card.name)} name={card.name} /></div><div className="min-w-0"><span className="text-xs text-ctp-subtext0">#{index + 1}</span><h2 className="mt-1 break-words font-semibold text-ctp-text">{card.name}</h2><p className="mt-2 text-xs text-ctp-subtext1">{card.elements.map(titleCase).join(" · ")}{card.championLevel !== null ? ` · Level ${card.championLevel}` : ""}</p></div></>;
          return <article key={card.id} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3" aria-label={card.name}>
            {card.slug ? <Link to={`/cards/${card.slug}`} className="flex gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{identity}</Link> : <div className="flex gap-3">{identity}</div>}
            {card.keywords.length > 0 && <p className="mt-3 break-words text-xs text-ctp-subtext1">{card.keywords.join(" · ")}</p>}
            <div className="mt-3 flex items-baseline justify-between gap-2"><strong className="text-xl text-ctp-blue">{percent(row[1] / (stats?.decks || 1))}</strong><span className="text-xs text-ctp-subtext1">{row[1].toLocaleString()} {community ? "unique lists" : "decks"}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ctp-surface0" aria-hidden="true"><div className="h-full bg-ctp-blue" style={{ width: percent(row[1] / (stats?.decks || 1)) }} /></div>
            <p className="mt-2 text-xs text-ctp-subtext1">Usually {row[3]} {row[3] === 1 ? "copy" : "copies"} · {(row[2] / row[1]).toFixed(1)} average</p>
            {!community && <p className="mt-1 text-xs text-ctp-subtext0">{row[5] === null ? "No recorded match results" : `${percent(row[5])} adjusted deck win rate · ${row[4].toLocaleString()} decks`}</p>}
          </article>;
        })}
      </div>
      {rows.length > count && <Button className="mt-5 w-full" onClick={() => setPagination({ key, count: count + PAGE_SIZE })}>Show more cards</Button>}
    </TabPanel>
    {showFilters && <StaplesFilters community={community} data={data} filters={filters} champion={champion} format={format} period={period} onChange={change} onDismiss={() => setShowFilters(false)} />}
  </PageLayout>;
}
