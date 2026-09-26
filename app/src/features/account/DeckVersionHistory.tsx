import * as React from "react";
import type { SavedDeckDetail } from "@gatcg/shared";

const UserDecklistPanel = React.lazy(() => import("./UserDecklistPanel"));

// Closed history must not mount deck previews: every preview has catalog subscriptions.
// Only one version is mounted at a time, without the live-deck recommendation analysis.
export function DeckVersionHistory({ deck, busy, onRestore }: { deck: SavedDeckDetail; busy: boolean; onRestore: (versionId: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [expandedVersionId, setExpandedVersionId] = React.useState<string | null>(deck.currentVersionId);

  return <section className="mt-5 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-label="Version history">
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between text-left font-semibold">
      <span>Version history <span className="font-normal text-ctp-subtext0">({deck.versions.length})</span></span>
      <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
    </button>
    {open && <div className="mt-3 space-y-2">{deck.versions.map((version) => {
      const expanded = expandedVersionId === version.id;
      return <div key={version.id} className="rounded-lg border border-ctp-surface1 p-3">
        <button type="button" aria-expanded={expanded} onClick={() => setExpandedVersionId(expanded ? null : version.id)} className="min-h-11 w-full text-left text-sm">
          <span className="font-medium">Version {version.versionNumber}</span><span className="ml-2 text-ctp-subtext1">{new Date(version.createdAt).toLocaleString()} · {version.changeNote || "Deck updated"}</span>{version.id === deck.currentVersionId && <span className="ml-2 text-ctp-green">Current</span>}
        </button>
        {expanded && <>
          <React.Suspense fallback={<p className="py-3 text-sm text-ctp-subtext0">Loading version…</p>}>
            <UserDecklistPanel decklist={version.decklist} format={version.format} showAnalysis={false} />
          </React.Suspense>
          {version.id !== deck.currentVersionId && <button disabled={busy} type="button" onClick={() => onRestore(version.id)} className="mt-2 min-h-11 rounded border border-ctp-blue px-3 text-xs text-ctp-blue disabled:opacity-50">Restore as new version</button>}
        </>}
      </div>;
    })}</div>}
  </section>;
}
