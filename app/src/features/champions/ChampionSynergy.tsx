import ReviewedChampionFamilies from "./ReviewedChampionFamilies";
import DiaoArchetypeFamilies from "./DiaoArchetypeFamilies";
import ChampionDecks from "./ChampionDecks";
import ChampionSeasonSnapshot from "./ChampionSeasonSnapshot";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Button from "../../components/ui/Button";
import ArchetypePreview from "../archetypes/ArchetypePreview";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Card, CardImpactEntry, CardInclusionEntry, PlayerTopCard, TopCardsBySection } from "@gatcg/shared";
import { useArchetypeData, useArchetypeTaxonomyData, useCardImpactData, useCardStatsByChampionData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardsByNames } from "../events/useCardsByNames";
import { computeNewReleaseCards } from "../deckbuilder/newReleaseCards";
import TopCardsSections from "../../components/TopCardsSections";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import { VisualCardTile, VisualCommunityGate, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { usePriceTrendByName } from "../pricing/usePriceTrendByName";
import { useSimulatorEvidenceByName } from "../simulator/useSimulatorEvidenceByName";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { championNameToSlug, slugToChampionName } from "../../lib/championSlug";
import { titleCase } from "../../lib/format";
import ElementIcon from "../../components/ElementIcon";
import ClassIcon from "../../components/ClassIcon";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { NewReleaseComboFooter } from "./ChampionSynergyCards";

type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };

const JUMP_SECTIONS = [
  { id: "decks", label: "Decks" },
  { id: "cards", label: "Cards" },
  { id: "season", label: "Season" },
  { id: "new", label: "New Releases" },
  { id: "archetypes", label: "Build families" },
];

/**
 * A single-page "pick a Champion, then narrow by Element/Spirit, see everything at once" view –
 * the EDHRec-commander-page experience translated to Grand Archive. Deliberately separate from
 * `ChampionDetail.tsx` (which stays tabbed, one section at a time, per the earlier page-density
 * work) rather than another tab there: this page shows every section simultaneously, which is
 * exactly the layout a jump-nav earns its keep on.
 *
 * "Level" is informational only, not a data filter – deck-composition/win-rate stats aren't
 * tracked per Champion-print level anywhere in the pipeline (a deck can run any level copy of its
 * Champion), so picking a level only changes which exact print is linked/portrayed.
 */
