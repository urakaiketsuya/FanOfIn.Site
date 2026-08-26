import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { priceKey, type PriceHistoryPoint, type TopCardsBySection } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import CostIcon from "../../components/CostIcon";
import ClassIcon from "../../components/ClassIcon";
import TypeIcon from "../../components/TypeIcon";
import TopCardsSections from "../../components/TopCardsSections";
import CardImpactTable from "../../components/CardImpactTable";
import TopDecksList from "../../components/TopDecksList";
import { typeIconKey } from "../../lib/cardTypeIcon";
import { useCard } from "./useCard";
import { usePriceLookup } from "../pricing/usePriceLookup";
import { usePriceHistoryData } from "../pricing/usePriceHistory";
import HistoryChart from "../../components/HistoryChart";
import { useCardStatsData, useArchetypeTaxonomyData, useCardQuantityStatsData } from "../archetypes/data";
import { useCardCatalog } from "./useCardCatalog";
import { useCardCombination } from "./useCardCombination";
import { useCardSynergy } from "./useCardSynergy";
import { useSimilarCards } from "./useSimilarCards";
import { earliestReleaseDate, statDiff } from "../../lib/cardSimilarity";
import { useIntentCards } from "./useIntentCards";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardComparisonTable from "../compare/CardComparisonTable";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardDeckReferences, useCommunityCardInclusion } from "../community/data";
import { useHipsterData } from "../players/data";
import { useOmnidexPlayers, useEventNameById } from "../tournaments/data";
import UniqueDeckRow from "../champions/UniqueDeckRow";
import { formatUsd } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;
const MAX_CHAMPIONS_SHOWN = 8;
/** Below this many decks, adjustedWinRate is shrunk close enough to a flat 50% to not be worth
 * leading with — same "too few observations to trust" threshold as useChampionCardImpact.ts. */
const MIN_SAMPLE_SIZE = 5;

function formatDelta(n: number | null): string {
  if (n === null || n === 0) return "";
  return ` (${n > 0 ? "+" : ""}${n})`;
}

/** "diao-chan" -> "Diao Chan" — ShoutAtYourDecks champion slugs are lowercase, not display names.
 * Same small formatter CommunityDecksIndex.tsx's own formatChampionName already does. */
