import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOmnidexJudges } from "../tournaments/data";
import { usePlayerDecksData } from "../players/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function JudgesIndex() {
  useDocumentTitle("Judges", "Grand Archive TCG certified judges, ranked by level and experience.");
  const judgesData = useOmnidexJudges();
  const playerDecksData = usePlayerDecksData();
  const [search, setSearch] = useState("");

  const topChampionById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playerDecksData?.players ?? []) {
      const top = p.topChampions[0];
      if (top) map.set(p.playerId, top.name);
    }
    return map;
  }, [playerDecksData]);
  const championImages = useChampionCardImages([...new Set(topChampionById.values())]);

  const judges = useMemo(() => {
    if (!judgesData) return [];
    const needle = search.trim().toLowerCase();
    return [...judgesData.judges]
      .filter((j) => !needle || j.username.toLowerCase().includes(needle))
      .sort((a, b) => b.judgeLevel - a.judgeLevel || b.judgeExperience - a.judgeExperience);
  }, [judgesData, search]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Judges</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Everyone who's judged an ingested event, sorted by judge level.
      </p>

      <input
        type="text"
        placeholder="Search by username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      {!judgesData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {judgesData && judges.length === 0 && <p className="mt-6 text-ctp-subtext1">No judges match "{search}".</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1 pr-6">Judge</th>
              <th className="py-1 pr-6">Level</th>
              <th className="py-1 pr-6">Experience</th>
              <th className="py-1 pr-6">Events judged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
            {judges.map((judge) => {
              const topChampion = topChampionById.get(judge.id);
              const card = topChampion ? championImages.get(topChampion) : undefined;
              return (
                <tr key={judge.id}>
                  <td className="py-1.5 pr-6 whitespace-nowrap">
                    <Link to={`/players/${judge.id}`} className="flex items-center gap-2 text-ctp-text hover:text-ctp-blue">
                      {topChampion && (
                        <CardHoverPreview image={card?.editions[0]?.image} alt={topChampion}>
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ctp-surface0">
                            {card?.editions[0] && (
                              <CardImage
                                image={card.editions[0].image}
                                alt={topChampion}
                                className="h-full w-full origin-[50%_20%] scale-[3] object-cover object-top"
                              />
                            )}
                          </div>
                        </CardHoverPreview>
                      )}
                      {judge.username}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeLevel}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeExperience.toLocaleString()}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.eventIds.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
