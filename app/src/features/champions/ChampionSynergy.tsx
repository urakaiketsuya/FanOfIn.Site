import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Card, CardImpactEntry, CardInclusionEntry, PlayerTopCard, TopCardsBySection } from "@gatcg/shared";
import { useArchetypeData, useArchetypeTaxonomyData, useCardImpactData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardsByNames } from "../events/useCardsByNames";
import { computeNewReleaseCards, type NewReleaseCombo } from "../deckbuilder/newReleaseCards";
import TopCardsSections from "../../components/TopCardsSections";
import CardHoverPreview from "../../components/CardHoverPreview";
import { CardStatRows, VisualCardTile, VisualCommunityGate, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { usePriceTrendByName, type PriceTrendEntry } from "../pricing/usePriceTrendByName";
import { useSimulatorEvidenceByName } from "../simulator/useSimulatorEvidenceByName";
import type { SimulatorCardEvidence } from "../deckbuilder/useSimulatorSuggestedBuild";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { championNameToSlug, slugToChampionName } from "../../lib/championSlug";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import Chip from "../../components/ui/Chip";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };

const JUMP_SECTIONS = [
  { id: "new", label: "New Releases" },
  { id: "cards", label: "Most Used Cards" },
  { id: "archetypes", label: "Packages" },
];

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** Same price/trend/simulator/community lookups the main tile uses, threaded down to each linked
 * card so it gets the identical stat treatment rather than just a bare name. */
interface LinkedCardStatSources {
  priceByName: Map<string, number>;
  priceTrendByName: Map<string, PriceTrendEntry>;
  simulatorEvidenceByName: Map<string, SimulatorCardEvidence>;
  communityInclusionByName: Map<string, CardInclusionEntry> | undefined;
  /** Tournament Card Impact, not simulator — real per-cluster win rate for decks running this
   * card, scoped to whichever of this Champion's named builds has the most data for it (mirrors
   * the "default to most-played, don't flatten across clusters" pattern `useBuildCounters.ts` uses
   * for matchups). Absent for most cards: Card Impact only publishes entries that clear a minimum
   * sample size and aren't a cluster's own ~100%-included staple. */
  cardImpactByName: Map<string, { entry: CardImpactEntry; clusterName: string }> | undefined;
  fields: VisualFieldVisibility;
}

/** Same badge/tooltip as CardDetail.tsx's Intent Cards list — a shared visual vocabulary for "broader trigger, not yet checked against the full card corpus" rather than a validated connection. */
function ExperimentalBadge() {
  return (
    <span
      className="shrink-0 rounded-full border border-ctp-yellow px-1.5 text-[10px] text-ctp-yellow"
      title="Broader trigger, not yet checked against the full card corpus"
    >
      experimental
    </span>
  );
}

