import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRegionalDecks } from "./useRegionalDecks";
import { useRegionalArchetypes } from "./useRegionalArchetypes";
import { useRegionalChampions } from "./useRegionalChampions";
import { useRegionalCardComposition, type RegionalCardRow } from "./useRegionalCardComposition";
import { useRegionalKeywords, type RegionalKeywordRow } from "./useRegionalKeywords";
import { useRegionalVenues } from "./useRegionalVenues";
import { useRegionDecodedDecks } from "./useRegionDecodedDecks";
import RegionCompareView from "./RegionCompareView";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { formatUsd } from "../../lib/format";
import type { RegionGroupMode } from "../../lib/regions";
import PageHeader from "../../components/ui/PageHeader";
import FilterBar from "../../components/ui/FilterBar";
import Tabs from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

const GROUP_MODES: RegionGroupMode[] = ["country", "region"];
const GROUP_LABELS: Record<RegionGroupMode, string> = { country: "Country", region: "Region" };

type ViewMode = "single" | "compare";
const VIEW_MODES: ViewMode[] = ["single", "compare"];
const VIEW_LABELS: Record<ViewMode, string> = { single: "Single Region", compare: "Compare Regions" };

type ContentTab = "archetypes" | "champions" | "cards" | "keywords" | "venues";
const CONTENT_TABS: ContentTab[] = ["archetypes", "champions", "cards", "keywords", "venues"];
const CONTENT_LABELS: Record<ContentTab, string> = {
  archetypes: "Archetypes",
  champions: "Champions",
  cards: "Card Composition",
  keywords: "Keywords",
  venues: "Venues",
};

const MAX_VENUE_EVENTS_SHOWN = 3;

function LiftBadges({ lift, sign, regionRate, globalRate }: { lift: number; sign: "positive" | "negative"; regionRate: number; globalRate: number }) {
  return (
    <>
      <span className={`ml-auto shrink-0 text-xs ${sign === "positive" ? "text-ctp-green" : "text-ctp-red"}`}>
        {lift >= 0 ? "+" : ""}
        {(lift * 100).toFixed(1)}pp
      </span>
      <span className="shrink-0 text-xs text-ctp-subtext0">
        {(regionRate * 100).toFixed(0)}% here vs {(globalRate * 100).toFixed(0)}% overall
      </span>
    </>
  );
}

function CardLiftList({ rows, sign }: { rows: RegionalCardRow[]; sign: "positive" | "negative" }) {
  const cardsByName = useCardsByNames(useMemo(() => rows.map((r) => r.cardName), [rows]));
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((r) => {
        const card = cardsByName.get(r.cardName);
        return (
          <li key={r.cardName} className="flex flex-wrap items-center gap-1.5 text-sm">
            {card ? (
              <CardHoverPreview image={card.editions[0]?.image} alt={r.cardName}>
                <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                  {r.cardName}
                </Link>
              </CardHoverPreview>
            ) : (
              <span className="text-ctp-text">{r.cardName}</span>
            )}
            <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
              {(r.avgWinRate * 100).toFixed(0)}% win rate
            </span>
            {r.marketPrice !== null && (
              <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{formatUsd(r.marketPrice)}</span>
            )}
            <LiftBadges lift={r.lift} sign={sign} regionRate={r.regionRate} globalRate={r.globalRate} />
          </li>
        );
      })}
    </ul>
  );
}

function KeywordLiftList({ rows, sign }: { rows: RegionalKeywordRow[]; sign: "positive" | "negative" }) {
  if (rows.length === 0) return <InlineState className="text-sm">Nothing clears the sample bar yet.</InlineState>;
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((r) => (
        <li key={r.keyword} className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-ctp-text">{r.keyword}</span>
          <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
            {(r.avgWinRate * 100).toFixed(0)}% win rate
          </span>
          <LiftBadges lift={r.lift} sign={sign} regionRate={r.regionRate} globalRate={r.globalRate} />
        </li>
      ))}
    </ul>
  );
}

