import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ThemaKind } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import HistoryChart from "../../components/HistoryChart";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import Panel from "../../components/ui/Panel";
import PageHeader from "../../components/ui/PageHeader";
import { useCardCatalog } from "../cards/useCardCatalog";

export default function ThemaHistory() {
  const { editionUuid = "" } = useParams<{ editionUuid: string }>();
  const [searchParams] = useSearchParams();
  const kind: ThemaKind = searchParams.get("kind") === "NONFOIL" ? "NONFOIL" : "FOIL";
  const cards = useCardCatalog();
  const card = cards.find(item => item.editions.some(edition => edition.uuid === editionUuid));
  const edition = card?.editions.find(item => item.uuid === editionUuid);
  const finish = kind === "FOIL" ? "Foil" : "Nonfoil";
  useDocumentTitle(card ? `${card.name} Thema History` : "Thema History", "Historical Thema rankings for a Grand Archive TCG card printing.");

  const history = useQuery({
    queryKey: ["thema-history", editionUuid, kind],
    queryFn: () => gatcgApi.getThemaHistory(editionUuid, kind),
  });

  const points = [...(history.data ?? [])].reverse(); // API returns newest-first; chart reads left-to-right

  return (
    <PageLayout data-component="ThemaHistory">
      <PageHeader title="Thema history" actions={<Link to="/thema" className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">Thema rankings</Link>} />
      <Panel className="mt-4 flex items-center gap-4">
        <div className="w-20 shrink-0">
          {card ? <Link to={`/cards/${card.slug}?edition=${editionUuid}`} aria-label={`View ${card.name}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">
            <CardArtTile card={card} name={card.name} editionUuid={editionUuid} />
          </Link> : <CardArtTile card={undefined} name="Card printing" />}
        </div>
        <div className="min-w-0 break-words">
          <h2 className="text-lg font-semibold">{card?.name ?? "Card printing"}</h2>
          <p className="text-sm text-ctp-subtext1">{edition && `${edition.set.name} · #${edition.collector_number} · `}{finish}</p>
        </div>
      </Panel>

      {history.isPending && <InlineState className="mt-6">Loading history…</InlineState>}
      {history.isError && <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ctp-red">
        <p>History could not load.</p><Button disabled={history.isFetching} onClick={() => void history.refetch()}>Retry history</Button>
      </div>}
      {!history.isPending && !history.isError && points.length === 0 && <InlineState className="mt-6">No Thema history recorded yet.</InlineState>}

      {points.length > 1 && (
        <div className="mt-6 rounded-md border border-ctp-surface1 p-4">
          <HistoryChart points={points.map((p) => ({ date: p.created_at, value: p.thema_total, detail: `${new Date(p.created_at).toLocaleDateString()}: rank ${p.rank}, total ${p.thema_total.toLocaleString()}` }))} label="Thema total" formatValue={(value) => Math.round(value).toLocaleString()} />
        </div>
      )}

      {points.length > 0 && (
        <div className="mt-6">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                <th className="px-1 py-3">Date</th>
                <th className="px-1 py-3">Rank</th>
                <th className="px-1 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
              {[...points].reverse().map((p) => (
                <tr key={p.created_at}>
                  <td className="break-words px-1 py-3 text-ctp-subtext1">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="break-words px-1 py-3 text-ctp-subtext1">{p.rank}</td>
                  <td className="break-words px-1 py-3 text-ctp-text">{p.thema_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
