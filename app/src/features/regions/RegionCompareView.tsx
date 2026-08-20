import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRegionalArchetypes } from "./useRegionalArchetypes";
import { useRegionalChampions } from "./useRegionalChampions";
import { useRegionalCardComposition } from "./useRegionalCardComposition";
import { useRegionalKeywords } from "./useRegionalKeywords";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import { formatUsd } from "../../lib/format";
import type { RegionOption } from "./useRegionalDecks";

type ContentTab = "archetypes" | "champions" | "cards" | "keywords";
const CONTENT_TABS: ContentTab[] = ["archetypes", "champions", "cards", "keywords"];
const CONTENT_LABELS: Record<ContentTab, string> = {
  archetypes: "Archetypes",
  champions: "Champions",
  cards: "Card Composition",
  keywords: "Keywords",
};

const MAX_DIFF_RESULTS = 15;

interface ArchetypeCompareRow {
  id: string;
  name: string;
  championName: string;
  deckCountA: number;
  shareA: number;
  winRateA: number;
  deckCountB: number;
  shareB: number;
  winRateB: number;
}

interface ChampionCompareRow {
  championName: string;
  deckCountA: number;
  shareA: number;
  winRateA: number;
  deckCountB: number;
  shareB: number;
  winRateB: number;
}

interface CardDiffRow {
  name: string;
  rateA: number;
  rateB: number;
  diff: number;
  avgWinRate: number;
  marketPrice?: number | null;
}

function joinArchetypes(
  rowsA: ReturnType<typeof useRegionalArchetypes>["rows"],
  rowsB: ReturnType<typeof useRegionalArchetypes>["rows"],
): ArchetypeCompareRow[] {
  const byId = new Map<string, ArchetypeCompareRow>();
  for (const r of rowsA) {
    byId.set(r.id, { id: r.id, name: r.name, championName: r.championName, deckCountA: r.deckCount, shareA: r.share, winRateA: r.avgWinRate, deckCountB: 0, shareB: 0, winRateB: 0 });
  }
  for (const r of rowsB) {
    const existing = byId.get(r.id);
    if (existing) {
      existing.deckCountB = r.deckCount;
      existing.shareB = r.share;
      existing.winRateB = r.avgWinRate;
    } else {
      byId.set(r.id, { id: r.id, name: r.name, championName: r.championName, deckCountA: 0, shareA: 0, winRateA: 0, deckCountB: r.deckCount, shareB: r.share, winRateB: r.avgWinRate });
    }
  }
  return Array.from(byId.values()).sort((a, b) => Math.abs(b.shareA - b.shareB) - Math.abs(a.shareA - a.shareB));
}

function joinChampions(
  rowsA: ReturnType<typeof useRegionalChampions>["rows"],
  rowsB: ReturnType<typeof useRegionalChampions>["rows"],
): ChampionCompareRow[] {
  const byName = new Map<string, ChampionCompareRow>();
  for (const r of rowsA) {
    byName.set(r.championName, { championName: r.championName, deckCountA: r.deckCount, shareA: r.share, winRateA: r.avgWinRate, deckCountB: 0, shareB: 0, winRateB: 0 });
  }
  for (const r of rowsB) {
    const existing = byName.get(r.championName);
    if (existing) {
      existing.deckCountB = r.deckCount;
      existing.shareB = r.share;
      existing.winRateB = r.avgWinRate;
    } else {
      byName.set(r.championName, { championName: r.championName, deckCountA: 0, shareA: 0, winRateA: 0, deckCountB: r.deckCount, shareB: r.share, winRateB: r.avgWinRate });
    }
  }
  return Array.from(byName.values()).sort((a, b) => Math.abs(b.shareA - b.shareB) - Math.abs(a.shareA - a.shareB));
}

