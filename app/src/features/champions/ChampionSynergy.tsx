import { championMetadata, discoverySocial } from "@gatcg/shared";
import ChampionIdentity from "./ChampionIdentity";
import ChampionRelationships from "./ChampionRelationships";
import ChampionDecks from "./ChampionDecks";
import ChampionSeasonSnapshot from "./ChampionSeasonSnapshot";
import ChampionStaples from "./ChampionStaples";
import ChampionPageLinks from "./ChampionPageLinks";
import ChampionPackage from "./ChampionPackage";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Button from "../../components/ui/Button";
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
import { VisualCommunityGate, type VisualFieldVisibility } from "../../components/VisualCardTile";
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
  { id: "cards", label: "Cards" },
  { id: "decks", label: "Decks" },
  { id: "season", label: "Season" },
  { id: "new", label: "New releases" },
  { id: "relationships", label: "Shared cards" },
];

export default function ChampionSynergy() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = slugToChampionName(name);
  const seo = championMetadata(championName);
  const archetypesPath = `/archetypes/champion/${championNameToSlug(championName)}`;
  useDocumentTitle(seo.title, seo.description, seo.path, discoverySocial(seo));

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

  const [showAllReleases, setShowAllReleases] = useState(false);
  const [spiritFilter, setSpiritFilter] = useState<SpiritFilter>({ kind: "all" });
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");

  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setShowAllReleases(false);
      setSpiritFilter({ kind: "all" });
      setTypeFilter("all");
      prevChampionNameRef.current = championName;
    }
  }, [championName]);

  useEffect(() => {
    setTypeFilter("all");
  }, [spiritFilter]);

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

  // Scope new-release candidates to the elements playable by the selected decks.
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
            spacing="contained"
            title={champ.signature}
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
            actions={<div id="archetypes" className="flex scroll-mt-24 flex-wrap gap-x-4">
              <Link to={archetypesPath} className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2">Browse archetypes</Link>
            </div>}
          />
          <ChampionPageLinks championName={championName} />
          <ChampionIdentity championName={championName} fallbackNames={champ.topCards.material.map((card) => card.name)} contained />
          </div>

          <nav aria-label="On this champion page" className="mb-6 mt-4 flex flex-wrap gap-x-4 border-b border-ctp-surface1 text-sm">
            {JUMP_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-control items-center rounded px-2 text-ctp-blue hover:underline focus-visible:outline-2">
                {s.label}
              </a>
            ))}
          </nav>

          <div className="space-y-8">
            <Section id="cards" className="scroll-mt-48" title="Staples">
              <ChampionStaples key={championName} championName={championName} embedded />
              <details className="group/cards mt-4 border-t border-ctp-surface1">
                <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-ctp-blue focus-visible:outline-2">Browse by Spirit and element<DisclosureChevron className="group-open/cards:rotate-180" /></summary>
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
            <ChampionDecks key={championName} championName={championName} />
            <ChampionPackage key={`package-${championName}`} championName={championName} />
            <ChampionSeasonSnapshot key={`season-${championName}`} championName={championName} />

            <Section
              id="new"
              className="scroll-mt-48"
              description={spiritFilter.kind === "element" ? `Connections for ${titleCase(spiritFilter.element)} decks. Change the scope in Browse by Spirit and element.` : spiritFilter.kind === "spirit" ? `Connections for ${spiritFilter.spiritName} decks. Change the scope in Browse by Spirit and element.` : "Connections across this champion’s recorded decks."}
              title="New release candidates"
            >
              {newReleaseCards.length === 0 ? (
                <InlineState className="mt-2 text-sm">No new-set cards connect to {champ.signature}'s most-played cards yet.</InlineState>
              ) : (
                <div className="mt-3 grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
                  {(showAllReleases ? newReleaseCards : newReleaseCards.slice(0, 4)).map(({ card, combos, setPrefix, releaseDate }) => (
                    <article key={card.name} className="min-w-0 rounded-xl bg-ctp-mantle p-3">
                      <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
                        <CardArtTile card={card} name={card.name} />
                        <span className="mt-2 block text-sm font-medium text-ctp-text">{card.name}</span>
                      </Link>
                      <p className="mt-2 text-xs text-ctp-subtext0">{setPrefix} · {releaseDate}</p>
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

            <ChampionRelationships championName={championName} taxonomy={taxonomyData} catalog={catalogByName} error={taxonomyStatus.phase === "error" ? taxonomyStatus.error : undefined} onRetry={taxonomyStatus.retry} />


          </div>
        </>
        );
        return displayPrefs.visualCommunity ? <VisualCommunityGate>{body}</VisualCommunityGate> : body(undefined);
      })()}
    </PageLayout>
  );
}
