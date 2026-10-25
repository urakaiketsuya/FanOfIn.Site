import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useCardCatalog } from "./useCardCatalog";
import { announcedBans, BANLIST_REVIEW, otherUnavailableCards, SEASONAL_BANS } from "./banlistData";

const controlClass = "mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue";
const sourceClass = "inline-flex min-h-control items-center rounded text-sm text-ctp-blue underline focus-visible:outline-2 focus-visible:outline-ctp-blue";
export default function Banlist() {
  useDocumentTitle("Banlist", "Grand Archive official bans and seasonal bans by format.");
  const cards = useCardCatalog();
  const progress = useSyncProgress();
  const [params, setParams] = useSearchParams();
  const format = params.get("format") === "PANTHEON" ? "PANTHEON" : "STANDARD";
  const view = params.get("view") === "unavailable" ? "unavailable" : "bans";
  const query = params.get("q") ?? "";
  function update(key: string, value: string, replace = false) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace });
  }
  const byName = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  const bans = announcedBans(format);
  const unavailable = useMemo(() => otherUnavailableCards(cards, format), [cards, format]);
  const names = view === "bans" ? bans : unavailable.map(card => card.name);
  const shown = names.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()));
  const loading = progress.phase === "idle" || progress.phase === "syncing";
  return <PageLayout width="wide">
    <PageHeader title="Banlist" />
    <div className="flex flex-wrap items-center gap-x-4 text-xs text-ctp-subtext1">
      <span>Last verified <time dateTime={BANLIST_REVIEW.verified}>Oct 25, 2026</time></span>
      <span>List effective <time dateTime={BANLIST_REVIEW.effective}>Oct 16, 2026</time></span>
      <a className={sourceClass} href={BANLIST_REVIEW.announcement} target="_blank" rel="noreferrer">Official B&amp;R ↗</a>
    </div>
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Format<select value={format} onChange={event => update("format", event.target.value)} className={controlClass}>
        <option value="STANDARD">Standard · {announcedBans("STANDARD").length} bans</option>
        <option value="PANTHEON">Pantheon · {announcedBans("PANTHEON").length} bans</option>
      </select></label>
      <label className="text-sm">Find a card<input type="search" value={query} onChange={event => update("q", event.target.value, true)} placeholder="Card name" className={controlClass} /></label>
    </div>
    <Tabs baseId="banlist" label="Card availability" active={view} onChange={value => update("view", value)} wrap tabs={[{ key: "bans", label: `Banned (${bans.length})` }, { key: "unavailable", label: "Other unavailable cards" }]} />
    {progress.phase === "error" && <div role="alert" className="my-4 flex flex-wrap items-center gap-3 text-sm text-ctp-red">
      <span>Card catalog refresh failed. Official ban names remain available.</span><Button onClick={() => window.location.reload()}>Retry</Button>
    </div>}
    <TabPanel baseId="banlist" tab={view} active={view}>
      <p role="status" className="my-4 text-sm text-ctp-subtext1">{view === "unavailable" && loading ? "Updating card availability…" : `${shown.length} ${view === "bans" ? "banned" : "unavailable"} ${shown.length === 1 ? "card" : "cards"}`}</p>
      {view === "unavailable" && <p className="mb-4 text-xs text-ctp-subtext1">Catalog restrictions · not listed in the reviewed B&amp;R.</p>}
      {shown.length === 0 && (view === "bans" || (!loading && progress.phase !== "error")) && <p>{query.trim() ? "No cards match your search." : view === "bans" ? "No announced bans in this format." : "No other unavailable cards in this format."}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {shown.map(name => <CardResult key={name} card={byName.get(name)} name={name}>
          <span className={`inline-block rounded px-2 py-1 text-xs ${view === "bans" ? "bg-ctp-red/10 text-ctp-red" : "bg-ctp-surface0 text-ctp-subtext1"}`}>{view === "unavailable" ? "Not format-legal" : SEASONAL_BANS.includes(name) ? "Seasonal · PRD" : "Banned"}</span>
          {view === "bans" && SEASONAL_BANS.includes(name) && <a className={sourceClass} href={BANLIST_REVIEW.seasonalAnnouncement} target="_blank" rel="noreferrer">PRD season announcement ↗</a>}
        </CardResult>)}
      </div>
    </TabPanel>
  </PageLayout>;
}
