import { useMemo, useState } from "react";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useCardCatalog } from "./useCardCatalog";

export default function Banlist() {
  useDocumentTitle("Banlist", "Grand Archive banned cards by format.");
  const cards = useCardCatalog();
  const progress = useSyncProgress();
  const [format, setFormat] = useState("");
  const banned = useMemo(() => cards.map(card => ({ card, formats: Object.entries(card.legality ?? {}).filter(([, rule]) => rule.limit === 0).map(([name]) => name) }))
    .filter(entry => entry.formats.length > 0).sort((a, b) => a.card.name.localeCompare(b.card.name)), [cards]);
  const formats = [...new Set(banned.flatMap(entry => entry.formats))].sort();
  const shown = banned.filter(entry => !format || entry.formats.includes(format));
  const loading = progress.phase === "idle" || progress.phase === "syncing";
  return <PageLayout width="wide">
    <PageHeader title="Banlist" />
    <label className="block max-w-xs text-sm">Format
      <select value={format} onChange={event => setFormat(event.target.value)} className="mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue">
        <option value="">All formats</option>
        {formats.map(name => <option key={name} value={name}>{formatLabel(name)}</option>)}
      </select>
    </label>
    <p role="status" className="my-4 text-sm text-ctp-subtext1">{loading ? "Updating banlist…" : `${shown.length} banned cards`}</p>
    {progress.phase === "error" && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ctp-red">
      <span>Could not refresh the banlist.{cards.length > 0 ? " Showing cached cards." : ""}</span>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>}
    {!loading && progress.phase !== "error" && shown.length === 0 && <p>No banned cards in this format.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {shown.map(({ card, formats: bans }) => <CardResult key={card.uuid} card={card} name={card.name}>
        <div className="flex flex-wrap gap-1">{bans.map(name => <span key={name} className="rounded bg-ctp-red/10 px-2 py-1 text-xs text-ctp-red">Banned · {formatLabel(name)}</span>)}</div>
      </CardResult>)}
    </div>
  </PageLayout>;
}

function formatLabel(format: string) {
  return format.charAt(0) + format.slice(1).toLowerCase();
}