/** Diffs two already region-vs-global-shrunk rate lists directly against each other — see the `allEntries` doc comment on RegionalCardComposition/RegionalKeywords for why this needs the uncapped list, not the over/under-vs-global lists the single-region view uses. */
function diffRates<T extends { regionRate: number; deckCountInRegion: number; avgWinRate: number; marketPrice?: number | null }>(
  entriesA: (T & { cardName?: string; keyword?: string })[],
  entriesB: (T & { cardName?: string; keyword?: string })[],
): { favorsA: CardDiffRow[]; favorsB: CardDiffRow[] } {
  const byName = new Map<string, CardDiffRow>();
  for (const r of entriesA) {
    const name = r.cardName ?? r.keyword ?? "";
    byName.set(name, { name, rateA: r.regionRate, rateB: 0, diff: 0, avgWinRate: r.avgWinRate, marketPrice: r.marketPrice });
  }
  for (const r of entriesB) {
    const name = r.cardName ?? r.keyword ?? "";
    const existing = byName.get(name);
    if (existing) existing.rateB = r.regionRate;
    else byName.set(name, { name, rateA: 0, rateB: r.regionRate, diff: 0, avgWinRate: r.avgWinRate, marketPrice: r.marketPrice });
  }
  const rows = Array.from(byName.values()).map((r) => ({ ...r, diff: r.rateA - r.rateB }));
  rows.sort((a, b) => b.diff - a.diff);
  return { favorsA: rows.slice(0, MAX_DIFF_RESULTS), favorsB: rows.slice(-MAX_DIFF_RESULTS).reverse() };
}