function CardImpactRow({ entry, clusterName }: { entry: CardImpactEntry; clusterName: string }) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
      <span className="shrink-0">Win rate</span>
      <span
        className="text-ctp-text"
        title={`${(entry.avgWinRateWith * 100).toFixed(0)}% across ${entry.deckCountWith} decks in ${clusterName} — tournament results, correlational not causal`}
      >
        {(entry.avgWinRateWith * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function LinkedCardRow({ combo, stats }: { combo: NewReleaseCombo; stats: LinkedCardStatSources }) {
  const impact = stats.cardImpactByName?.get(combo.with.name);
  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Linked card</span>
        <Link to={`/cards/${combo.with.slug}`} title={combo.with.name} className="truncate text-right font-medium text-ctp-mauve hover:underline">
          {combo.with.name}
        </Link>
      </div>
      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Connection</span>
        <span className="flex min-w-0 items-center justify-end gap-1">
          <span className="truncate text-right text-ctp-text" title={combo.via}>{combo.via}</span>
          {combo.tier === "experimental" && <ExperimentalBadge />}
        </span>
      </div>
      {impact && <CardImpactRow entry={impact.entry} clusterName={impact.clusterName} />}
      <CardStatRows
        card={combo.with}
        unitPrice={stats.priceByName.get(combo.with.name)}
        priceTrend={stats.priceTrendByName.get(combo.with.name)}
        simulatorEvidence={stats.simulatorEvidenceByName.get(combo.with.name)}
        communityEntry={stats.communityInclusionByName?.get(combo.with.name)}
        fields={stats.fields}
      />
    </>
  );
}

/** Collapsed to the first linked card by default — "+N more" expands the rest inline rather than
 * relying on a hover tooltip, which touch devices can't reach. */
function NewReleaseComboFooter({ combos, stats }: { combos: NewReleaseCombo[]; stats: LinkedCardStatSources }) {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = combos;
  const firstImpact = stats.cardImpactByName?.get(first.with.name);
  return (
    <div className="mt-1 border-t border-ctp-surface0 pt-1 text-[10px]">
      <div className="flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Linked card</span>
        <span className="flex min-w-0 items-baseline justify-end gap-1.5">
          <Link to={`/cards/${first.with.slug}`} title={first.with.name} className="truncate text-right font-medium text-ctp-mauve hover:underline">
            {first.with.name}
          </Link>
          {rest.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="shrink-0 text-ctp-subtext0 underline decoration-dotted hover:text-ctp-text"
            >
              {expanded ? "show less" : `+${rest.length} more`}
            </button>
          )}
        </span>
      </div>
      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Connection</span>
        <span className="flex min-w-0 items-center justify-end gap-1">
          <span className="truncate text-right text-ctp-text" title={first.via}>{first.via}</span>
          {first.tier === "experimental" && <ExperimentalBadge />}
        </span>
      </div>
      {firstImpact && <CardImpactRow entry={firstImpact.entry} clusterName={firstImpact.clusterName} />}
      <CardStatRows
        card={first.with}
        unitPrice={stats.priceByName.get(first.with.name)}
        priceTrend={stats.priceTrendByName.get(first.with.name)}
        simulatorEvidence={stats.simulatorEvidenceByName.get(first.with.name)}
        communityEntry={stats.communityInclusionByName?.get(first.with.name)}
        fields={stats.fields}
      />
      {expanded &&
        rest.map((combo) => (
          <div key={`${combo.with.uuid}-${combo.via}`} className="mt-1 border-t border-ctp-surface0 pt-1">
            <LinkedCardRow combo={combo} stats={stats} />
          </div>
        ))}
    </div>
  );
}

/**
 * A single-page "pick a Champion, then narrow by Element/Spirit, see everything at once" view —
 * the EDHRec-commander-page experience translated to Grand Archive. Deliberately separate from
 * `ChampionDetail.tsx` (which stays tabbed, one section at a time, per the earlier page-density
 * work) rather than another tab there: this page shows every section simultaneously, which is
 * exactly the layout a jump-nav earns its keep on.
 *
 * "Level" is informational only, not a data filter — deck-composition/win-rate stats aren't
 * tracked per Champion-print level anywhere in the pipeline (a deck can run any level copy of its
 * Champion), so picking a level only changes which exact print is linked/portrayed.
 */