export default function RegionsIndex() {
  useDocumentTitle(
    "Regions",
    "Grand Archive TCG meta stats broken out by region — archetypes, champions, card composition, and keywords.",
  );
  const [group, setGroup] = useTabParam<RegionGroupMode>("group", GROUP_MODES, "country");
  const [view, setView] = useTabParam<ViewMode>("view", VIEW_MODES, "single");
  const [tab, setTab] = useTabParam<ContentTab>("tab", CONTENT_TABS, "archetypes");
  const [searchParams, setSearchParams] = useSearchParams();
  // Backed by `?region=` (not useTabParam — its valid-values list is dynamic, one per loaded
  // region/country) so a link from another page (e.g. a player's country) can land here already
  // pointed at the right region, and the current selection stays in the URL to share.
  const [regionOverride, setRegionOverride] = useState<string | null>(() => searchParams.get("region"));

  const { loading, options, regionByDeckId } = useRegionalDecks(group);
  const selectedRegion =
    regionOverride && options.some((o) => o.code === regionOverride) ? regionOverride : (options[0]?.code ?? null);
  const selectedOption = options.find((o) => o.code === selectedRegion);

  function selectRegion(code: string) {
    setRegionOverride(code);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("region", code);
      return next;
    });
  }

  const archetypes = useRegionalArchetypes(regionByDeckId, selectedRegion);
  const champions = useRegionalChampions(regionByDeckId, selectedRegion);
  const regionDecks = useRegionDecodedDecks(regionByDeckId, selectedRegion);
  const cards = useRegionalCardComposition(regionDecks);
  const keywords = useRegionalKeywords(regionDecks);
  const venues = useRegionalVenues(group, selectedRegion);

  return (
    <PageLayout>
      <PageHeader title="Regions" description="Compare archetypes, Champions, card composition, keywords, and venues across countries or broader competitive regions." />

      <FilterBar>
        <div><div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0">Group events by</div><div className="flex flex-wrap items-center gap-2">
        {GROUP_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setGroup(m);
              setRegionOverride(null);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("region");
                return next;
              });
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              group === m ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            By {GROUP_LABELS[m]}
          </button>
        ))}
        </div></div>
      </FilterBar>

      {loading && <InlineState className="mt-6">Loading…</InlineState>}

      {!loading && options.length === 0 && <InlineState className="mt-6">Not enough data yet.</InlineState>}

      {!loading && options.length > 0 && (
        <>
          <div className="mt-4"><Tabs tabs={VIEW_MODES.map((key) => ({ key, label: VIEW_LABELS[key] }))} active={view} onChange={setView} label="Regional analysis mode" /></div>

          {view === "compare" && <RegionCompareView options={options} regionByDeckId={regionByDeckId} />}

          {view === "single" && (
          <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ctp-subtext0">{GROUP_LABELS[group]}:</span>
            <select
              value={selectedRegion ?? ""}
              onChange={(e) => selectRegion(e.target.value)}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label} ({o.deckCount} decks)
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-1 text-xs">
            {CONTENT_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md border px-2 py-1 ${
                  tab === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {CONTENT_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "archetypes" && (
              <>
                {archetypes.loading && <InlineState>Loading…</InlineState>}
                {!archetypes.loading && archetypes.rows.length === 0 && (
                  <InlineState className="text-sm">No named builds have enough decks in {selectedOption?.label} yet.</InlineState>
                )}
                {archetypes.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-max min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                          <th className="py-1 pr-6">Build</th>
                          <th className="py-1 pr-6">Champion</th>
                          <th className="py-1 pr-6">Decks</th>
                          <th className="py-1 pr-6">Share</th>
                          <th className="py-1">Win rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                        {archetypes.rows.map((r) => (
                          <tr key={r.id}>
                            <td className="py-1.5 pr-6 whitespace-nowrap">
                              <Link to={`/archetypes/${r.id}`} className="text-ctp-text hover:text-ctp-blue">
                                {r.name}
                              </Link>
                            </td>
                            <td className="py-1.5 pr-6 whitespace-nowrap">
                              <Link to={`/champions/${encodeURIComponent(r.championName)}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                                {r.championName}
                              </Link>
                            </td>
                            <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCount}</td>
                            <td className="py-1.5 pr-6 text-ctp-subtext1">{(r.share * 100).toFixed(1)}%</td>
                            <td className="py-1.5 text-ctp-subtext1">{(r.avgWinRate * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "champions" && (
              <>
                {champions.loading && <InlineState>Loading…</InlineState>}
                {!champions.loading && champions.rows.length === 0 && (
                  <InlineState className="text-sm">Not enough decks in {selectedOption?.label} yet.</InlineState>
                )}
                {champions.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-max min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                          <th className="py-1 pr-6">Champion</th>
                          <th className="py-1 pr-6">Decks</th>
                          <th className="py-1 pr-6">Share</th>
                          <th className="py-1">Win rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                        {champions.rows.map((r) => (
                          <tr key={r.championName}>
                            <td className="py-1.5 pr-6 whitespace-nowrap">
                              <Link to={`/champions/${encodeURIComponent(r.championName)}`} className="text-ctp-text hover:text-ctp-blue">
                                {r.championName}
                              </Link>
                            </td>
                            <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCount}</td>
                            <td className="py-1.5 pr-6 text-ctp-subtext1">{(r.share * 100).toFixed(1)}%</td>
                            <td className="py-1.5 text-ctp-subtext1">{(r.avgWinRate * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "cards" && (
              <>
                {cards.loading && <InlineState>Loading…</InlineState>}
                {!cards.loading && (
                  <>
                    <p className="text-xs text-ctp-subtext0">
                      Cards used more or less often in {selectedOption?.label} than in the overall meta — correlational,
                      not a guarantee.
                    </p>
                    <Section className="mt-4" heading="dense" title="Over-represented">
                      <CardLiftList rows={cards.overRepresented} sign="positive" />
                    </Section>
                    <Section className="mt-6" heading="dense" title="Under-represented">
                      <CardLiftList rows={cards.underRepresented} sign="negative" />
                    </Section>
                  </>
                )}
              </>
            )}

            {tab === "keywords" && (
              <>
                {keywords.loading && <InlineState>Loading…</InlineState>}
                {!keywords.loading && (
                  <>
                    <p className="text-xs text-ctp-subtext0">
                      Ability keywords (Ranged, Swift, Bulwark, ...) used more or less often in {selectedOption?.label}'s
                      main+material decklists than in the overall meta — correlational, not a guarantee.
                    </p>
                    <Section className="mt-4" heading="dense" title="Over-represented">
                      <KeywordLiftList rows={keywords.overRepresented} sign="positive" />
                    </Section>
                    <Section className="mt-6" heading="dense" title="Under-represented">
                      <KeywordLiftList rows={keywords.underRepresented} sign="negative" />
                    </Section>
                  </>
                )}
              </>
            )}

            {tab === "venues" && (
              <>
                {venues.loading && <InlineState>Loading…</InlineState>}
                {!venues.loading && venues.rows.length === 0 && (
                  <InlineState className="text-sm">No venue records for {selectedOption?.label} yet.</InlineState>
                )}
                {venues.rows.length > 0 && (
                  <>
                    <p className="text-xs text-ctp-subtext0">
                      Omnidex venue records with events in {selectedOption?.label} — grouped by venue id, not name, since some venues rename over time. No mapping data is published, so this is a list, not a map.
                    </p>
                    <ul className="mt-3 space-y-3">
                      {venues.rows.map((v) => (
                        <li key={v.hostId} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-ctp-text">{v.hostName}</span>
                            <span className="text-xs text-ctp-subtext0">{v.eventCount} event{v.eventCount === 1 ? "" : "s"}</span>
                          </div>
                          {v.hostAddress && <p className="mt-0.5 text-xs text-ctp-subtext0">{v.hostAddress}</p>}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {v.events.slice(0, MAX_VENUE_EVENTS_SHOWN).map((e) => (
                              <Link
                                key={e.id}
                                to={`/events/${e.id}`}
                                className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue"
                              >
                                {e.name} <span className="text-ctp-subtext0">({new Date(e.date).toLocaleDateString()})</span>
                              </Link>
                            ))}
                            {v.events.length > MAX_VENUE_EVENTS_SHOWN && (
                              <span className="px-2 py-1 text-ctp-subtext0">+{v.events.length - MAX_VENUE_EVENTS_SHOWN} more</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
          </>
          )}
        </>
      )}
    </PageLayout>
  );
}
