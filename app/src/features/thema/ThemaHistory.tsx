import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ThemaKind } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import HistoryChart from "../../components/HistoryChart";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

export default function ThemaHistory() {
  useDocumentTitle("Thema Price History", "Historical Thema price-rank chart for a Grand Archive TCG card edition.");
  const { editionUuid = "" } = useParams<{ editionUuid: string }>();
  const [searchParams] = useSearchParams();
  const kind = (searchParams.get("kind") as ThemaKind | null) ?? "FOIL";

  const history = useQuery({
    queryKey: ["thema-history", editionUuid, kind],
    queryFn: () => gatcgApi.getThemaHistory(editionUuid, kind),
  });

  const points = [...(history.data ?? [])].reverse(); // API returns newest-first; chart reads left-to-right

  return (
    <PageLayout data-component="ThemaHistory">
      <Link to="/thema" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Rankings
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-ctp-blue">
        Thema history <span className="text-ctp-subtext0">({kind === "FOIL" ? "Foil" : "Non-foil"})</span>
      </h1>

      {history.isPending && <InlineState className="mt-6">Loading…</InlineState>}
      {history.isError && <InlineState tone="danger" className="mt-6">Failed to load history.</InlineState>}
      {!history.isPending && !history.isError && points.length === 0 && (
        <InlineState className="mt-6">No price history recorded yet.</InlineState>
      )}

      {points.length > 1 && (
        <div className="mt-6 rounded-md border border-ctp-surface1 p-4">
          <HistoryChart points={points.map((p) => ({ date: p.created_at, value: p.thema_total, detail: `${new Date(p.created_at).toLocaleDateString()}: rank ${p.rank}, total ${p.thema_total.toLocaleString()}` }))} label="Thema total" formatValue={(value) => Math.round(value).toLocaleString()} />
        </div>
      )}

      {points.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                <th className="py-1 pr-6">Date</th>
                <th className="py-1 pr-6">Rank</th>
                <th className="py-1 pr-6">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
              {[...points].reverse().map((p) => (
                <tr key={p.created_at}>
                  <td className="py-1 pr-6 whitespace-nowrap text-ctp-subtext1">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-1 pr-6 text-ctp-subtext1">{p.rank}</td>
                  <td className="py-1 pr-6 text-ctp-text">{p.thema_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