export default function ChampionSynergy() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = slugToChampionName(name);
  useDocumentTitle(`${championName} Synergy`, `Card synergies, most-used cards, and archetypes for ${championName} in Grand Archive TCG.`);

  const archetypeData = useArchetypeData();
  const taxonomyData = useArchetypeTaxonomyData();
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

  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name, c])), [catalog]);

  const championPrints = useMemo(
    () =>
      catalog
        .filter((c) => c.types.includes("CHAMPION") && !c.subtypes.includes("SPIRIT") && c.name.startsWith(`${championName}, `))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    [catalog, championName],
  );

  const [level, setLevel] = useState<number | null>(null);
  const [spiritFilter, setSpiritFilter] = useState<SpiritFilter>({ kind: "all" });
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");

  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setLevel(null);
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
  // cards played in common across this Champion's elemental variants — the actual "matches between
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
        ? `Most used cards — ${spiritFilter.spiritName}`
        : sharedElementCards
          ? "Cards played across every element"
          : "Most used cards";

  const typeFilterOptions = useMemo(() => {
    // `mainByType` can be briefly absent even once `displayed` exists — a client with a cached
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

  // Stand-in "deck" for the new-release synergy check — this page has no assembled decklist of its
  // own, so the champion's own most-played Main+Material cards serve as the representative shell.
  const representativeDeckCards = useMemo(() => {
    if (!deckShellTopCards) return [];
    const names = [...deckShellTopCards.main, ...deckShellTopCards.material].map((c) => c.name);
    return names.map((n) => catalogByName.get(n)).filter((c): c is Card => c !== undefined);
  }, [deckShellTopCards, catalogByName]);

  // Elements this Champion (or, on a named-Spirit page, the Spirit itself) can actually cast —
  // scoped to whichever bucket is currently displayed so a card only reachable via a *different*
  // Spirit/element than the one shown isn't recommended as a New Release connection. Reads straight
  // off the archetype data's own `elements`/`spiritElement` fields rather than a catalog card's
  // `.elements`: `championPrints` (and so `selectedPrint`) is always empty on a named-Spirit page
  // (its Champion-type card is SPIRIT-subtype, filtered out by that query), which previously left
  // `identityElements` empty there — and an empty set makes `isElementCompatible` pass every card
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

  // Champion-agnostic packages this Champion runs — grouped purely by shared main-deck cards, not
  // by plurality Champion, so a package splashed by several Champions shows up once instead of
  // being siloed (and duplicated-looking) under each one. Experimental: in place of a raw
  // per-Champion build listing (`taxonomyData.clusters` filtered by championName) while this view
  // is tried out; the underlying per-Champion `clusters`/`strategyArchetypes` are unchanged.
  const engines = useMemo(() => {
    // `engineArchetypes` can be briefly absent even once `taxonomyData` exists — a client with a
    // cached `archetype-taxonomy.json` predating this field gets served that stale copy immediately
    // (see usePublishedData's cache-then-refresh behavior) before the background refetch replaces
    // it, same caveat `typeFilterOptions` above already documents for `mainByType`.
    if (!taxonomyData?.engineArchetypes) return [];
    return taxonomyData.engineArchetypes
      .filter((e) => e.championBreakdown.some((c) => c.championName === championName))
      .sort((a, b) => b.playerCount - a.playerCount);
  }, [taxonomyData, championName]);

  // Real tournament win rate for a linked card, not simulator telemetry — Card Impact is published
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
      <PageLayout>
        <EmptyState
          title="Champion not found"
          description={<>Champion "{championName}" hasn't cleared the sample-size threshold (or doesn't exist).</>}
          action={<Link to="/champions" className="text-ctp-blue hover:underline">&larr; All champions</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {champion && (() => {
        const champ = champion;
        const body = (communityInclusionByName: Map<string, CardInclusionEntry> | undefined) => (
        <>
          <PageHeader
            title={`${champ.signature} Synergy`}
            eyebrow={<Link to={`/champions/${championNameToSlug(championName)}`}>&larr; {champ.signature}</Link>}
            description={<>{champ.classes.join("/")} · {champ.elements.join("/")} · <strong className="font-semibold text-ctp-text">{champ.deckCount.toLocaleString()}</strong> decks across {champ.eventCount.toLocaleString()} events</>}
          />

          {championPrints.length > 1 && (
            <div className="mb-4">
              <div className="mb-2 text-sm font-semibold text-ctp-subtext0">Level</div>
              <div className="flex flex-wrap gap-2 text-sm">
                {championPrints.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setLevel(c.level ?? null)}
                    className={`w-24 shrink-0 rounded-md border p-1 text-left ${
                      selectedPrint?.name === c.name ? "border-ctp-blue" : "border-ctp-surface1 hover:border-ctp-surface2"
                    }`}
                  >
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
                    <div className="mt-0.5 truncate text-center text-[10px] text-ctp-subtext1">
                      Lv{c.level ?? "?"} · {c.name.split(",")[1]?.trim()}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-ctp-subtext0">(picks which print is linked below — deck stats aren't tracked per level)</div>
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
                  <Chip
                    key={e.element}
                    active={active}
                    onClick={() => setSpiritFilter(active ? { kind: "all" } : { kind: "element", element: e.element })}
                  >
                    {titleCase(e.element)} ({e.deckCount})
                  </Chip>
                );
              })}
            </div>
          )}

          {spiritsForElement.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-ctp-subtext0">Spirit:</span>
              {spiritsForElement.map((s) => (
                <Chip key={s.spiritName} size="sm" active={spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName} onClick={() => setSpiritFilter({ kind: "spirit", spiritName: s.spiritName })}>
                  {s.spiritName} ({s.deckCount})
                </Chip>
              ))}
            </div>
          )}

          <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-y border-ctp-surface1 py-2 text-xs">
            {JUMP_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-ctp-blue hover:underline">
                {s.label}
              </a>
            ))}
          </nav>

          <div className="space-y-8">
            <Section
              id="new"
              heading="compact"
              title={newReleaseCards.length > 0 ? `New from ${newReleaseCards[0].setName}` : "New releases"}
            >
              {newReleaseCards.length === 0 ? (
                <InlineState className="mt-2 text-sm">No new-set cards connect to {champ.signature}'s most-played cards yet.</InlineState>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {newReleaseCards.map(({ card, combos }) => (
                    <VisualCardTile
                      key={card.name}
                      line={{ card: card.name, quantity: 1 }}
                      card={card}
                      unitPrice={priceByName.get(card.name)}
                      priceTrend={priceTrendByName.get(card.name)}
                      simulatorEvidence={simulatorEvidenceByName.get(card.name)}
                      communityEntry={communityInclusionByName?.get(card.name)}
                      fields={visualFields}
                      footer={
                        <NewReleaseComboFooter
                          combos={combos}
                          stats={{ priceByName, priceTrendByName, simulatorEvidenceByName, communityInclusionByName, cardImpactByName, fields: visualFields }}
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section id="cards" heading="compact" title={cardsSectionTitle}>
              {typeFilterOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-ctp-subtext0">Main card type:</span>
                  <Chip size="sm" active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                    All
                  </Chip>
                  {typeFilterOptions.map(({ type }) => (
                    <Chip key={type} size="sm" active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                      {titleCase(type)}
                    </Chip>
                  ))}
                </div>
              )}
              {displayed && (
                <div className="mt-3">
                  <TopCardsSections topCards={displayed.topCards} cardImages={cardImages} mainOverride={displayedMainCards} layout="grid" />
                </div>
              )}
            </Section>

            <Section
              id="archetypes"
              heading="compact"
              title="Packages"
              actions={<Link to="/archetypes" className="text-xs text-ctp-blue hover:underline">All archetypes &rarr;</Link>}
            >
              {engines.length === 0 ? (
                <InlineState className="mt-2 text-sm">No named packages have cleared the sample-size threshold yet.</InlineState>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Package</th>
                        <th className="py-1 pr-6">Defining cards</th>
                        <th className="py-1 pr-6">Also played by</th>
                        <th className="py-1 pr-6">Players</th>
                        <th className="py-1 pr-6">Win rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {engines.map((e) => {
                        const others = e.championBreakdown.filter((c) => c.championName !== championName);
                        return (
                          <tr key={e.id}>
                            <td className="py-1.5 pr-6 whitespace-nowrap align-top">
                              <span className="inline-flex items-center gap-1.5">
                                <ArchetypeElementIcon name={e.name} />
                                <Link to={`/archetypes/${e.seedBuildId}`} className="text-ctp-text hover:text-ctp-blue">
                                  {e.name}
                                </Link>
                              </span>
                            </td>
                            <td className="py-1.5 pr-6 align-top">
                              <div className="flex max-w-xs flex-wrap gap-x-2 gap-y-1 text-xs">
                                {e.definingCards.length === 0 ? (
                                  <span className="text-ctp-subtext0">—</span>
                                ) : (
                                  e.definingCards.slice(0, 5).map((dc) => {
                                    const card = catalogByName.get(dc.name);
                                    return (
                                      <CardHoverPreview key={dc.name} image={card?.editions[0]?.image} alt={dc.name}>
                                        {card ? (
                                          <Link to={`/cards/${card.slug}`} className="text-ctp-mauve hover:underline">
                                            {dc.name}
                                          </Link>
                                        ) : (
                                          <span className="text-ctp-subtext1">{dc.name}</span>
                                        )}
                                      </CardHoverPreview>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 pr-6 align-top text-xs text-ctp-subtext1">
                              {others.length === 0 ? (
                                <span className="text-ctp-subtext0">—</span>
                              ) : (
                                others.map((c, i) => (
                                  <span key={c.championName}>
                                    <Link to={`/champions/${championNameToSlug(c.championName)}`} className="text-ctp-blue hover:underline">
                                      {c.championName}
                                    </Link>
                                    {i < others.length - 1 ? ", " : ""}
                                  </span>
                                ))
                              )}
                            </td>
                            <td className="py-1.5 pr-6 align-top text-ctp-subtext1">{e.playerCount}</td>
                            <td className="py-1.5 pr-6 align-top text-ctp-subtext1" title="Across every Champion running this package">
                              {(e.avgWinRate * 100).toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        </>
        );
        return displayPrefs.visualCommunity ? <VisualCommunityGate>{body}</VisualCommunityGate> : body(undefined);
      })()}
    </PageLayout>
  );
}
