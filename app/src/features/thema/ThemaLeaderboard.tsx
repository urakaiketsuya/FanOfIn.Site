import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ThemaKind } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import CardImage from "../../components/CardImage";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

function RankChange({ value }: { value: number }) {
  if (value === 0) return <span className="text-ctp-subtext0">—</span>;
  return value > 0 ? (
    <span className="text-ctp-green">&uarr;{value}</span>
  ) : (
    <span className="text-ctp-red">&darr;{Math.abs(value)}</span>
  );
}

export default function ThemaLeaderboard() {
  useDocumentTitle("Thema Rankings", "Live Thema price-rank leaderboard for Grand Archive TCG cards.");
  const [kind, setKind] = useState<ThemaKind>("FOIL");
  const ranks = useQuery({ queryKey: ["thema-ranks", kind], queryFn: () => gatcgApi.getThemaRanks(kind) });

  return (
    <PageLayout>
      <PageHeader title="Thema Rankings" description="Dynamic thema price-tier leaderboard, updated regularly." />

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {(["FOIL", "NONFOIL"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`rounded-md border px-2 py-1 text-xs ${
              kind === k ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {k === "FOIL" ? "Foil" : "Non-foil"}
          </button>
        ))}
      </div>

      {ranks.isPending && <InlineState className="mt-6">Loading…</InlineState>}
      {ranks.isError && <InlineState tone="danger" className="mt-6">Failed to load rankings.</InlineState>}

      <div className="mt-6 divide-y divide-ctp-surface0">
        {ranks.data?.map((entry) => (
          <Link
            key={entry.edition.uuid}
            to={`/thema/${entry.edition.uuid}?kind=${kind}`}
            className="flex items-center gap-3 py-2 hover:bg-ctp-surface0/50"
          >
            <span className="w-6 text-right text-sm text-ctp-subtext0">{entry.score.rank}</span>
            <CardImage image={entry.edition.image} alt={entry.name} className="h-14 w-10 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ctp-text">{entry.name}</p>
              <p className="text-xs text-ctp-subtext0">{entry.edition.set.name}</p>
            </div>
            <span className="text-sm font-semibold text-ctp-text">{entry.score.thema_total}</span>
            <RankChange value={entry.score.rank_change} />
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
