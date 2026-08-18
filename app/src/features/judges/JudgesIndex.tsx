import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOmnidexJudges } from "../tournaments/data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function JudgesIndex() {
  useDocumentTitle("Judges", "Grand Archive TCG certified judges, ranked by level and experience.");
  const judgesData = useOmnidexJudges();
  const [search, setSearch] = useState("");

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
            {judges.map((judge) => (
              <tr key={judge.id}>
                <td className="py-1.5 pr-6 whitespace-nowrap">
                  <Link to={`/players/${judge.id}`} className="text-ctp-text hover:text-ctp-blue">
                    {judge.username}
                  </Link>
                </td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeLevel}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.judgeExperience.toLocaleString()}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{judge.eventIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
