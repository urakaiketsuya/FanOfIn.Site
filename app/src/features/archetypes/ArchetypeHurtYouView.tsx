import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ArchetypeTaxonomyData, CardImpactRole } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import LoadMore from "../../components/LoadMore";
import { useCardsByNames } from "../events/useCardsByNames";
import { useMatchupCardImpactData } from "./data";

const PAGE_SIZE = 30;
const ROLE_LABEL: Record<CardImpactRole, string> = {
  main: "Main",
  material: "Material",
  sideboard: "Sideboard",
  mixed: "Mixed",
};

interface HurtYouRow {
  key: string;
  cardName: string;
  role: CardImpactRole;
  adjustedLift: number;
  deckCountWith: number;
  deckCountWithout: number;
  myClusterId: string;
  myClusterName: string;
  opponentClusterId: string;
  opponentClusterName: string;
  games: number;
}

export default function ArchetypeHurtYouView({ taxonomy }: { taxonomy: ArchetypeTaxonomyData | undefined }) {
  const matchupData = useMatchupCardImpactData();
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const clusterNameById = useMemo(
    () => new Map((taxonomy?.clusters ?? []).map((cluster) => [cluster.id, cluster.name])),
    [taxonomy],
  );
  const buildOptions = useMemo(
    () => [...(taxonomy?.clusters ?? [])].sort((a, b) => b.playerCount - a.playerCount),
    [taxonomy],
  );

  // Keep each card scoped to its matchup because lift values use different populations.
  const rows = useMemo((): HurtYouRow[] => {
    if (!matchupData) return [];
    const result: HurtYouRow[] = [];
    for (const matchup of matchupData.matchups) {
      if (clusterId && matchup.clusterId !== clusterId) continue;
      for (const card of matchup.opponentCards) {
        result.push({
          key: `${matchup.clusterId}:${matchup.opponentClusterId}:${card.cardName}`,
          cardName: card.cardName,
          role: card.role,
          adjustedLift: card.adjustedLift,
          deckCountWith: card.deckCountWith,
          deckCountWithout: card.deckCountWithout,
          myClusterId: matchup.clusterId,
          myClusterName: clusterNameById.get(matchup.clusterId) ?? matchup.clusterId,
          opponentClusterId: matchup.opponentClusterId,
          opponentClusterName: matchup.opponentClusterName,
          games: matchup.games,
        });
      }
    }
    return result.sort((a, b) => a.adjustedLift - b.adjustedLift);
  }, [matchupData, clusterId, clusterNameById]);

  const visibleRows = rows.slice(0, visibleCount);
  const cardImages = useCardsByNames(useMemo(() => visibleRows.map((row) => row.cardName), [visibleRows]));

  return (
    <>
      <p className="mt-3 text-xs text-ctp-subtext0">
        Opponent cards that correlate with beating a build, from real pairing outcomes — the same "Cards that hurt
        you" numbers shown per-matchup on a build's own Card Impact tab, gathered here across every matchup at once.
        Each row is scoped to its own matchup's population, so lifts aren't comparable across different opponents —
        correlational, not a guarantee.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">My build:</span>
        <select
          value={clusterId ?? ""}
          onChange={(event) => {
            setClusterId(event.target.value || null);
            setVisibleCount(PAGE_SIZE);
          }}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All builds</option>
          {buildOptions.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.name} ({cluster.championName})
            </option>
          ))}
        </select>
      </div>

      {!matchupData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {matchupData && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">
          {clusterId
            ? "No matchup for this build has enough games to break down card-by-card yet."
            : "No matchups have enough games to break down card-by-card yet."}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                  <th className="py-1 pr-6">Card</th>
                  <th className="py-1 pr-6">Role</th>
                  <th className="py-1 pr-6">Lift</th>
                  <th className="py-1 pr-6">Sample</th>
                  <th className="py-1 pr-6">My build</th>
                  <th className="py-1 pr-6">Opponent</th>
                  <th className="py-1">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                {visibleRows.map((row) => {
                  const card = cardImages.get(row.cardName);
                  return (
                    <tr key={row.key}>
                      <td className="py-1.5 pr-6 whitespace-nowrap">
                        <CardHoverPreview image={card?.editions[0]?.image} alt={row.cardName}>
                          {card ? (
                            <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                              {row.cardName}
                            </Link>
                          ) : (
                            <span className="text-ctp-text">{row.cardName}</span>
                          )}
                        </CardHoverPreview>
                      </td>
                      <td className="py-1.5 pr-6 text-ctp-subtext1">{ROLE_LABEL[row.role]}</td>
                      <td className="py-1.5 pr-6 font-semibold text-ctp-red">{(row.adjustedLift * 100).toFixed(1)}pp</td>
                      <td className="py-1.5 pr-6 text-xs text-ctp-subtext0">
                        {row.deckCountWith} vs {row.deckCountWithout}
                      </td>
                      <td className="py-1.5 pr-6 whitespace-nowrap">
                        <Link to={`/archetypes/${row.myClusterId}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                          {row.myClusterName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-6 whitespace-nowrap">
                        <Link to={`/archetypes/${row.opponentClusterId}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                          {row.opponentClusterName}
                        </Link>
                      </td>
                      <td className="py-1.5 text-ctp-subtext1">{row.games}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <LoadMore
            remaining={rows.length - visibleCount}
            onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
          />
        </>
      )}
    </>
  );
}