function CardDiffList({ rows, labelA, labelB, sign }: { rows: CardDiffRow[]; labelA: string; labelB: string; sign: "positive" | "negative" }) {
  const cardsByName = useCardsByNames(useMemo(() => rows.map((r) => r.name), [rows]));
  if (rows.length === 0) return <p className="text-sm text-ctp-subtext1">Nothing clears the sample bar in either region yet.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((r) => {
        const card = cardsByName.get(r.name);
        return (
          <li key={r.name} className="flex flex-wrap items-center gap-1.5 text-sm">
            {card ? (
              <CardHoverPreview image={card.editions[0]?.image} alt={r.name}>
                <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                  {r.name}
                </Link>
              </CardHoverPreview>
            ) : (
              <span className="text-ctp-text">{r.name}</span>
            )}
            {r.marketPrice != null && (
              <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">{formatUsd(r.marketPrice)}</span>
            )}
            <span className={`ml-auto shrink-0 text-xs ${sign === "positive" ? "text-ctp-green" : "text-ctp-red"}`}>
              {r.diff >= 0 ? "+" : ""}
              {(r.diff * 100).toFixed(1)}pp
            </span>
            <span className="shrink-0 text-xs text-ctp-subtext0">
              {(r.rateA * 100).toFixed(0)}% {labelA} vs {(r.rateB * 100).toFixed(0)}% {labelB}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function RegionCompareView({ options, regionByDeckId }: { options: RegionOption[]; regionByDeckId: Map<string, string> }) {
  const [tab, setTab] = useState<ContentTab>("archetypes");
  const [regionAOverride, setRegionAOverride] = useState<string | null>(null);
  const [regionBOverride, setRegionBOverride] = useState<string | null>(null);

  const regionA = regionAOverride && options.some((o) => o.code === regionAOverride) ? regionAOverride : (options[0]?.code ?? null);
  const regionB = regionBOverride && options.some((o) => o.code === regionBOverride) ? regionBOverride : (options[1]?.code ?? null);
  const labelA = options.find((o) => o.code === regionA)?.label ?? "Region A";
  const labelB = options.find((o) => o.code === regionB)?.label ?? "Region B";

  const archA = useRegionalArchetypes(regionByDeckId, regionA);
  const archB = useRegionalArchetypes(regionByDeckId, regionB);
  const archetypeRows = useMemo(() => joinArchetypes(archA.rows, archB.rows), [archA.rows, archB.rows]);

  const champA = useRegionalChampions(regionByDeckId, regionA);
  const champB = useRegionalChampions(regionByDeckId, regionB);
  const championRows = useMemo(() => joinChampions(champA.rows, champB.rows), [champA.rows, champB.rows]);

  const cardsA = useRegionalCardComposition(regionByDeckId, regionA);
  const cardsB = useRegionalCardComposition(regionByDeckId, regionB);
  const cardDiff = useMemo(() => diffRates(cardsA.allEntries, cardsB.allEntries), [cardsA.allEntries, cardsB.allEntries]);

  const keywordsA = useRegionalKeywords(regionByDeckId, regionA);
  const keywordsB = useRegionalKeywords(regionByDeckId, regionB);
  const keywordDiff = useMemo(() => diffRates(keywordsA.allEntries, keywordsB.allEntries), [keywordsA.allEntries, keywordsB.allEntries]);

  const loading = archA.loading || archB.loading || champA.loading || champB.loading || cardsA.loading || cardsB.loading || keywordsA.loading || keywordsB.loading;

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-ctp-subtext0">Region A:</span>
          <select
            value={regionA ?? ""}
            onChange={(e) => setRegionAOverride(e.target.value)}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label} ({o.deckCount} decks)
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ctp-subtext0">Region B:</span>
          <select
            value={regionB ?? ""}
            onChange={(e) => setRegionBOverride(e.target.value)}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label} ({o.deckCount} decks)
              </option>
            ))}
          </select>
        </div>
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

      {loading && <p className="mt-4 text-ctp-subtext1">Loading…</p>}

      {!loading && (
        <div className="mt-4">
          {tab === "archetypes" && (
            <>
              {archetypeRows.length === 0 ? (
                <p className="text-sm text-ctp-subtext1">Not enough data in either region yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Build</th>
                        <th className="py-1 pr-6">Champion</th>
                        <th className="py-1 pr-6">{labelA} share</th>
                        <th className="py-1 pr-6">{labelA} WR</th>
                        <th className="py-1 pr-6">{labelB} share</th>
                        <th className="py-1">{labelB} WR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {archetypeRows.map((r) => (
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
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountA > 0 ? `${(r.shareA * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountA > 0 ? `${(r.winRateA * 100).toFixed(0)}%` : "—"}</td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountB > 0 ? `${(r.shareB * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 text-ctp-subtext1">{r.deckCountB > 0 ? `${(r.winRateB * 100).toFixed(0)}%` : "—"}</td>
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
              {championRows.length === 0 ? (
                <p className="text-sm text-ctp-subtext1">Not enough data in either region yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Champion</th>
                        <th className="py-1 pr-6">{labelA} share</th>
                        <th className="py-1 pr-6">{labelA} WR</th>
                        <th className="py-1 pr-6">{labelB} share</th>
                        <th className="py-1">{labelB} WR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {championRows.map((r) => (
                        <tr key={r.championName}>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <Link to={`/champions/${encodeURIComponent(r.championName)}`} className="text-ctp-text hover:text-ctp-blue">
                              {r.championName}
                            </Link>
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountA > 0 ? `${(r.shareA * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountA > 0 ? `${(r.winRateA * 100).toFixed(0)}%` : "—"}</td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCountB > 0 ? `${(r.shareB * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-1.5 text-ctp-subtext1">{r.deckCountB > 0 ? `${(r.winRateB * 100).toFixed(0)}%` : "—"}</td>
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
              <p className="text-xs text-ctp-subtext0">
                Cards used more in {labelA} than {labelB}, and vice versa — correlational, not a guarantee.
              </p>
              <div className="mt-4">
                <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">More common in {labelA}</h2>
                <CardDiffList rows={cardDiff.favorsA} labelA={labelA} labelB={labelB} sign="positive" />
              </div>
              <div className="mt-6">
                <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">More common in {labelB}</h2>
                <CardDiffList rows={cardDiff.favorsB} labelA={labelA} labelB={labelB} sign="negative" />
              </div>
            </>
          )}

          {tab === "keywords" && (
            <>
              <p className="text-xs text-ctp-subtext0">
                Ability keywords used more in {labelA} than {labelB}, and vice versa — correlational, not a guarantee.
              </p>
              <div className="mt-4">
                <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">More common in {labelA}</h2>
                <CardDiffList rows={keywordDiff.favorsA} labelA={labelA} labelB={labelB} sign="positive" />
              </div>
              <div className="mt-6">
                <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">More common in {labelB}</h2>
                <CardDiffList rows={keywordDiff.favorsB} labelA={labelA} labelB={labelB} sign="negative" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
