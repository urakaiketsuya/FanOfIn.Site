import RegionalStrength from "./RegionalStrength";
import RegionalCompetitionReport from "../competition/RegionalCompetitionReport";
import { useState, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRegionalDecks } from "./useRegionalDecks";
import { useRegionalArchetypes, type RegionalArchetypeRow } from "./useRegionalArchetypes";
import { useRegionalChampions, type RegionalChampionRow } from "./useRegionalChampions";
import { useRegionalCardComposition } from "./useRegionalCardComposition";
import { useRegionalKeywords } from "./useRegionalKeywords";
import { useRegionalVenues } from "./useRegionalVenues";
import VenueMap from "./VenueMap";
import { useRegionDecodedDecks } from "./useRegionDecodedDecks";
import RegionCompareView from "./RegionCompareView";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { championNameToSlug } from "../../lib/championSlug";
import { useTabParam } from "../../lib/useTabParam";
import type { RegionGroupMode } from "../../lib/regions";
import PageHeader from "../../components/ui/PageHeader";
import FilterBar from "../../components/ui/FilterBar";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { CardLiftList, KeywordLiftList } from "./RegionalLiftLists";

const GROUP_MODES: RegionGroupMode[] = ["country", "region"];
const GROUP_LABELS: Record<RegionGroupMode, string> = { country: "Countries", region: "Regions" };
type ViewMode = "single" | "compare" | "strength";
const VIEW_MODES: ViewMode[] = ["single", "compare", "strength"];
type ContentTab = "archetypes" | "champions" | "cards" | "keywords" | "venues";
const CONTENT_TABS: ContentTab[] = ["archetypes", "champions", "cards", "keywords", "venues"];
type Surface = "overview" | "insights" | "places" | "compare" | "strength";
const SURFACES: { key: Surface; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "insights", label: "Insights" },
  { key: "places", label: "Places" },
  { key: "compare", label: "Compare" },
  { key: "strength", label: "Player strength" },
];
const MAX_VENUE_EVENTS_SHOWN = 3;

