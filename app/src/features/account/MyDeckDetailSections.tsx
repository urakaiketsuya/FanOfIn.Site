import { Link } from "react-router-dom";
import type { SavedDeckDetail } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import DeckVisualStrip from "./DeckVisualStrip";
import DeckSectionBalance from "./DeckSectionBalance";
import UserDecklistPanel from "./UserDecklistPanel";

export function MyDeckOverview({ deck, sectionCounts, sideboardPoints }: { deck: SavedDeckDetail; sectionCounts: { main: number; material: number; sideboard: number; maybeboard: number }; sideboardPoints: number | undefined }) {
  return <section id="owned-deck-panel-overview" role="tabpanel" aria-labelledby="owned-deck-tab-overview" tabIndex={0} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
    <Panel><h2 className="text-lg font-semibold text-ctp-text">Deck at a glance</h2><DeckVisualStrip decklist={deck.decklist} championName={deck.championName} /><DeckSectionBalance counts={sectionCounts} sideboardPoints={sideboardPoints} maybeboard={sectionCounts.maybeboard} /></Panel>
    <Panel><h2 className="text-lg font-semibold text-ctp-text">Explore this deck</h2><div className="mt-3 space-y-2"><Link to={`/deck-analysis?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Analyze deck</Link><Link to={`/combo-lab?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-mauve">Test combos</Link><Link to={`/deck-review?deck=${encodeURIComponent(deck.id)}`} className="block rounded-lg border border-ctp-surface1 px-3 py-2.5 text-sm text-ctp-subtext1 hover:border-ctp-blue">Review suggestions</Link></div><p className="mt-4 text-xs text-ctp-subtext0">{deck.versions.length} version{deck.versions.length === 1 ? "" : "s"} · Updated {new Date(deck.updatedAt).toLocaleDateString()}</p></Panel>
  </section>;
}

export function DeckVersionHistory({ deck, busy, onRestore }: { deck: SavedDeckDetail; busy: boolean; onRestore: (versionId: string) => void }) {
  return <section id="owned-deck-panel-versions" role="tabpanel" aria-labelledby="owned-deck-tab-versions" tabIndex={0} className="mt-6">
    <h2 className="text-lg font-semibold text-ctp-text">Version history</h2>
    <div className="mt-3 space-y-2">{deck.versions.map((version) => <details key={version.id} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" open={version.id === deck.currentVersionId}>
      <summary className="cursor-pointer text-sm"><span className="font-medium">Version {version.versionNumber}</span><span className="ml-2 text-ctp-subtext1">{new Date(version.createdAt).toLocaleString()} · {version.changeNote || "Deck updated"}</span>{version.id === deck.currentVersionId && <span className="ml-2 text-ctp-green">Current</span>}</summary>
      <UserDecklistPanel decklist={version.decklist} format={version.format} />
      {version.id !== deck.currentVersionId && <button disabled={busy} type="button" onClick={() => onRestore(version.id)} className="mt-2 rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-50">Restore as new version</button>}
    </details>)}</div>
  </section>;
}
