import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { OmnidexDecklist } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import { useDeckPopularity } from "../popular/useDeckPopularity";
import { useDeckSightingsData } from "../topdecks/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useSimilarityData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import {
  computeAllyPower,
  computeDamageComposition,
  computeDeckComposition,
  computeDeckRating,
  computeFloatingMemory,
  computeKeywordComposition,
  computeMemoryCostCurve,
  computeRarityBreakdown,
  computeReserveCostCurve,
  type RatingPillar,
} from "../../lib/deckIdentity";
import { shortHash } from "../../lib/hash";
import { formatUsd } from "../../lib/format";
import DecklistView from "../events/DecklistView";
import TopDecksList from "../../components/TopDecksList";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import DonutChart, { buildChartSegments } from "../../components/DonutChart";
import BarChart from "../../components/BarChart";

export default function DeckDetail() {
  const { hash = "" } = useParams<{ hash: string }>();

  const { decks, loading } = useDeckPopularity(null);
  const sightingsData = useDeckSightingsData();
  const playersData = useOmnidexPlayers();

  const deck = decks.find((d) => shortHash(d.signature) === hash);

  const championImages = useChampionCardImages(deck?.championName ? [deck.championName] : []);
  const championCard = deck?.championName ? championImages.get(deck.championName) : undefined;

  const decklist: OmnidexDecklist = useMemo(
    () => ({
      main: (deck?.main ?? []).map((l) => ({ card: l.name, quantity: l.quantity })),
      material: (deck?.material ?? []).map((l) => ({ card: l.name, quantity: l.quantity })),
      sideboard: [],
    }),
    [deck],
  );
  const allNames = useMemo(() => [...(deck?.main ?? []), ...(deck?.material ?? [])].map((l) => l.name), [deck]);
  const cardsByName = useCardsByNames(allNames);

  const composition = useMemo(() => {
    if (!deck) return null;
    return computeDeckComposition([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const floatingMemory = useMemo(() => {
    if (!deck) return null;
    return computeFloatingMemory([...deck.main, ...deck.material], cardsByName, deck.championName, deck.classes);
  }, [deck, cardsByName]);

  const rating = useMemo(() => {
    if (!deck) return null;
    return computeDeckRating([...deck.main, ...deck.material], cardsByName, deck.championName, deck.classes);
  }, [deck, cardsByName]);

  const allyPower = useMemo(() => {
    if (!deck) return null;
    return computeAllyPower([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const allyPowerSegments = useMemo(() => {
    if (!allyPower) return [];
    const labeled = new Map(Array.from(allyPower.byPower.entries()).map(([power, count]) => [`Power ${power}`, count]));
    return buildChartSegments(labeled);
  }, [allyPower]);

  const keywordSegments = useMemo(() => {
    if (!deck) return [];
    return buildChartSegments(computeKeywordComposition([...deck.main, ...deck.material], cardsByName));
  }, [deck, cardsByName]);

  const damage = useMemo(() => {
    if (!deck) return null;
    return computeDamageComposition([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const damageTargetSegments = useMemo(() => (damage ? buildChartSegments(damage.targets) : []), [damage]);
  const damageTypeSegments = useMemo(() => (damage ? buildChartSegments(damage.conditionality) : []), [damage]);

  const memoryCurve = useMemo(() => {
    if (!deck) return [];
    return computeMemoryCostCurve([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const reserveCurve = useMemo(() => {
    if (!deck) return [];
    return computeReserveCostCurve([...deck.main, ...deck.material], cardsByName);
  }, [deck, cardsByName]);

  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const raritySegments = useMemo(() => {
    if (!deck) return [];
    const counts = computeRarityBreakdown([...deck.main, ...deck.material], cardsByName);
    const labeled = new Map(
      Array.from(counts.entries()).map(([rarity, count]) => [
        options.data?.rarity.find((r) => r.value === String(rarity))?.display ?? `Rarity ${rarity}`,
        count,
      ]),
    );
    return buildChartSegments(labeled);
  }, [deck, cardsByName, options.data]);

  const priceByName = useDeckPriceByName();
  const priciestCards = useMemo(() => {
    if (!deck) return [];
    return [...deck.main, ...deck.material]
      .map((line) => {
        const unitPrice = priceByName.get(line.name);
        return unitPrice === undefined ? null : { name: line.name, quantity: line.quantity, total: unitPrice * line.quantity };
      })
      .filter((l): l is { name: string; quantity: number; total: number } => l !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [deck, priceByName]);

  const instances = useMemo(() => {
    if (!deck || !sightingsData) return [];
    const deckIdSet = new Set(deck.deckIds);
    return sightingsData.sightings
      .filter((s) => deckIdSet.has(s.deckId))
      .sort((a, b) => (a.placement ?? Infinity) - (b.placement ?? Infinity));
  }, [deck, sightingsData]);

  const sightingsByMonth = useMemo(() => {
    if (instances.length === 0) return [];
    const counts = new Map<string, number>();
    for (const s of instances) {
      const month = s.eventDate.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    const months = Array.from(counts.keys()).sort();
    const [firstYear, firstMonth] = months[0].split("-").map(Number);
    const [lastYear, lastMonth] = months[months.length - 1].split("-").map(Number);
    const bars: { label: string; value: number }[] = [];
    for (let y = firstYear, m = firstMonth; y < lastYear || (y === lastYear && m <= lastMonth); m++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      const key = `${y}-${String(m).padStart(2, "0")}`;
      bars.push({ label: key.slice(2), value: counts.get(key) ?? 0 });
    }
    return bars;
  }, [instances]);

  const similarityData = useSimilarityData();
  const deckIdToSignature = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of decks) {
      for (const id of d.deckIds) map.set(id, d.signature);
    }
    return map;
  }, [decks]);

  const similarDecks = useMemo(() => {
    if (!deck || !similarityData) return [];
    const bestScoreBySignature = new Map<string, number>();
    for (const deckId of deck.deckIds) {
      const entry = similarityData.decks.find((d) => d.deckId === deckId);
      if (!entry) continue;
      for (const match of entry.topMatches) {
        const targetSignature = deckIdToSignature.get(match.deckId);
        if (!targetSignature || targetSignature === deck.signature) continue;
        const existing = bestScoreBySignature.get(targetSignature);
        if (existing === undefined || match.score > existing) bestScoreBySignature.set(targetSignature, match.score);
      }
    }
    return Array.from(bestScoreBySignature.entries())
      .map(([signature, score]) => ({ deck: decks.find((d) => d.signature === signature), score }))
      .filter((s): s is { deck: (typeof decks)[number]; score: number } => !!s.deck)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [deck, similarityData, deckIdToSignature, decks]);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-subtext1">Loading…</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">This deck isn't in the ingested data (or hasn't been played by 2+ players yet).</p>
        <Link to="/popular-decks" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; Popular Decks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/popular-decks" className="text-sm text-ctp-blue hover:underline">
        &larr; Popular Decks
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <CardHoverPreview image={championCard?.editions[0]?.image} alt={deck.championName ?? "Unknown champion"}>
          {championCard?.editions[0] ? (
            <CardImage
              image={championCard.editions[0].image}
              alt={deck.championName ?? ""}
              className="h-20 w-14 shrink-0 rounded object-cover object-top"
            />
          ) : (
            <div className="h-20 w-14 shrink-0 rounded bg-ctp-surface0" />
          )}
        </CardHoverPreview>

        <div>
          <h1 className="text-2xl font-bold text-ctp-blue">{deck.championName ?? "Unknown champion"}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            {deck.playerCount} player{deck.playerCount === 1 ? "" : "s"} · {deck.eventCount} event
            {deck.eventCount === 1 ? "" : "s"}
            {deck.bestPlacement !== null && ` · best finish #${deck.bestPlacement}`} ·{" "}
            {(deck.avgWinRate * 100).toFixed(0)}% avg win rate
            {deck.elements.length > 0 && ` · ${deck.elements.join("/")}`}
            {deck.classes.length > 0 && ` · ${deck.classes.join("/")}`}
          </p>
        </div>
      </div>

      {rating && (
        <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Power Rating</h2>
            <span className="text-2xl font-bold text-ctp-blue">{rating.composite.toFixed(2)}</span>
          </div>
          <div className="mt-3 space-y-2">
            {(["aggro", "consistency", "interaction", "resilience"] as RatingPillar[]).map((pillar) => (
              <div key={pillar} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 capitalize text-ctp-subtext1">{pillar}</span>
                <div className="h-2 flex-1 rounded-full bg-ctp-surface0">
                  <div
                    className="h-2 rounded-full bg-ctp-blue"
                    style={{ width: `${(rating.scores[pillar] / 10) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-ctp-subtext0">{rating.scores[pillar]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <DecklistView decklist={decklist} cardsByName={cardsByName} showThumbnails />
      </div>

      {composition && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Composition</h2>

          {(floatingMemory && (floatingMemory.base > 0 || floatingMemory.classBonus > 0)) ||
          (allyPower && allyPower.allyCopies > 0) ||
          (damage && (damage.championRange.max > 0 || damage.allyRange.max > 0)) ? (
            <p className="mt-1 text-sm text-ctp-subtext1">
              {floatingMemory && (floatingMemory.base > 0 || floatingMemory.classBonus > 0) && (
                <>
                  Floating Memory: {floatingMemory.base} · Class Bonus Floating Memory: {floatingMemory.classBonus}
                  {(allyPower?.allyCopies || damage) && " · "}
                </>
              )}
              {allyPower && allyPower.allyCopies > 0 && (
                <>
                  Average Ally Power: {allyPower.averagePower.toFixed(1)} (across {allyPower.allyCopies} allies)
                  {damage && (damage.championRange.max > 0 || damage.allyRange.max > 0) && " · "}
                </>
              )}
              {damage && damage.championRange.max > 0 && (
                <>
                  Direct Damage (champion): {damage.championRange.min}–{damage.championRange.max}
                  {damage.allyRange.max > 0 && " · "}
                </>
              )}
              {damage && damage.allyRange.max > 0 && (
                <>
                  Ally Damage: {damage.allyRange.min}–{damage.allyRange.max}
                </>
              )}
            </p>
          ) : null}

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <BarChart title="Memory Cost Curve" bars={memoryCurve} />
            <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
            <DonutChart title="Card Types" segments={buildChartSegments(composition.types)} />
            <DonutChart title="Elements" segments={buildChartSegments(composition.elements)} />
            <DonutChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
            <DonutChart title="Rarity" segments={raritySegments} />
            <DonutChart title="Ally Power" segments={allyPowerSegments} />
            <DonutChart title="Keywords" segments={keywordSegments} />
            <DonutChart title="Damage Targets" segments={damageTargetSegments} />
            <DonutChart title="Damage Type" segments={damageTypeSegments} />
          </div>
        </div>
      )}

      {priciestCards.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Priciest Cards</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {priciestCards.map((c) => {
              const card = cardsByName.get(c.name);
              return (
                <li key={c.name} className="flex items-baseline gap-1.5">
                  <span className="w-6 shrink-0 text-right text-ctp-subtext0">{c.quantity}x</span>
                  {card ? (
                    <CardHoverPreview image={card.editions[0]?.image} alt={c.name}>
                      <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                        {c.name}
                      </Link>
                    </CardHoverPreview>
                  ) : (
                    <span className="text-ctp-text">{c.name}</span>
                  )}
                  <span className="ml-auto shrink-0 text-ctp-subtext0">{formatUsd(c.total)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {sightingsByMonth.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Popularity Over Time</h2>
          <div className="mt-2">
            <BarChart title="Sightings per Month" bars={sightingsByMonth} />
          </div>
        </div>
      )}

      {similarDecks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Similar Decks</h2>
          <div className="mt-2 space-y-1 text-sm">
            {similarDecks.map(({ deck: match, score }) => (
              <div key={match.signature} className="text-ctp-subtext1">
                <Link to={`/decks/${shortHash(match.signature)}`} className="text-ctp-blue hover:underline">
                  {match.championName ?? "Unknown champion"}
                </Link>
                {match.elements.length > 0 && ` · ${match.elements.join("/")}`}
                {match.classes.length > 0 && ` · ${match.classes.join("/")}`}{" "}
                <span className="text-ctp-subtext0">({(score * 100).toFixed(0)}% similar)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {instances.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Played by ({instances.length})</h2>
          <div className="mt-2">
            <TopDecksList decks={instances} playerName={playerName} />
          </div>
        </div>
      )}
    </div>
  );
}