function BuildCards({ rows }: { rows: RegionalArchetypeRow[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Link key={row.id} to={`/archetypes/${row.id}`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue">
          <span className="w-6 shrink-0 text-center text-sm font-medium text-ctp-subtext0">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ctp-text group-hover:text-ctp-blue">{row.name}</div>
            <div className="truncate text-xs text-ctp-subtext0">{row.championName}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-mauve" style={{ width: `${Math.max(2, row.share * 100)}%` }} /></div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium text-ctp-text">{(row.share * 100).toFixed(1)}%</div>
            <div className="text-xs text-ctp-subtext0">{row.deckCount} decks · {(row.avgWinRate * 100).toFixed(0)}% WR</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChampionCards({ rows }: { rows: RegionalChampionRow[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row, index) => (
        <Link key={row.championName} to={`/champions/${championNameToSlug(row.championName)}`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue">
          <span className="w-6 shrink-0 text-center text-sm font-medium text-ctp-subtext0">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ctp-text group-hover:text-ctp-blue">{row.championName}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full rounded-full bg-ctp-blue" style={{ width: `${Math.max(2, row.share * 100)}%` }} /></div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium text-ctp-text">{(row.share * 100).toFixed(1)}%</div>
            <div className="text-xs text-ctp-subtext0">{row.deckCount} decks · {(row.avgWinRate * 100).toFixed(0)}% WR</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function RegionsIndex() {
  useDocumentTitle("Regions", "Grand Archive TCG meta stats broken out by region.");
  const [group] = useTabParam<RegionGroupMode>("group", GROUP_MODES, "country");
  const [view] = useTabParam<ViewMode>("view", VIEW_MODES, "single");
  const [tab, setTab] = useTabParam<ContentTab>("tab", CONTENT_TABS, "archetypes");
  const [searchParams, setSearchParams] = useSearchParams();
  const [recalculating, startTransition] = useTransition();
  const [regionOverride, setRegionOverride] = useState<string | null>(() => searchParams.get("region"));

  const { loading, options, regionByDeckId } = useRegionalDecks(group);
  const selectedRegion = regionOverride && options.some((option) => option.code === regionOverride) ? regionOverride : (options[0]?.code ?? null);
  const selectedOption = options.find((option) => option.code === selectedRegion);
  const surface: Surface = view === "strength" ? "strength" : view === "compare" ? "compare" : tab === "cards" || tab === "keywords" ? "insights" : tab === "venues" ? "places" : "overview";
  const overviewTab: "archetypes" | "champions" = tab === "champions" ? "champions" : "archetypes";
  const insightTab: "cards" | "keywords" = tab === "keywords" ? "keywords" : "cards";

  function selectRegion(code: string) {
    startTransition(() => {
      setRegionOverride(code);
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set("region", code);
        return next;
      });
    });
  }

  function selectSurface(next: Surface) {
    startTransition(() => setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === "compare" || next === "strength") params.set("view", next);
      else {
        params.delete("view");
        params.set("tab", next === "overview" ? "archetypes" : next === "insights" ? "cards" : "venues");
      }
      return params;
    }, { replace: true }));
  }

  const archetypes = useRegionalArchetypes(regionByDeckId, selectedRegion, surface === "overview");
  const champions = useRegionalChampions(regionByDeckId, selectedRegion, surface === "overview");
  const needsDeckContents = surface === "insights";
  const regionDecks = useRegionDecodedDecks(regionByDeckId, selectedRegion, needsDeckContents);
  const cards = useRegionalCardComposition(regionDecks, needsDeckContents);
  const keywords = useRegionalKeywords(regionDecks, needsDeckContents);
  const venues = useRegionalVenues(group, selectedRegion, surface === "places");

  return (
    <PageLayout width="fluid" data-component="RegionsIndex">
      <PageHeader title="Regions" description={surface === "strength" ? "Compare US player results across seasons." : "See what players bring, then compare local metas."} />

      {surface !== "strength" && <FilterBar>
        <label className="min-w-0 basis-full sm:flex-1 sm:basis-auto text-xs text-ctp-subtext0">
          Area
          <select value={selectedRegion ?? ""} onChange={(event) => selectRegion(event.target.value)} className="mt-1 block w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text sm:max-w-xs">
            {options.map((option) => <option key={option.code} value={option.code}>{option.label} · {option.deckCount} decks</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          {GROUP_MODES.map((mode) => (
            <Button key={mode} size="sm" variant={group === mode ? "primary" : "secondary"} aria-pressed={group === mode} onClick={() => {
              setRegionOverride(null);
              setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("group", mode);
                next.delete("region");
                return next;
              });
            }}>{GROUP_LABELS[mode]}</Button>
          ))}
        </div>
      </FilterBar>}

      {recalculating && <p role="status" className="text-sm text-ctp-subtext1">Recalculating…</p>}
      {surface !== "strength" && loading && <InlineState className="mt-6">Loading…</InlineState>}
      {surface !== "strength" && !loading && options.length === 0 && <EmptyState className="mt-6" title="Not enough regional data yet" />}

      <div className="mt-4"><Tabs tabs={SURFACES} active={surface} onChange={selectSurface} baseId="regional-analysis" label="Regional analysis" variant="pill" wrap /></div>
      <TabPanel baseId="regional-analysis" tab="strength" active={surface}><RegionalStrength /></TabPanel>

      {surface !== "strength" && !loading && options.length > 0 && (
        <TabPanel baseId="regional-analysis" tab={surface} active={surface}>


          {surface === "compare" && <RegionCompareView options={options} regionByDeckId={regionByDeckId} />}

          {surface === "overview" && selectedRegion && <RegionalCompetitionReport region={selectedRegion} group={group} label={selectedOption?.label ?? selectedRegion} />}
          {surface === "overview" && (
            <div className="mt-4">
              <div className="mb-4 flex gap-2">
                <Chip active={overviewTab === "archetypes"} onClick={() => setTab("archetypes")}>Builds</Chip>
                <Chip active={overviewTab === "champions"} onClick={() => setTab("champions")}>Champions</Chip>
              </div>
              {overviewTab === "archetypes" && archetypes.loading && <InlineState>Loading builds…</InlineState>}
              {overviewTab === "champions" && champions.loading && <InlineState>Loading Champions…</InlineState>}
              {overviewTab === "archetypes" && !archetypes.loading && archetypes.rows.length === 0 && <EmptyState title={`No builds in ${selectedOption?.label ?? "this area"} yet`} />}
              {overviewTab === "champions" && !champions.loading && champions.rows.length === 0 && <EmptyState title={`No Champions in ${selectedOption?.label ?? "this area"} yet`} />}
              {overviewTab === "archetypes" && archetypes.rows.length > 0 && <BuildCards rows={archetypes.rows} />}
              {overviewTab === "champions" && champions.rows.length > 0 && <ChampionCards rows={champions.rows} />}
            </div>
          )}

          {surface === "insights" && (
            <div className="mt-4">
              <div className="mb-4 flex gap-2">
                <Chip active={insightTab === "cards"} onClick={() => setTab("cards")}>Cards</Chip>
                <Chip active={insightTab === "keywords"} onClick={() => setTab("keywords")}>Keywords</Chip>
              </div>
              {insightTab === "cards" && cards.loading && <InlineState>Loading cards…</InlineState>}
              {insightTab === "keywords" && keywords.loading && <InlineState>Loading keywords…</InlineState>}
              {insightTab === "cards" && !cards.loading && <>
                <Section heading="dense" title="More common here"><CardLiftList rows={cards.overRepresented} sign="positive" /></Section>
                <Section className="mt-6" heading="dense" title="Less common here"><CardLiftList rows={cards.underRepresented} sign="negative" /></Section>
              </>}
              {insightTab === "keywords" && !keywords.loading && <>
                <Section heading="dense" title="More common here"><KeywordLiftList rows={keywords.overRepresented} sign="positive" /></Section>
                <Section className="mt-6" heading="dense" title="Less common here"><KeywordLiftList rows={keywords.underRepresented} sign="negative" /></Section>
              </>}
              <div className="mt-6 text-xs text-ctp-subtext0"><Link to="/methodology#classification" className="text-ctp-blue hover:underline">How regional differences are calculated</Link></div>
            </div>
          )}

          {surface === "places" && (
            <div className="mt-4">
              {venues.loading && <InlineState>Loading places…</InlineState>}
              {!venues.loading && venues.rows.length === 0 && <EmptyState title={`No venues in ${selectedOption?.label ?? "this area"} yet`} />}
              {venues.rows.length > 0 && <>
                <VenueMap rows={venues.rows} />
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {venues.rows.map((venue) => (
                    <li key={venue.hostId} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="truncate font-medium text-ctp-text">{venue.hostName}</div>{venue.hostAddress && <div className="mt-0.5 line-clamp-2 text-xs text-ctp-subtext0">{venue.hostAddress}</div>}</div>
                        <span className="shrink-0 text-xs text-ctp-subtext0">{venue.eventCount} events</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {venue.events.slice(0, MAX_VENUE_EVENTS_SHOWN).map((event) => <Link key={event.id} to={`/events/${event.id}`} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-blue">{event.name}</Link>)}
                        {venue.events.length > MAX_VENUE_EVENTS_SHOWN && <span className="px-2 py-1 text-xs text-ctp-subtext0">+{venue.events.length - MAX_VENUE_EVENTS_SHOWN}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>}
            </div>
          )}
        </TabPanel>
      )}
    </PageLayout>
  );
}