export default function ChampionSynergy() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = slugToChampionName(name);
  useDocumentTitle(championName, `Card synergies, most-used cards, and archetypes for ${championName} in Grand Archive TCG.`);

  const archetypeData = useArchetypeData();
  const archetypeStatus = usePublishedDataStatus("analysis-archetypes", "/data/analysis/archetypes.json");
  const taxonomyData = useArchetypeTaxonomyData();
  const taxonomyStatus = usePublishedDataStatus("analysis-archetype-taxonomy", "/data/analysis/archetype-taxonomy.json");
  const cardImpactData = useCardImpactData();
  const catalog = useCardCatalog();

  // Same price/trend/simulator/community stat footer as DecklistView's Visual mode and
  // TopCardsSections' grid layout, for the New Releases cards below.
  const priceByName = useDeckPriceByName();
  const priceTrendByName = usePriceTrendByName();
  const simulatorEvidenceByName = useSimulatorEvidenceByName();
  const displayPrefs = useDecklistDisplayPrefs();
  const visualFields: VisualFieldVisibility = {
    cost: displayPrefs.visualCost,
    price: displayPrefs.visualPrice,
    priceTrend: displayPrefs.visualPriceTrend,
    tags: displayPrefs.visualTags,
    simulator: displayPrefs.visualSimulator,
    community: displayPrefs.visualCommunity,
  };

  const champion =
    archetypeData?.archetypes.find((a) => a.signature === championName) ??
    archetypeData?.namedSpirits?.find((s) => s.signature === championName);

  const cardStatsByChampionData = useCardStatsByChampionData();
  /** Card win rate specifically among this Champion's own decks – Champion-wide, not re-scoped per Spirit/Element (that dataset doesn't slice that finely). */
  const winRateByName = useMemo(() => {
    const entry = cardStatsByChampionData?.champions.find((c) => c.championName === championName);
    return entry ? new Map(entry.cards.map((c) => [c.name, { adjustedWinRate: c.adjustedWinRate, deckCount: c.deckCount, baselineWinRate: entry.baselineWinRate }])) : undefined;
  }, [cardStatsByChampionData, championName]);

  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name, c])), [catalog]);

  const championPrints = useMemo(
    () =>
      catalog
        .filter((c) => c.types.includes("CHAMPION") && !c.subtypes.includes("SPIRIT") && c.name.startsWith(`${championName}, `))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    [catalog, championName],
  );

  const [level, setLevel] = useState<number | null>(null);
  const [showAllReleases, setShowAllReleases] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [spiritFilter, setSpiritFilter] = useState<SpiritFilter>({ kind: "all" });
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");

  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setLevel(null);
      setShowAllReleases(false);
      setShowAllPackages(false);
      setSpiritFilter({ kind: "all" });
      setTypeFilter("all");
      prevChampionNameRef.current = championName;
    }
  }, [championName]);

  useEffect(() => {
    setTypeFilter("all");
  }, [spiritFilter]);

  const selectedPrint = championPrints.find((c) => c.level === level) ?? championPrints[championPrints.length - 1];

  const spiritsForElement = useMemo(() => {
    if (!champion || spiritFilter.kind === "all") return [];
    const element = spiritFilter.kind === "element" ? spiritFilter.element : champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement;
    if (!element) return [];
    return champion.spirits.filter((s) => s.spiritElement === element);
  }, [champion, spiritFilter]);

  // Replaces the old "All" filter chip: instead of an aggregate view, the default state shows
  // cards played in common across this Champion's elemental variants – the actual "matches between
  // Wind/Fire/Water" the Most Used Cards section defaults to until a single element is picked.
  const sharedElementCards = useMemo((): TopCardsBySection | null => {
    if (!champion || champion.elementBreakdown.length < 2) return null;
    const sections: (keyof TopCardsBySection)[] = ["main", "material", "sideboard"];
    const result = { main: [], material: [], sideboard: [] } as unknown as TopCardsBySection;
    for (const section of sections) {
      const byName = new Map<string, { card: PlayerTopCard; elementCount: number }>();
      for (const e of champion.elementBreakdown) {
        for (const c of e.topCards[section]) {
          const existing = byName.get(c.name);
          if (existing) existing.elementCount += 1;
          else byName.set(c.name, { card: c, elementCount: 1 });
        }
      }
      result[section] = Array.from(byName.values())
        .filter((v) => v.elementCount >= 2)
        .map((v) => v.card)
        .sort((a, b) => b.deckCount - a.deckCount);
    }
    return result;
  }, [champion]);

  const displayed = useMemo(() => {
    if (!champion) return null;
    if (spiritFilter.kind === "element") {
      const e = champion.elementBreakdown.find((e) => e.element === spiritFilter.element);
      return e ? { topCards: e.topCards, mainByType: e.mainByType, deckCount: e.deckCount } : { topCards: champion.topCards, mainByType: champion.mainByType, deckCount: champion.deckCount };
    }
    if (spiritFilter.kind === "spirit") {
      const s = champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName);
      return s ? { topCards: s.topCards, mainByType: s.mainByType, deckCount: s.deckCount } : { topCards: champion.topCards, mainByType: champion.mainByType, deckCount: champion.deckCount };
    }
    if (sharedElementCards) return { topCards: sharedElementCards, mainByType: undefined, deckCount: champion.deckCount };
    return { topCards: champion.topCards, mainByType: champion.mainByType, deckCount: champion.deckCount };
  }, [champion, spiritFilter, sharedElementCards]);

  // Independent of `displayed` above: the New Releases section's representative "deck" always draws
  // from the Champion's full aggregate (or the selected element/Spirit), never from the narrower
  // shared-cards comparison view, so picking a new-card connection isn't starved by that view's
  // deliberately small overlap set.
  const deckShellTopCards = useMemo(() => {
    if (!champion) return null;
    if (spiritFilter.kind === "element") {
      const e = champion.elementBreakdown.find((e) => e.element === spiritFilter.element);
      return e ? e.topCards : champion.topCards;
    }
    if (spiritFilter.kind === "spirit") {
      const s = champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName);
      return s ? s.topCards : champion.topCards;
    }
    return champion.topCards;
  }, [champion, spiritFilter]);

  const cardsSectionTitle =
    spiritFilter.kind === "element"
      ? `Most used ${titleCase(spiritFilter.element)} cards`
      : spiritFilter.kind === "spirit"
        ? `Most used cards for ${spiritFilter.spiritName}`
        : sharedElementCards
          ? "Cards shared by multiple elements"
          : "Most used cards";

  const typeFilterOptions = useMemo(() => {
    // `mainByType` can be briefly absent even once `displayed` exists – a client with a cached
    // `archetypes.json` predating this field gets served that stale copy immediately (see
    // usePublishedData's cache-then-refresh behavior) before the background refetch replaces it.
    if (!displayed?.mainByType) return [];
    return Object.entries(displayed.mainByType)
      .map(([type, cards]) => ({ type, total: cards.reduce((sum, c) => sum + c.deckCount, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [displayed]);

  const displayedMainCards = typeFilter === "all" ? undefined : displayed?.mainByType?.[typeFilter];

  const allTopCardNames = useMemo(() => {
    if (!displayed) return [];
    const names = new Set([...displayed.topCards.main, ...displayed.topCards.material, ...displayed.topCards.sideboard].map((c) => c.name));
    if (displayed.mainByType) {
      for (const cards of Object.values(displayed.mainByType)) for (const c of cards) names.add(c.name);
    }
    return Array.from(names);
  }, [displayed]);
  const cardImages = useCardsByNames(allTopCardNames);

  // Stand-in "deck" for the new-release synergy check – this page has no assembled decklist of its
  // own, so the champion's own most-played Main+Material cards serve as the representative shell.
  const representativeDeckCards = useMemo(() => {
    if (!deckShellTopCards) return [];
    const names = [...deckShellTopCards.main, ...deckShellTopCards.material].map((c) => c.name);
    return names.map((n) => catalogByName.get(n)).filter((c): c is Card => c !== undefined);
  }, [deckShellTopCards, catalogByName]);

  // Elements this Champion (or, on a named-Spirit page, the Spirit itself) can actually cast –
  // scoped to whichever bucket is currently displayed so a card only reachable via a *different*
  // Spirit/element than the one shown isn't recommended as a New Release connection. Reads straight
  // off the archetype data's own `elements`/`spiritElement` fields rather than a catalog card's
  // `.elements`: `championPrints` (and so `selectedPrint`) is always empty on a named-Spirit page
  // (its Champion-type card is SPIRIT-subtype, filtered out by that query), which previously left
  // `identityElements` empty there – and an empty set makes `isElementCompatible` pass every card
  // through unfiltered, so e.g. an Exia card could get "recommended" for a Spirit with no Exia
  // access at all. `champion.elements` is already the same field the header above renders for both
  // Champions and named Spirits, so it's a real, populated value in both cases.
  const identityElements = useMemo(() => {
    if (!champion) return new Set<string>();
    if (spiritFilter.kind === "element") return new Set([spiritFilter.element]);
    if (spiritFilter.kind === "spirit") {
      const spiritElement = champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement;
      if (spiritElement) return new Set([spiritElement]);
    }
    return new Set(champion.elements.filter((e) => e !== "NORM"));
  }, [champion, spiritFilter]);

  const newReleaseCards = useMemo(() => {
    if (representativeDeckCards.length === 0) return [];
    const includedNames = new Set(representativeDeckCards.map((c) => c.name));
    return computeNewReleaseCards(catalogByName.values(), representativeDeckCards, identityElements, includedNames);
  }, [catalogByName, representativeDeckCards, identityElements]);

  const engines = useMemo(() => (taxonomyData?.clusters ?? [])
    .filter((build) => build.championBreakdown.some((entry) => entry.championName === championName))
    .map((build) => ({ ...build, seedBuildId: build.id, relationships: (taxonomyData?.engineArchetypes ?? [])
      .filter((engine) => engine.buildIds.includes(build.id) && engine.championBreakdown.length > 1) }))
    .sort((a, b) => b.playerCount - a.playerCount || a.id.localeCompare(b.id)), [taxonomyData, championName]);

  // Real tournament win rate for a linked card, not simulator telemetry – Card Impact is published
  // per named build (cluster), so when a card shows up in more than one of this Champion's builds,
  // keep whichever entry has the larger sample (deckCountWith) rather than averaging across builds.
  const cardImpactByName = useMemo(() => {
    if (!cardImpactData) return undefined;
    const map = new Map<string, { entry: CardImpactEntry; clusterName: string }>();
    for (const cluster of cardImpactData.clusters) {
      if (cluster.championName !== championName) continue;
      for (const entry of cluster.cards) {
        const existing = map.get(entry.cardName);
        if (!existing || entry.deckCountWith > existing.entry.deckCountWith) {
          map.set(entry.cardName, { entry, clusterName: cluster.clusterName });
        }
      }
    }
    return map;
  }, [cardImpactData, championName]);

  if (archetypeData && !champion) {
    return (
      <PageLayout width="wide" data-component="ChampionSynergy">
        <EmptyState
          title="Champion not found"
          description={<>Champion "{championName}" hasn't cleared the sample-size threshold (or doesn't exist).</>}
          action={<Link to="/champions" className="text-ctp-blue hover:underline">&larr; All champions</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="wide" data-component="ChampionSynergy">
      <PublishedSourceStatus label="Champion statistics" status={archetypeStatus} hasData={!!archetypeData} />
      {champion && (() => {
        const champ = champion;
        const body = (communityInclusionByName: Map<string, CardInclusionEntry> | undefined) => (
        <>
          <div className="identity-surface rounded-3xl rounded-br-lg p-5 sm:p-6">
          <PageHeader
            title={champ.signature}
            eyebrow={<Link to="/champions" className="inline-flex min-h-control items-center rounded focus-visible:outline-2">&larr; All Champions</Link>}
            description={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  {champ.classes.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full border border-ctp-surface1 bg-ctp-mantle py-0.5 pl-1 pr-2 text-xs font-medium text-ctp-subtext1">
                      <ClassIcon cardClass={c} size={12} />
                      {titleCase(c)}
                    </span>
                  ))}
                  {champ.elements.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 rounded-full border border-ctp-surface1 bg-ctp-mantle py-0.5 pl-1 pr-2 text-xs font-medium text-ctp-subtext1">
                      <ElementIcon element={e} size={12} />
                      {titleCase(e)}
                    </span>
                  ))}
                </span>
                <span className="text-ctp-subtext1">
                  <strong className="font-semibold text-ctp-text">{champ.deckCount.toLocaleString()}</strong> decks ·{" "}
                  <strong className="font-semibold text-ctp-text">{champ.eventCount.toLocaleString()}</strong> events
                </span>
              </div>
            }
            actions={<Link to={`/champions/${championNameToSlug(championName)}/stats`} className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2">Full stats &amp; season history &rarr;</Link>}
          />
          </div>

          <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-y border-ctp-surface1 py-2 text-xs">
            {JUMP_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-control items-center rounded px-2 text-ctp-blue hover:underline focus-visible:outline-2">
                {s.label}
              </a>
            ))}
          </nav>

          <div className="space-y-8">
            <ChampionDecks key={championName} championName={championName} />
            <Section id="cards" className="scroll-mt-48" title="Cards you'll see most" description="Frequently played main deck cards across this champion's recorded decks. Full lists and filters are available below.">
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {champ.topCards.main.slice(0, 4).map((entry) => {
                  const card = cardImages.get(entry.name) ?? catalogByName.get(entry.name);
                  const slug = card?.slug ?? entry.slug;
                  const content = <><CardArtTile card={card} name={entry.name} /><span className="mt-2 block text-sm font-medium text-ctp-text">{entry.name}</span><span className="mt-1 block text-sm text-ctp-subtext1">{entry.deckCount.toLocaleString()} decks</span></>;
                  return slug ? <Link key={entry.name} to={`/cards/${slug}`} className="min-w-0 rounded-xl bg-ctp-mantle p-3 hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={entry.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">{content}</div>;
                })}
              </div>
              {champ.topCards.main.length === 0 && <InlineState>No main deck card statistics are available yet.</InlineState>}
              <details className="group/cards mt-4 border-t border-ctp-surface1">
                <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-ctp-blue focus-visible:outline-2">Browse cards and filters<DisclosureChevron className="group-open/cards:rotate-180" /></summary>
                <p className="mb-4 text-sm text-ctp-subtext1">Element and spirit filters apply to these detailed lists and new release connections. The preview above, decks, and season results cover the whole champion.</p>
                {championPrints.length > 1 && (
                  <div className="mb-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
                    <h3 className="text-sm text-ctp-subtext1">Champion print · Lv{selectedPrint?.level ?? "?"}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {championPrints.map((c) => {
                        const selected = selectedPrint?.name === c.name;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setLevel(c.level ?? null)}
                            aria-pressed={selected}
                            className={`relative min-h-control rounded-lg border p-1.5 text-left transition-all duration-200 ease-out active:scale-[0.97] ${
                              selected
                                ? "border-ctp-blue bg-ctp-blue/10 shadow-md shadow-ctp-blue/20"
                                : "border-ctp-surface1 bg-ctp-mantle hover:-translate-y-0.5 hover:border-ctp-surface2 hover:shadow-md hover:shadow-black/20"
                            }`}
                          >
                            {selected && (
                              <span className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-ctp-blue text-ctp-base">
                                <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M3 8.5l3 3 7-7" />
                                </svg>
                              </span>
                            )}
                            <VisualCardTile
                              line={{ card: c.name, quantity: 1 }}
                              card={c}
                              unitPrice={priceByName.get(c.name)}
                              priceTrend={priceTrendByName.get(c.name)}
                              simulatorEvidence={simulatorEvidenceByName.get(c.name)}
                              communityEntry={communityInclusionByName?.get(c.name)}
                              fields={visualFields}
                              linkToCard={false}
                            />
                            <div className={`mt-1 text-center text-xs ${selected ? "font-semibold text-ctp-blue" : "text-ctp-subtext1"}`}>
                              Lv{c.level ?? "?"} · {c.name.split(",")[1]?.trim()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-ctp-subtext0">Changes the linked print, not the deck statistics.</div>
                  </div>
                )}

                {champ.elementBreakdown.length > 1 && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-ctp-subtext0">Element:</span>
                    {champ.elementBreakdown.map((e) => {
                      const active =
                        (spiritFilter.kind === "element" && spiritFilter.element === e.element) ||
                        (spiritFilter.kind === "spirit" && champ.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement === e.element);
                      return (
                        <Button
                          key={e.element}
                          aria-pressed={active} className={active ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : ""}
                          onClick={() => setSpiritFilter(active ? { kind: "all" } : { kind: "element", element: e.element })}
                        >
                          {titleCase(e.element)} ({e.deckCount})
                        </Button>
                      );
                    })}
                  </div>
                )}

                {spiritsForElement.length > 1 && (
                  <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-ctp-subtext0">Spirit:</span>
                    {spiritsForElement.map((s) => (
                      <Button key={s.spiritName} size="sm" aria-pressed={spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName} variant={spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName ? "primary" : "secondary"} onClick={() => setSpiritFilter({ kind: "spirit", spiritName: s.spiritName })}>
                        {s.spiritName} ({s.deckCount})
                      </Button>
                    ))}
                  </div>
                )}


                <h3 className="my-3 text-lg font-semibold text-ctp-text">{cardsSectionTitle}</h3>
                {typeFilterOptions.length > 0 && <div className="my-3 flex flex-wrap items-center gap-2" aria-label="Card type">
                  <Button size="sm" aria-pressed={typeFilter === "all"} variant={typeFilter === "all" ? "primary" : "secondary"} onClick={() => setTypeFilter("all")}>All card types</Button>
                  {typeFilterOptions.map(({ type }) => <Button key={type} size="sm" aria-pressed={typeFilter === type} variant={typeFilter === type ? "primary" : "secondary"} onClick={() => setTypeFilter(type)}>{titleCase(type)}</Button>)}
                </div>}
                {displayed && <TopCardsSections topCards={displayed.topCards} cardImages={cardImages} mainOverride={displayedMainCards} layout="grid" winRateByName={winRateByName} initialVisible={4} />}
              </details>
            </Section>
            <ChampionSeasonSnapshot key={`season-${championName}`} championName={championName} />

            <Section
              id="new"
              className="scroll-mt-48"
              description={spiritFilter.kind === "element" ? `Connections for ${titleCase(spiritFilter.element)} decks. Change the scope in Browse cards and filters.` : spiritFilter.kind === "spirit" ? `Connections for ${spiritFilter.spiritName} decks. Change the scope in Browse cards and filters.` : "Connections across this champion’s recorded decks."}
              title={newReleaseCards.length > 0 ? `New from ${newReleaseCards[0].setName}` : "New releases"}
            >
              {newReleaseCards.length === 0 ? (
                <InlineState className="mt-2 text-sm">No new-set cards connect to {champ.signature}'s most-played cards yet.</InlineState>
              ) : (
                <div className="mt-3 grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
                  {(showAllReleases ? newReleaseCards : newReleaseCards.slice(0, 4)).map(({ card, combos }) => (
                    <article key={card.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
                      <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
                        <CardArtTile card={card} name={card.name} />
                        <span className="mt-2 block text-sm font-medium text-ctp-text">{card.name}</span>
                      </Link>
                      <NewReleaseComboFooter
                        combos={combos}
                        stats={{ priceByName, priceTrendByName, simulatorEvidenceByName, communityInclusionByName, cardImpactByName, fields: visualFields }}
                      />
                    </article>
                  ))}
                </div>
              )}
              {newReleaseCards.length > 4 && <Button type="button" onClick={() => setShowAllReleases((value) => !value)} aria-expanded={showAllReleases} className="mt-3 min-h-control rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2">{showAllReleases ? "Show fewer new cards" : `Show all ${newReleaseCards.length} new cards`}</Button>}
            </Section>

            <Section
              id="archetypes"
              className="scroll-mt-48"
              title={["Diao Chan", "Silvie", "Guo Jia", "Rai", "Zander", "Tristan", "Alice"].includes(championName) ? "Archetypes and build variants" : "Build families"}
              description="Explore the cards that distinguish each family. A family can contain several different decklists."
              actions={<Link to="/archetypes" className="inline-flex min-h-12 items-center rounded text-xs text-ctp-blue hover:underline focus-visible:outline-2">All archetypes &rarr;</Link>}
            >
              {!taxonomyData ? (
                <InlineState className="mt-2 text-sm">{taxonomyStatus.phase === "error" ? <><span className="block">{taxonomyStatus.error}</span><button type="button" className="min-h-12 rounded px-3 text-ctp-blue focus-visible:outline-2" onClick={taxonomyStatus.retry}>Retry archetype analysis</button></> : "Loading archetype analysis…"}</InlineState>
              ) : championName === "Diao Chan" ? (
                <DiaoArchetypeFamilies taxonomy={taxonomyData} catalog={catalogByName} />
              ) : championName === "Silvie" || championName === "Guo Jia" || championName === "Rai" || championName === "Zander" || championName === "Tristan" || championName === "Alice" ? (
                <ReviewedChampionFamilies championName={championName} taxonomy={taxonomyData} catalog={catalogByName} />
              ) : engines.length === 0 ? (
                <InlineState className="mt-2 text-sm">No named builds have cleared the sample-size threshold yet.</InlineState>
              ) : (
                <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
                  {(showAllPackages ? engines : engines.slice(0, 2)).map((engine) => {
                    const namingCards = engine.namingCards ?? engine.definingCards.slice(0, 3).map((card) => card.name);
                    return (
                      <article key={engine.id} className="identity-surface min-w-0 rounded-3xl rounded-br-lg p-4 sm:p-5">
                        <ArchetypePreview names={namingCards} cardImages={catalogByName} />
                        <div className="mt-3 flex items-center gap-2">
                          <Link to={`/archetypes/${engine.seedBuildId}`} className="inline-flex min-h-12 items-center rounded text-lg font-semibold text-ctp-text hover:text-ctp-blue focus-visible:outline-2">{engine.name}</Link>
                        </div>
                        <p className="mt-1 text-xs text-ctp-subtext1">{engine.playerCount} players · {(engine.avgWinRate * 100).toFixed(0)}% win rate</p>
                        <details className="group/build mt-2 border-t border-ctp-surface1 text-sm text-ctp-subtext1"><summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">Cards and evidence<DisclosureChevron className="group-open/build:rotate-180" /></summary><p className="my-2">{engine.deckCount} decks · {engine.eventCount} events. Common cards across this family, not an exact decklist or required core.</p><ArchetypePreview names={engine.definingCards.slice(0, 6).map(card => card.name)} cardImages={catalogByName} />
                        {engine.relationships.map((relationship) => (
                          <div key={relationship.id} className="mt-4 border-t border-ctp-surface1 pt-3 text-sm text-ctp-subtext1">
                            <h4 className="font-medium text-ctp-text">
                              {relationship.status === "shared" ? "Shared with other champions" : "Candidate overlap with other champions"}
                            </h4>
                            <p className="mt-2 font-medium">{relationship.name}</p>
                            <p className="mt-1">{relationship.status === "shared" ? "Recurring multi-card package with independent player and event evidence." : "Evidence is insufficient to establish a shared archetype."}</p>
                            {(relationship.championEvidence ?? relationship.championBreakdown).map((entry) => <p key={entry.championName} className="mt-2"><Link className="inline-flex min-h-12 items-center text-ctp-blue" to={`/champions/${championNameToSlug(entry.championName)}`}>{entry.championName}</Link>{"qualifying" in entry && entry.qualifying ? " (qualifying evidence)" : " (limited evidence)"}: {entry.deckCount} decks · {entry.playerCount} players · {"eventCount" in entry ? String(entry.eventCount) : "–"} events</p>)}
                            {[{ label: "Common core", cards: relationship.commonCore ?? relationship.definingCards }, { label: `${championName}-specific cards`, cards: relationship.championEvidence?.find((entry) => entry.championName === championName)?.differentiatorCards ?? [] }].map((section) => <div key={section.label} className="mt-3">
                              <p className="mb-2 font-medium">{section.label}</p>{section.label === "Common core" && <p className="mb-2">Includes cohort staples; only enriched recurring cards establish a shared package.</p>}
                              <div className="grid grid-cols-3 gap-2">{section.cards.map((entry) => {
                                const card = catalogByName.get(entry.name);
                                const content = <><CardArtTile card={card} name={entry.name} /><span className="mt-1 block">{entry.name}</span></>;
                                return card ? <Link key={entry.name} to={`/cards/${card.slug}`} className="min-w-0 rounded focus-visible:outline-2">{content}</Link> : <div key={entry.name}>{content}</div>;
                              })}</div>
                              {section.cards.length === 0 && <p>No recurring differentiators identified.</p>}
                            </div>)}
                          </div>
                        ))}
                        <Link className="inline-flex min-h-control items-center rounded text-ctp-blue focus-visible:outline-2" to={`/archetypes/mine?build=${engine.id}`}>Curate this family</Link>
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}
              {!["Diao Chan", "Silvie", "Guo Jia", "Rai", "Zander", "Tristan", "Alice"].includes(championName) && engines.length > 2 && <Button type="button" onClick={() => setShowAllPackages((value) => !value)} aria-expanded={showAllPackages} className="mt-3 min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">{showAllPackages ? "Show fewer families" : `Show all ${engines.length} families`}</Button>}
            </Section>
          </div>
        </>
        );
        return displayPrefs.visualCommunity ? <VisualCommunityGate>{body}</VisualCommunityGate> : body(undefined);
      })()}
    </PageLayout>
  );
}
