import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import { useArchetypeData, useArchetypeTaxonomyData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardsByNames } from "../events/useCardsByNames";
import { computeNewReleaseCards } from "../deckbuilder/newReleaseCards";
import { computeIdentityElements } from "../deckbuilder/useSuggestedBuild";
import TopCardsSections from "../../components/TopCardsSections";
import CardImage from "../../components/CardImage";
import { championNameToSlug, slugToChampionName } from "../../lib/championSlug";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
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
  { id: "archetypes", label: "Archetypes" },
];

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
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
  const navigate = useNavigate();
  useDocumentTitle(`${championName} Synergy`, `Card synergies, most-used cards, and archetypes for ${championName} in Grand Archive TCG.`);

  const archetypeData = useArchetypeData();
  const taxonomyData = useArchetypeTaxonomyData();
  const catalog = useCardCatalog();

  const champion =
    archetypeData?.archetypes.find((a) => a.signature === championName) ??
    archetypeData?.namedSpirits?.find((s) => s.signature === championName);

  const championNames = useMemo(() => (archetypeData ? archetypeData.archetypes.map((a) => a.signature).sort() : []), [archetypeData]);
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
    return { topCards: champion.topCards, mainByType: champion.mainByType, deckCount: champion.deckCount };
  }, [champion, spiritFilter]);

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
    if (!displayed) return [];
    const names = [...displayed.topCards.main, ...displayed.topCards.material].map((c) => c.name);
    return names.map((n) => catalogByName.get(n)).filter((c): c is Card => c !== undefined);
  }, [displayed, catalogByName]);

  const spiritCard = spiritFilter.kind === "spirit" ? catalogByName.get(spiritFilter.spiritName) : undefined;
  const identityElements = useMemo(() => {
    const elements = computeIdentityElements(selectedPrint, spiritCard);
    if (spiritFilter.kind === "element") elements.add(spiritFilter.element);
    return elements;
  }, [selectedPrint, spiritCard, spiritFilter]);

  const newReleaseCards = useMemo(() => {
    if (representativeDeckCards.length === 0) return [];
    const includedNames = new Set(representativeDeckCards.map((c) => c.name));
    return computeNewReleaseCards(catalogByName.values(), representativeDeckCards, identityElements, includedNames);
  }, [catalogByName, representativeDeckCards, identityElements]);

  const builds = useMemo(() => {
    if (!taxonomyData) return [];
    return taxonomyData.clusters.filter((c) => c.championName === championName).sort((a, b) => b.playerCount - a.playerCount);
  }, [taxonomyData, championName]);

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
      {champion && (
        <>
          <PageHeader
            title={`${champion.signature} Synergy`}
            eyebrow={<Link to={`/champions/${championNameToSlug(championName)}`}>&larr; {champion.signature}</Link>}
            description={<>{champion.classes.join("/")} · {champion.elements.join("/")} · <strong className="font-semibold text-ctp-text">{champion.deckCount.toLocaleString()}</strong> decks across {champion.eventCount.toLocaleString()} events</>}
          />

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="synergy-champion-switch" className="text-ctp-subtext0">Champion:</label>
            <input
              id="synergy-champion-switch"
              list="synergy-champion-options"
              defaultValue={championName}
              onBlur={(e) => {
                const next = e.target.value;
                if (next !== championName && championNames.includes(next)) navigate(`/champions/${championNameToSlug(next)}/synergy`);
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-sm text-ctp-text"
            />
            <datalist id="synergy-champion-options">
              {championNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          {championPrints.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ctp-subtext0">Level:</span>
              {championPrints.map((c) => (
                <Chip key={c.name} active={selectedPrint?.name === c.name} onClick={() => setLevel(c.level ?? null)}>
                  <span className="flex items-center gap-1.5">
                    {c.editions[0] && (
                      <CardImage image={c.editions[0].image} alt={c.name} className="h-8 w-[22px] shrink-0 rounded-sm object-cover object-top" />
                    )}
                    Lv{c.level ?? "?"} · {c.name.split(",")[1]?.trim()}
                  </span>
                </Chip>
              ))}
              <span className="text-xs text-ctp-subtext0">(picks which print is linked below — deck stats aren't tracked per level)</span>
            </div>
          )}

          {champion.elementBreakdown.length > 0 && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
              <Chip active={spiritFilter.kind === "all"} onClick={() => setSpiritFilter({ kind: "all" })}>
                All ({champion.deckCount})
              </Chip>
              {champion.elementBreakdown.map((e) => (
                <Chip
                  key={e.element}
                  active={
                    (spiritFilter.kind === "element" && spiritFilter.element === e.element) ||
                    (spiritFilter.kind === "spirit" && champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement === e.element)
                  }
                  onClick={() => setSpiritFilter({ kind: "element", element: e.element })}
                >
                  {titleCase(e.element)} ({e.deckCount})
                </Chip>
              ))}
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
              description="Cards from the newest set with a designed connection — shared token economy, tribal reference, or named reference — to this Champion's most-played cards. Too new for tournament data, so this isn't ranked or scored, just worth a look."
            >
              {newReleaseCards.length === 0 ? (
                <InlineState className="mt-2 text-sm">No new-set cards connect to {champion.signature}'s most-played cards yet.</InlineState>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {newReleaseCards.map(({ card, combos }) => (
                    <div key={card.name} className="flex gap-3 rounded-md border border-ctp-surface1 p-2 text-sm">
                      <CardHoverPreview image={card.editions[0]?.image} alt={card.name}>
                        <Link to={`/cards/${card.slug}`} className="shrink-0">
                          {card.editions[0] ? (
                            <CardImage image={card.editions[0].image} alt={card.name} className="w-20 rounded-md object-cover" />
                          ) : (
                            <div className="flex aspect-[5/7] w-20 items-center justify-center rounded-md bg-ctp-mantle text-[10px] text-ctp-subtext0">
                              No image
                            </div>
                          )}
                        </Link>
                      </CardHoverPreview>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          {card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
                          <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">
                            {card.name}
                          </Link>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {combos.map((combo) => (
                            <div key={`${combo.with.uuid}-${combo.via}`} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ctp-subtext0">
                              <CardHoverPreview image={combo.with.editions[0]?.image} alt={combo.with.name}>
                                <Link to={`/cards/${combo.with.slug}`} className="flex items-center gap-1.5 text-ctp-subtext1 hover:text-ctp-blue">
                                  {combo.with.editions[0] && (
                                    <CardImage image={combo.with.editions[0].image} alt={combo.with.name} className="h-7 w-5 shrink-0 rounded-sm object-cover object-top" />
                                  )}
                                  {combo.with.name}
                                </Link>
                              </CardHoverPreview>
                              <span>via {combo.via}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section id="cards" heading="compact" title="Most used cards">
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
                  <TopCardsSections topCards={displayed.topCards} cardImages={cardImages} mainOverride={displayedMainCards} />
                </div>
              )}
            </Section>

            <Section
              id="archetypes"
              heading="compact"
              title="Archetypes"
              description={<>Named builds within {championName}, derived from real decklists.</>}
              actions={<Link to="/archetypes" className="text-xs text-ctp-blue hover:underline">All archetypes &rarr;</Link>}
            >
              {builds.length === 0 ? (
                <InlineState className="mt-2 text-sm">No named builds have cleared the sample-size threshold yet.</InlineState>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Build</th>
                        <th className="py-1 pr-6">Players</th>
                        <th className="py-1 pr-6">Win rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {builds.map((b) => (
                        <tr key={b.id}>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <ArchetypeElementIcon name={b.name} />
                              <Link to={`/archetypes/${b.id}`} className="text-ctp-text hover:text-ctp-blue">
                                {b.name}
                              </Link>
                            </span>
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{b.playerCount}</td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{(b.avgWinRate * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </PageLayout>
  );
}
