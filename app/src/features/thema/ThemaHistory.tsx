import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ThemaKind } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import ThemaSparkline from "./ThemaSparkline";

export default function ThemaHistory() {
  const { editionUuid = "" } = useParams<{ editionUuid: string }>();
  const [searchParams] = useSearchParams();
  const kind = (searchParams.get("kind") as ThemaKind | null) ?? "FOIL";

  const history = useQuery({
    queryKey: ["thema-history", editionUuid, kind],
    queryFn: () => gatcgApi.getThemaHistory(editionUuid, kind),
  });

  const points = [...(history.data ?? [])].reverse(); // API returns newest-first; chart reads left-to-right

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/thema" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Rankings
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-ctp-blue">
        Thema history <span className="text-ctp-subtext0">({kind === "FOIL" ? "Foil" : "Non-foil"})</span>
      </h1>

      {history.isPending && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {history.isError && <p className="mt-6 text-ctp-red">Failed to load history.</p>}

      {points.length > 1 && (
        <div className="mt-6 rounded-md border border-ctp-surface1 p-4">
          <ThemaSparkline values={points.map((p) => p.thema_total)} />
          <div className="mt-2 flex justify-between text-xs text-ctp-subtext0">
            <span>{new Date(points[0].created_at).toLocaleDateString()}</span>
            <span>{new Date(points[points.length - 1].created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {points.length > 0 && (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1">Date</th>
              <th className="py-1">Rank</th>
              <th className="py-1">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0">
            {[...points].reverse().map((p) => (
              <tr key={p.created_at}>
                <td className="py-1 text-ctp-subtext1">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="py-1 text-ctp-subtext1">{p.rank}</td>
                <td className="py-1 text-ctp-text">{p.thema_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