function formatShoutAtYourDecksChampion(key: string): string {
  return key
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Picks which market-price series to chart: Normal if it has enough real points, else Foil, else nothing (ThemaSparkline itself already no-ops under 2 points, but this also decides which label to show). */
function selectPriceSeries(points: PriceHistoryPoint[]): { label: string; dated: { date: string; value: number }[] } | null {
  const normal = points.filter((p) => p.normalMarket !== null).map((p) => ({ date: p.date, value: p.normalMarket as number }));
  if (normal.length >= 2) return { label: "Normal", dated: normal };
  const foil = points.filter((p) => p.foilMarket !== null).map((p) => ({ date: p.date, value: p.foilMarket as number }));
  if (foil.length >= 2) return { label: "Foil", dated: foil };
  return null;
}

type CardTab = "info" | "usedWith" | "synergy" | "similar" | "intent" | "decks" | "compare";

const TABS: { key: CardTab; label: string }[] = [
  { key: "info", label: "Info" },
  { key: "usedWith", label: "Most Used With" },
  { key: "synergy", label: "Win-Rate Synergy" },
  { key: "similar", label: "Same Effect Shape" },
  { key: "intent", label: "Intent Cards" },
  { key: "decks", label: "Decks" },
  { key: "compare", label: "Compare" },
];
const TAB_KEYS = TABS.map((t) => t.key);

const BADGE_CLASS =
  "flex items-center gap-1 rounded-full border border-ctp-surface1 bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-subtext1";

/** `to` makes it a link to that attribute's search results (e.g. every Warrior card, every Regalia) — same badge look either way. */
function Badge({ children, to }: { children: ReactNode; to?: string }) {
  if (to) {
    return (
      <Link to={to} className={`${BADGE_CLASS} hover:border-ctp-blue hover:text-ctp-blue`}>
        {children}
      </Link>
    );
  }
  return <span className={BADGE_CLASS}>{children}</span>;
}

function Stat({ label, value, icon }: { label: string; value: number | string | null; icon?: ReactNode }) {
  if (value === null) return null;
  return (
    <div className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-ctp-subtext0">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-ctp-text">{value}</div>
    </div>
  );
}

export default function CardDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { card, loading } = useCard(slug);
  useDocumentTitle(
    card?.name,
    card && `${[card.types.join("/"), card.classes.join("/"), card.elements.join("/")].filter(Boolean).join(" · ")}${
      card.effect ? ` — ${card.effect.replace(/\s+/g, " ").slice(0, 140)}` : ""
    }`,
  );
  const [editionIndex, setEditionIndex] = useState(0);
  const [editionsExpanded, setEditionsExpanded] = useState(false);
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "info");
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const rarityDisplay = (rarity: number) =>
    options.data?.rarity.find((r) => r.value === String(rarity))?.display ?? String(rarity);
  const prices = usePriceLookup();
  const priceHistoryData = usePriceHistoryData();
  const cardStatsData = useCardStatsData();
  const cardStat = cardStatsData?.cards.find((c) => c.name === card?.name);
  const communityCardInclusion = useCommunityCardInclusion();
  const communityInclusion = communityCardInclusion?.overall.find((c) => c.name === card?.name);
  const cardQuantityStatsData = useCardQuantityStatsData();
  const cardQuantityStat = cardQuantityStatsData?.cards.find((c) => c.name === card?.name);
  // Below this many decks, a quantity bucket is more likely a one-off brew or data quirk than a
  // real signal — same MIN_SAMPLE_SIZE magnitude used everywhere else in this codebase.
  const quantityBuckets = cardQuantityStat?.quantities.filter((q) => q.deckCount >= 5) ?? [];

  const cardCatalog = useCardCatalog();
  const compareCardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const compareCardNameSet = useMemo(() => new Set(compareCardNames), [compareCardNames]);
  const [compareWith, setCompareWith] = useState<string[]>([]);
  const [compareInput, setCompareInput] = useState("");
  // Reseeds to just this page's card whenever it changes (navigating to a different card) —
  // otherwise a stale comparison from the previous card page would carry over.
  useEffect(() => {
    if (card) setCompareWith([card.name]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.name]);

  function addCompareCard(name: string) {
    if (!compareCardNameSet.has(name) || compareWith.includes(name)) return;
    setCompareWith((prev) => [...prev, name]);
    setCompareInput("");
  }

  function removeCompareCard(name: string) {
    setCompareWith((prev) => prev.filter((n) => n !== name));
  }

  const archetypeTaxonomyData = useArchetypeTaxonomyData();
  const popularityIndexData = useDeckPopularityIndexData();
  const eventNameById = useEventNameById();
  const hipsterData = useHipsterData();
  const playersData = useOmnidexPlayers();
  const cardDeckReferences = useCardDeckReferences();
  const communityDeckRefs = card ? (cardDeckReferences?.byCardName[card.name] ?? []) : [];

  const selectedCardNames = useMemo(() => (card ? [card.name] : []), [card]);
  const combination = useCardCombination(selectedCardNames);
  const comboNames = useMemo(
    () => [...combination.main, ...combination.material, ...combination.sideboard].map((c) => c.name),
    [combination],
  );
  const comboCardImages = useCardsByNames(comboNames);
  const comboTopCards: TopCardsBySection = useMemo(
    () => ({
      main: combination.main.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      material: combination.material.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      sideboard: combination.sideboard.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
    }),
    [combination, comboCardImages],
  );

  const deckIdSet = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);

  const synergy = useCardSynergy(card?.name ?? null);
  const synergyCardImages = useCardsByNames(useMemo(() => synergy.cards.map((c) => c.cardName), [synergy.cards]));

  const similarCardsList = useSimilarCards(card ?? null);
  const similarCardsSorted = useMemo(
    () => [...similarCardsList].sort((a, b) => (earliestReleaseDate(a) ?? "").localeCompare(earliestReleaseDate(b) ?? "")),
    [similarCardsList],
  );

  const intent = useIntentCards(card ?? null);
  const [showExperimentalIntent, setShowExperimentalIntent] = useState(false);
  const visibleIntentFeeds = useMemo(
    () => intent.feeds.filter((m) => showExperimentalIntent || m.tier === "validated"),
    [intent.feeds, showExperimentalIntent],
  );
  const visibleIntentPoweredBy = useMemo(
    () => intent.poweredBy.filter((m) => showExperimentalIntent || m.tier === "validated"),
    [intent.poweredBy, showExperimentalIntent],
  );
  const experimentalIntentCount =
    intent.feeds.filter((m) => m.tier === "experimental").length + intent.poweredBy.filter((m) => m.tier === "experimental").length;

  const topDecks = useMemo(() => {
    if (!popularityIndexData) return [];
    return popularityIndexData.entries
      .filter((e) => deckIdSet.has(e.deckId))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, MAX_TOP_DECKS_SHOWN)
      .map((e) => ({
        deckId: e.deckId,
        player: e.player,
        eventId: e.eventId,
        eventName: eventNameById.get(e.eventId) ?? `Event #${e.eventId}`,
        placement: e.placement,
        wins: e.wins,
        losses: e.losses,
        ties: e.ties,
        underplaced: e.underplaced,
      }));
  }, [popularityIndexData, deckIdSet, eventNameById]);

  const uniqueDecks = useMemo(() => {
    if (!hipsterData) return [];
    return hipsterData.deckScores
      .filter((d) => deckIdSet.has(`${d.eventId}:${d.player}`))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_UNIQUE_DECKS_SHOWN);
  }, [hipsterData, deckIdSet]);

  // Cluster-level ("Water Diao Chan", not just "Diao Chan") builds this card is a *defining*
  // member of — a strict upgrade over the older per-Champion `playedByChampions` this replaced,
  // via `cardClusterIndex` (pipeline/src/analysis/archetypeTaxonomy.ts). `?? []`/`?.` guard a
  // stale IndexedDB copy from before this field shipped, same convention as `c.seasons ?? []`
  // elsewhere in this codebase.
  const playedByArchetypes = useMemo(() => {
    if (!archetypeTaxonomyData || !card) return [];
    const hits = archetypeTaxonomyData.cardClusterIndex?.[card.name] ?? [];
    const clusterById = new Map(archetypeTaxonomyData.clusters.map((c) => [c.id, c]));
    return hits
      .map((hit) => {
        const cluster = clusterById.get(hit.clusterId);
        return cluster ? { cluster, prevalence: hit.prevalence } : null;
      })
      .filter((row): row is { cluster: (typeof archetypeTaxonomyData.clusters)[number]; prevalence: number } => row !== null)
      .sort((a, b) => b.cluster.playerCount - a.cluster.playerCount)
      .slice(0, MAX_CHAMPIONS_SHOWN);
  }, [archetypeTaxonomyData, card]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-ctp-subtext1">Loading…</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-ctp-red">Card "{slug}" not found.</p>
        <Link to="/cards" className="mt-2 inline-block text-ctp-blue hover:underline">
          Back to Cards
        </Link>
      </div>
    );
  }

  const edition = card.editions[editionIndex] ?? card.editions[0];
  const price = edition ? prices.get(priceKey(edition.set.prefix, edition.collector_number)) : undefined;
  const priceHistoryPoints = edition ? priceHistoryData?.history[priceKey(edition.set.prefix, edition.collector_number)] : undefined;
  const priceSeries = priceHistoryPoints ? selectPriceSeries(priceHistoryPoints) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/cards" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Cards
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
        <div>
          {edition ? (
            <CardImage image={edition.image} alt={card.name} className="aspect-[5/7] w-full rounded-lg border border-ctp-surface1 object-cover" />
          ) : (
            <div className="flex aspect-[5/7] items-center justify-center rounded-lg border border-ctp-surface1 bg-ctp-mantle text-ctp-subtext0">
              No image
            </div>
          )}

          {card.editions.length > 1 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setEditionsExpanded((v) => !v)}
                aria-expanded={editionsExpanded}
                className="flex w-full items-center justify-between text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide hover:text-ctp-text"
              >
                <span>Editions ({card.editions.length})</span>
                <span aria-hidden="true">{editionsExpanded ? "▲" : "▼"}</span>
              </button>
              {editionsExpanded && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {card.editions.map((ed, i) => (
                    <button
                      key={ed.uuid}
                      type="button"
                      onClick={() => setEditionIndex(i)}
                      aria-pressed={i === editionIndex}
                      className={`rounded-md border p-1 text-left ${
                        i === editionIndex ? "border-ctp-blue" : "border-ctp-surface1"
                      }`}
                    >
                      <CardImage
                        image={ed.image}
                        alt={`${card.name} — ${ed.set.name}`}
                        className="aspect-[5/7] w-full rounded object-cover"
                      />
                      <p className="mt-1 truncate text-[10px] text-ctp-subtext1">{ed.set.name}</p>
                      <p className="truncate text-[10px] text-ctp-subtext0">
                        #{ed.collector_number} · {rarityDisplay(ed.rarity)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-ctp-blue">{card.name}</h1>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.classes.map((c) => (
              <Badge key={c} to={`/cards?class=${encodeURIComponent(c)}`}>
                <ClassIcon cardClass={c} size={14} />
                {c}
              </Badge>
            ))}
            {card.types.map((t) => (
              <Badge key={t} to={`/cards?type=${encodeURIComponent(t)}`}>
                <TypeIcon type={typeIconKey(t, card.types)} size={14} />
                {t}
              </Badge>
            ))}
            {card.subtypes.map((s) => (
              <Badge key={s} to={`/cards?subtype=${encodeURIComponent(s)}`}>
                {s}
              </Badge>
            ))}
            {card.elements.map((e) => (
              <Badge key={e} to={`/cards?element=${encodeURIComponent(e)}`}>
                <ElementIcon element={e} size={14} />
                {e}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Stat label="Memory" value={card.cost_memory} icon={<CostIcon kind="memory" size={12} />} />
            <Stat label="Reserve" value={card.cost_reserve} icon={<CostIcon kind="reserve" size={12} />} />
            <Stat label="Level" value={card.level} />
            <Stat label="Power" value={card.power} />
            <Stat label="Life" value={card.life} />
            <Stat label="Durability" value={card.durability} />
          </div>

          {card.effect && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-ctp-text">{card.effect.replace(/\*\*/g, "")}</p>
          )}
          {card.flavor && <p className="mt-3 text-sm text-ctp-subtext0 italic">{card.flavor}</p>}

          {price && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
                TCGplayer price ({edition?.set.name})
              </h2>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                {price.normal && (
                  <span className="text-ctp-subtext1">
                    Normal: {formatUsd(price.normal.market)}
                    {price.normal.low !== null && price.normal.high !== null && (
                      <span className="text-xs text-ctp-subtext0"> ({formatUsd(price.normal.low)}–{formatUsd(price.normal.high)})</span>
                    )}
                  </span>
                )}
                {price.foil && (
                  <span className="text-ctp-subtext1">
                    Foil: {formatUsd(price.foil.market)}
                    {price.foil.low !== null && price.foil.high !== null && (
                      <span className="text-xs text-ctp-subtext0"> ({formatUsd(price.foil.low)}–{formatUsd(price.foil.high)})</span>
                    )}
                  </span>
                )}
                <a
                  href={price.tcgplayerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ctp-blue hover:underline"
                >
                  View on TCGplayer &rarr;
                </a>
              </div>
              {priceSeries && (
                <div className="mt-2 max-w-sm rounded-md border border-ctp-surface1 p-3">
                  <p className="text-xs text-ctp-subtext0">
                    {priceSeries.label} price, last {priceSeries.dated.length} weeks
                  </p>
                  <HistoryChart points={priceSeries.dated.map((d) => ({ date: d.date, value: d.value }))} label={`${priceSeries.label} price`} formatValue={formatUsd} compact />
                  <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                    <span>{new Date(priceSeries.dated[0].date).toLocaleDateString()}</span>
                    <span>{new Date(priceSeries.dated[priceSeries.dated.length - 1].date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-ctp-surface1 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              tab === t.key ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <>
          {cardStat && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Tournament usage</h2>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-ctp-subtext1">
                <span>
                  {cardStat.deckCount} decks across {cardStat.eventCount} events
                </span>
                <span>{(cardStat.avgWinRate * 100).toFixed(0)}% avg win rate</span>
                <span>{(cardStat.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</span>
                {cardStat.recentDeckCount > cardStat.priorDeckCount && cardStat.priorDeckCount > 0 && (
                  <span className="text-ctp-green">Trending up</span>
                )}
              </div>
              {communityInclusion && (
                <p className="mt-1 text-xs text-ctp-mauve">
                  {(communityInclusion.percentOfDecks * 100).toFixed(0)}% of Shout At Your Decks community decks
                  include this — popularity in community brews, not a performance figure like the stats above.
                </p>
              )}
            </div>
          )}

          {quantityBuckets.length >= 2 && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Win rate by quantity</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">Does running more (or fewer) copies actually change the outcome?</p>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-ctp-subtext1">
                {quantityBuckets.map((q) => (
                  <span key={q.quantity}>
                    {q.quantity}x: <span className="font-semibold text-ctp-text">{(q.adjustedWinRate * 100).toFixed(0)}%</span>{" "}
                    <span className="text-xs text-ctp-subtext0">({q.deckCount} decks)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {edition?.illustrator && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Illustrator</h2>
              <Link
                to={`/cards?artist=${encodeURIComponent(edition.illustrator)}`}
                className="mt-1 inline-block text-sm text-ctp-blue hover:underline"
              >
                {edition.illustrator}
              </Link>
            </div>
          )}

          {card.legality && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Legality</h2>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                {Object.entries(card.legality).map(([format, { limit }]) => (
                  <span key={format} className="text-ctp-subtext1">
                    {format}: {limit === 0 ? <span className="text-ctp-red">Banned</span> : `Max ${limit}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(card.references.length > 0 || card.referenced_by.length > 0) && (
            <div className="mt-4 space-y-2">
              {card.references.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">References</h2>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                    {card.references.map((ref) => (
                      <Link key={ref.slug} to={`/cards/${ref.slug}`} className="text-ctp-blue hover:underline">
                        {ref.name} <span className="text-ctp-subtext0">({ref.kind.toLowerCase()})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {card.referenced_by.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Referenced by</h2>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                    {card.referenced_by.map((ref) => (
                      <Link key={ref.slug} to={`/cards/${ref.slug}`} className="text-ctp-blue hover:underline">
                        {ref.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "decks" && playedByArchetypes.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Archetypes</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">Named builds this card helps define — not just decks that happen to include it.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {playedByArchetypes.map(({ cluster, prevalence }) => (
              <Link
                key={cluster.id}
                to={`/archetypes/${cluster.id}`}
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-text hover:border-ctp-blue hover:text-ctp-blue"
              >
                {cluster.name}{" "}
                <span className="text-ctp-subtext0">
                  ({(prevalence * 100).toFixed(0)}% of {cluster.playerCount} players, {(cluster.avgWinRate * 100).toFixed(0)}% win rate)
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === "usedWith" && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most used with {card.name}</h2>
          {combination.main.length > 0 || combination.material.length > 0 || combination.sideboard.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ctp-subtext0">
                {combination.deckCount !== undefined && `Across ${combination.deckCount} decks. `}Other cards most often
                played alongside this one.
              </p>
              <div className="mt-3">
                <TopCardsSections topCards={comboTopCards} cardImages={comboCardImages} />
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-ctp-subtext1">Not enough decks running {card.name} to say what's played alongside it yet.</p>
          )}
        </div>
      )}

      {tab === "synergy" && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Win-rate synergy</h2>
          {synergy.cards.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Across {synergy.totalDecks} decks running {card.name}, cards that correlate with an even higher win rate
                when also included — correlational, not causal, and different from "Most Used With" (that's ranked by
                how often cards appear together; this is ranked by whether the pairing actually wins more).
              </p>
              <CardImpactTable cards={synergy.cards} cardImages={synergyCardImages} withLabel="Win rate (with)" withoutLabel="Win rate (without)" />
            </>
          ) : (
            <p className="mt-4 text-sm text-ctp-subtext1">No card clears the sample bar for a win-rate synergy with {card.name} yet.</p>
          )}
        </div>
      )}

      {tab === "similar" && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Same effect shape</h2>

          {(!cardStat || cardStat.deckCount < MIN_SAMPLE_SIZE) && (card.references.length > 0 || card.referenced_by.length > 0) && (
            <div className="mt-2 rounded-md border border-ctp-surface1 bg-ctp-mantle p-3">
              <p className="text-xs text-ctp-subtext0">
                Too few recorded decks for a trustworthy win rate yet — this card's own explicit references are a
                more reliable signal in the meantime:
              </p>
              <div className="mt-2 space-y-2">
                {card.references.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">References</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm">
                      {card.references.map((ref) => (
                        <Link key={ref.slug} to={`/cards/${ref.slug}`} className="text-ctp-blue hover:underline">
                          {ref.name} <span className="text-ctp-subtext0">({ref.kind.toLowerCase()})</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {card.referenced_by.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Referenced by</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm">
                      {card.referenced_by.map((ref) => (
                        <Link key={ref.slug} to={`/cards/${ref.slug}`} className="text-ctp-blue hover:underline">
                          {ref.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {similarCardsSorted.length > 0 ? (
            <>
              <p className="mt-3 text-xs text-ctp-subtext0">
                Cards with a matching ability template, for comparing cost and stats side by side — deltas are shown
                relative to {card.name}. Not every difference is a straight upgrade (class/element restrictions and
                cost type both matter for deckbuilding), and this is a comparison, not a verdict.
              </p>
              <div className="mt-3 overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                  <th className="py-1 pr-6">Card</th>
                  <th className="py-1 pr-6">Cost</th>
                  <th className="py-1 pr-6">Power</th>
                  <th className="py-1 pr-6">Life</th>
                  <th className="py-1 pr-6">Durability</th>
                  <th className="py-1 pr-6">Released</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctp-surface0">
                {similarCardsSorted.map((c) => {
                  const released = earliestReleaseDate(c);
                  const diff = statDiff(card, c);
                  return (
                    <tr key={c.uuid}>
                      <td className="py-1.5 pr-6 whitespace-nowrap">
                        <CardHoverPreview image={c.editions[0]?.image} alt={c.name}>
                          <Link to={`/cards/${c.slug}`} className="text-ctp-text hover:text-ctp-blue">
                            {c.name}
                          </Link>
                        </CardHoverPreview>
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">
                        {c.cost.type !== "none" && c.cost.value !== null ? (
                          <span className="flex items-center gap-1">
                            <CostIcon kind={c.cost.type} size={12} />
                            {c.cost.value}
                            {formatDelta(diff.cost)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">
                        {c.power ?? "—"}
                        {formatDelta(diff.power)}
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">
                        {c.life ?? "—"}
                        {formatDelta(diff.life)}
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">
                        {c.durability ?? "—"}
                        {formatDelta(diff.durability)}
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">{released ? new Date(released).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-ctp-subtext1">No other cards share {card.name}'s ability template yet.</p>
          )}
        </div>
      )}

      {tab === "intent" && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Intent cards</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Cards designed to work with {card.name} — a shared token economy (e.g. summons/sacrifices a Powercell), a
            tribal category {card.name} either belongs to or explicitly references as a cost or condition, or
            Empower feeding a Spell that deals damage scaled by your champion's level. Most cards aren't part of one
            of these — an empty list here is normal, not a sign anything's broken.
          </p>

          {experimentalIntentCount > 0 && (
            <label className="mt-2 flex items-center gap-1.5 text-xs text-ctp-subtext0">
              <input
                type="checkbox"
                checked={showExperimentalIntent}
                onChange={(e) => setShowExperimentalIntent(e.target.checked)}
              />
              Show {experimentalIntentCount} experimental match{experimentalIntentCount === 1 ? "" : "es"} (broader
              reveal/discard/return-from-discard triggers — not yet checked against the full card corpus the way the
              default set was, so may include false positives)
            </label>
          )}

          {visibleIntentFeeds.length === 0 && visibleIntentPoweredBy.length === 0 ? (
            <p className="mt-4 text-sm text-ctp-subtext1">
              No text-detected token or tribal relationship for {card.name} yet.
            </p>
          ) : (
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
              {visibleIntentFeeds.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
                    Feeds ({visibleIntentFeeds.length})
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {visibleIntentFeeds.map((m) => (
                      <li key={`${m.card.uuid}-${m.via}`} className="flex items-center gap-1.5 text-sm">
                        <CardHoverPreview image={m.card.editions[0]?.image} alt={m.card.name}>
                          <Link to={`/cards/${m.card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                            {m.card.name}
                          </Link>
                        </CardHoverPreview>
                        <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
                          via {m.via}
                        </span>
                        {m.tier === "experimental" && (
                          <span
                            className="rounded-full border border-ctp-yellow px-1.5 text-[10px] text-ctp-yellow"
                            title="Broader trigger, not yet checked against the full card corpus"
                          >
                            experimental
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {visibleIntentPoweredBy.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
                    Powered by ({visibleIntentPoweredBy.length})
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {visibleIntentPoweredBy.map((m) => (
                      <li key={`${m.card.uuid}-${m.via}`} className="flex items-center gap-1.5 text-sm">
                        <CardHoverPreview image={m.card.editions[0]?.image} alt={m.card.name}>
                          <Link to={`/cards/${m.card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                            {m.card.name}
                          </Link>
                        </CardHoverPreview>
                        <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
                          via {m.via}
                        </span>
                        {m.tier === "experimental" && (
                          <span
                            className="rounded-full border border-ctp-yellow px-1.5 text-[10px] text-ctp-yellow"
                            title="Broader trigger, not yet checked against the full card corpus"
                          >
                            experimental
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "decks" && topDecks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Top decks</h2>
          <div className="mt-2">
            <TopDecksList decks={topDecks} playerName={playerName} />
          </div>
        </div>
      )}

      {tab === "decks" && uniqueDecks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most unique decks</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Builds featuring {card.name} with the most uncommon card choices relative to other decks of the same
            Champion at the time they were played.
          </p>
          <div className="mt-2 space-y-2">
            {uniqueDecks.map((d) => (
              <UniqueDeckRow key={`${d.eventId}:${d.player}`} score={d} playerName={playerName(d.player)} />
            ))}
          </div>
        </div>
      )}

      {tab === "decks" && communityDeckRefs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Community decks</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Player brews from Shout At Your Decks that include this card — not real tournament results, and not
            ordered by recency: the site doesn't track when a deck was actually built or updated.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {communityDeckRefs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <a href={d.url} target="_blank" rel="noreferrer" className="text-ctp-text hover:text-ctp-blue">
                  {d.title || "(untitled)"}
                </a>
                {(d.author || d.champion) && (
                  <span className="text-xs text-ctp-subtext0">
                    {d.author ? `by ${d.author}` : ""}
                    {d.author && d.champion ? " — " : ""}
                    {d.champion ? formatShoutAtYourDecksChampion(d.champion) : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "compare" && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Compare with other cards</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Add any card to see usage, win rate, and price side by side — a quick way to decide between two options
            without leaving this page.
          </p>

          <input
            type="text"
            list="card-detail-compare-options"
            aria-label="Card name"
            value={compareInput}
            onChange={(e) => {
              setCompareInput(e.target.value);
              if (compareCardNameSet.has(e.target.value)) addCompareCard(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && compareCardNameSet.has(compareInput)) addCompareCard(compareInput);
            }}
            placeholder="Type a card name to add…"
            className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
          />
          <datalist id="card-detail-compare-options">
            {compareCardNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          {compareWith.length > 0 && (
            <div className="mt-3">
              <CardComparisonTable names={compareWith} onRemove={removeCompareCard} />
            </div>
          )}

          {compareWith.length > 1 && (
            <Link
              to={`/compare?type=cards&cards=${encodeURIComponent(compareWith.join(","))}`}
              className="mt-2 inline-block text-xs text-ctp-blue hover:underline"
            >
              Open in full Compare tool &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
