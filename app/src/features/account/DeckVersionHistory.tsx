import DisclosureChevron from "../../components/DisclosureChevron";
import * as React from "react";
import type { SavedDeckVersion, SavedDeckDetail } from "@gatcg/shared";

const UserDecklistPanel = React.lazy(() => import("./UserDecklistPanel"));

// Closed history must not mount deck previews: every preview has catalog subscriptions.
// Only one version is mounted at a time, without the live-deck recommendation analysis.
export function DeckVersionHistory({ deck, busy, onRestore }: { deck: SavedDeckDetail; busy: boolean; onRestore: (versionId: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [expandedVersionId, setExpandedVersionId] = React.useState<string | null>(deck.currentVersionId);

  const [extra, setExtra] = React.useState<SavedDeckVersion[]>([]);
  const [loaded, setLoaded] = React.useState<Record<string, SavedDeckVersion>>({});
  const [nextBefore, setNextBefore] = React.useState(deck.nextVersionBefore);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => { setExtra([]); setLoaded({}); setNextBefore(deck.nextVersionBefore); }, [deck]);
  const versions = [...deck.versions, ...extra];
  const selected = versions.find(version => version.id === expandedVersionId);
  React.useEffect(() => {
    if (!open || !selected || selected.decklist || loaded[selected.id]) return;
    let active = true;
    setError("");
    void import("../../lib/accountApi").then(({ accountApi }) => accountApi.deckVersion(deck.id, selected.id)).then(({ version }) => {
      if (active) setLoaded(current => ({ ...current, [version.id]: version }));
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load version"); });
    return () => { active = false; };
  }, [open, selected, loaded, deck.id]);
  async function loadMore() {
    if (nextBefore == null) return;
    setLoading(true); setError("");
    try {
      const { accountApi } = await import("../../lib/accountApi");
      const page = await accountApi.deckHistory(deck.id, nextBefore);
      setExtra(current => [...current, ...page.versions]); setNextBefore(page.nextBefore);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load history"); }
    finally { setLoading(false); }
  }

  return <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-label="Version history">
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between text-left font-semibold">
      <span>Version history <span className="font-normal text-ctp-subtext0">({deck.versionCount ?? deck.versions.length})</span></span>
      <DisclosureChevron className={open ? "rotate-180" : ""} />
    </button>
    {open && <div className="mt-3 space-y-2">{versions.map((summary) => {
      const version = loaded[summary.id] ?? summary;
      const expanded = expandedVersionId === version.id;
      return <div key={version.id} className="rounded-lg border border-ctp-surface1 p-3">
        <button type="button" aria-expanded={expanded} onClick={() => setExpandedVersionId(expanded ? null : version.id)} className="min-h-12 w-full text-left text-sm">
          <span className="font-medium">Version {version.versionNumber}</span><span className="ml-2 text-ctp-subtext1">{new Date(version.createdAt).toLocaleString()} · {version.changeNote || "Deck updated"}</span>{version.id === deck.currentVersionId && <span className="ml-2 text-ctp-green">Current</span>}
        </button>
        {expanded && <>
          <React.Suspense fallback={<p className="py-3 text-sm text-ctp-subtext0">Loading version…</p>}>
            {version.decklist ? <UserDecklistPanel decklist={version.decklist} format={version.format} showAnalysis={false} /> : <p role="status">{error ? "Close and reopen this version to retry." : "Loading version…"}</p>}
          </React.Suspense>
          {version.id !== deck.currentVersionId && <button disabled={busy} type="button" onClick={() => onRestore(version.id)} className="mt-2 min-h-12 rounded border border-ctp-blue px-3 text-xs text-ctp-blue disabled:opacity-50">Restore as new version</button>}
        </>}
      </div>;
    })}
      {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
      {nextBefore != null && <button type="button" disabled={loading} onClick={() => void loadMore()} className="min-h-12 rounded border border-ctp-surface2 px-3">{loading ? "Loading…" : "Load older versions"}</button>}
    </div>}
  </section>;
}
