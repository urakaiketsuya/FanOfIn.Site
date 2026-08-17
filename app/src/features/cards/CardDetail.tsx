import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { priceKey, type TopCardsBySection } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import CardImage from "../../components/CardImage";
import TopCardsSections from "../../components/TopCardsSections";
import TopDecksList from "../../components/TopDecksList";
import { useCard } from "./useCard";
import { usePriceLookup } from "../pricing/usePriceLookup";
import { useCardStatsData, useArchetypeData } from "../archetypes/data";
import { useCardCombination } from "./useCardCombination";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckSightingsData } from "../topdecks/data";
import { useHipsterData } from "../players/data";
import { useOmnidexPlayers } from "../tournaments/data";
import UniqueDeckRow from "../champions/UniqueDeckRow";
import { formatUsd } from "../../lib/format";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;
const MAX_CHAMPIONS_SHOWN = 8;

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-ctp-surface1 bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-subtext1">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  if (value === null) return null;
  return (
    <div className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-center">
      <div className="text-xs text-ctp-subtext0">{label}</div>
      <div className="font-semibold text-ctp-text">{value}</div>
    </div>
  );
}

export default function CardDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { card, loading } = useCard(slug);
  const [editionIndex, setEditionIndex] = useState(0);
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const rarityDisplay = (rarity: number) =>
    options.data?.rarity.find((r) => r.value === String(rarity))?.display ?? String(rarity);
  const prices = usePriceLookup();
  const cardStatsData = useCardStatsData();
  const cardStat = cardStatsData?.cards.find((c) => c.name === card?.name);

  const archetypeData = useArchetypeData();
  const sightingsData = useDeckSightingsData();
  const hipsterData = useHipsterData();
  const playersData = useOmnidexPlayers();

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

  const topDecks = useMemo(() => {
    if (!sightingsData) return [];
    return sightingsData.sightings
      .filter((s) => deckIdSet.has(s.deckId))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, MAX_TOP_DECKS_SHOWN);
  }, [sightingsData, deckIdSet]);

  const uniqueDecks = useMemo(() => {
    if (!hipsterData) return [];
    return hipsterData.deckScores
      .filter((d) => deckIdSet.has(`${d.eventId}:${d.player}`))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_UNIQUE_DECKS_SHOWN);
  }, [hipsterData, deckIdSet]);

  const playedByChampions = useMemo(() => {
    if (!archetypeData || !card) return [];
    const rows: { signature: string; cardDeckCount: number; championDeckCount: number }[] = [];
    for (const a of archetypeData.archetypes) {
      const hit = [...a.topCards.main, ...a.topCards.material, ...a.topCards.sideboard].find((c) => c.name === card.name);
      if (hit) rows.push({ signature: a.signature, cardDeckCount: hit.deckCount, championDeckCount: a.deckCount });
    }
    return rows.sort((a, b) => b.cardDeckCount - a.cardDeckCount).slice(0, MAX_CHAMPIONS_SHOWN);
  }, [archetypeData, card]);

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
        </div>

        <div>
          <h1 className="text-3xl font-bold text-ctp-blue">{card.name}</h1>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.classes.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
            {card.types.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {card.subtypes.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
            {card.elements.map((e) => (
              <Badge key={e}>{e}</Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Stat label="Memory" value={card.cost_memory} />
            <Stat label="Reserve" value={card.cost_reserve} />
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
                  <span className="text-ctp-subtext1">Normal: {formatUsd(price.normal.market)}</span>
                )}
                {price.foil && <span className="text-ctp-subtext1">Foil: {formatUsd(price.foil.market)}</span>}
                <a
                  href={price.tcgplayerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ctp-blue hover:underline"
                >
                  View on TCGplayer &rarr;
                </a>
              </div>
            </div>
          )}

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
        </div>
      </div>

      {playedByChampions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Popular with Champions</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {playedByChampions.map((row) => (
              <Link
                key={row.signature}
                to={`/champions/${encodeURIComponent(row.signature)}`}
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-ctp-text hover:border-ctp-blue hover:text-ctp-blue"
              >
                {row.signature} <span className="text-ctp-subtext0">({row.cardDeckCount}/{row.championDeckCount} decks)</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(combination.main.length > 0 || combination.material.length > 0 || combination.sideboard.length > 0) && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most used with {card.name}</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            {combination.deckCount !== undefined && `Across ${combination.deckCount} decks. `}Other cards most often
            played alongside this one.
          </p>
          <div className="mt-3">
            <TopCardsSections topCards={comboTopCards} cardImages={comboCardImages} />
          </div>
        </div>
      )}

      {topDecks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Top decks</h2>
          <div className="mt-2">
            <TopDecksList decks={topDecks} playerName={playerName} />
          </div>
        </div>
      )}

      {uniqueDecks.length > 0 && (
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

      {card.editions.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">
            Editions ({card.editions.length})
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {card.editions.map((ed, i) => (
              <button
                key={ed.uuid}
                type="button"
                onClick={() => setEditionIndex(i)}
                className={`rounded-md border p-1 text-left ${
                  i === editionIndex ? "border-ctp-blue" : "border-ctp-surface1"
                }`}
              >
                <CardImage image={ed.image} alt={`${card.name} — ${ed.set.name}`} className="aspect-[5/7] w-full rounded object-cover" />
                <p className="mt-1 truncate text-[10px] text-ctp-subtext1">{ed.set.name}</p>
                <p className="truncate text-[10px] text-ctp-subtext0">
                  #{ed.collector_number} · {rarityDisplay(ed.rarity)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
