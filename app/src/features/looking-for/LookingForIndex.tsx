import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { decodeLookingForShare, encodeLookingForShare, type LookingForEntry } from "../../lib/lookingForShareLink";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardCatalog } from "../cards/useCardCatalog";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";

type ViewMode = "cards" | "sets";

function editionLabel(edition: CardEdition): string {
  return `${edition.set.name} (${edition.set.prefix}) #${edition.collector_number}`;
}

function mergeEntries(entries: LookingForEntry[]): LookingForEntry[] {
  const merged = new Map<string, LookingForEntry>();
  for (const entry of entries) {
    const key = `${entry.name.toLocaleLowerCase()}\u0000${entry.editionUuid ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += entry.quantity;
    else merged.set(key, { ...entry });
  }
  return [...merged.values()];
}

function RequestedCard({ entry, card, editable, onEditionChange }: {
  entry: LookingForEntry;
  card?: Card;
  editable: boolean;
  onEditionChange?: (editionUuid?: string) => void;
}) {
  const selectedEdition = card?.editions.find((edition) => edition.uuid === entry.editionUuid);
  const displayEdition = selectedEdition ?? card?.editions[0];

  return (
    <Panel as="article" padding="sm">
      <div className="flex gap-3">
        {displayEdition ? (
          <CardImage image={displayEdition.image} alt={entry.name} className="h-28 w-20 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded border border-ctp-surface1 bg-ctp-surface0 px-2 text-center text-xs text-ctp-subtext0">No image</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {card ? <Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-blue hover:underline">{card.name}</Link> : <p className="font-semibold text-ctp-red">{entry.name}</p>}
            <span className="shrink-0 rounded-full bg-ctp-surface0 px-2 py-0.5 text-sm font-semibold text-ctp-text">×{entry.quantity}</span>
          </div>
          {!card && <p className="mt-1 text-xs text-ctp-red">Card name not found in the synced catalog.</p>}
          {card && editable && (
            <label className="mt-3 block text-xs text-ctp-subtext0">
              Printing preference
              <select value={entry.editionUuid ?? ""} onChange={(event) => onEditionChange?.(event.target.value || undefined)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-sm text-ctp-text">
                <option value="">Any printing</option>
                {card.editions.map((edition) => <option key={edition.uuid} value={edition.uuid}>{editionLabel(edition)}</option>)}
              </select>
            </label>
          )}
          {card && !editable && (
            selectedEdition
              ? <p className="mt-2 text-xs text-ctp-subtext1">{editionLabel(selectedEdition)}</p>
              : entry.editionUuid
                ? <p className="mt-2 text-xs text-ctp-yellow">Selected printing is no longer available; any printing shown.</p>
                : <div className="mt-2"><p className="text-xs font-medium text-ctp-subtext1">Any printing</p><div className="mt-1 flex flex-wrap gap-1">{[...new Set(card.editions.map((edition) => edition.set.prefix))].map((prefix) => <span key={prefix} className="rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] text-ctp-subtext0">{prefix}</span>)}</div></div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function LookingForIndex() {
  const cards = useCardCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const shared = useMemo(() => searchParams.get("v") === "1" && searchParams.get("list") ? decodeLookingForShare(searchParams.get("list") as string) : null, [searchParams]);
  const isSharedView = shared !== null;
  useDocumentTitle(shared?.title ?? "Looking For", "Create and share a Grand Archive card wishlist with printing and set preferences.");

  const cardsByLowerName = useMemo(() => new Map(cards.map((card) => [card.name.toLocaleLowerCase(), card])), [cards]);
  const [title, setTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [entries, setEntries] = useState<LookingForEntry[]>([]);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const visibleEntries = shared?.entries ?? entries;
  const resolved = useMemo(() => visibleEntries.map((entry) => ({ entry, card: cardsByLowerName.get(entry.name.toLocaleLowerCase()) })), [visibleEntries, cardsByLowerName]);
  const totalCards = visibleEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  function importList() {
    const parsed = parseDecklist(pasteText);
    const canonicalized = [...parsed.decklist.main, ...parsed.decklist.material, ...parsed.decklist.sideboard].map((line) => ({
      name: cardsByLowerName.get(line.card.toLocaleLowerCase())?.name ?? line.card,
      quantity: line.quantity,
    }));
    setEntries(mergeEntries(canonicalized));
    setSkippedLines(parsed.skippedLines);
    setCopyState("idle");
  }

  function changeEdition(index: number, editionUuid?: string) {
    setEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, editionUuid } : entry));
    setCopyState("idle");
  }

  async function copyShareLink() {
    const payload = encodeLookingForShare({ title, entries });
    const params = new URLSearchParams({ v: "1", list: payload });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function startNewList() {
    setSearchParams({}, { replace: true });
    setTitle("");
    setPasteText("");
    setEntries([]);
    setSkippedLines([]);
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof resolved>();
    for (const item of resolved) {
      const edition = item.card?.editions.find((candidate) => candidate.uuid === item.entry.editionUuid);
      const key = edition ? `${edition.set.name} (${edition.set.prefix})` : "Any printing";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].sort(([a], [b]) => a === "Any printing" ? 1 : b === "Any printing" ? -1 : a.localeCompare(b));
  }, [resolved]);

  return (
    <PageLayout width="wide">
      <PageHeader title={shared?.title ?? "Looking For"} description={isSharedView ? `${totalCards} cards across ${visibleEntries.length} requested items.` : "Paste a card list, choose acceptable printings, and send one link to traders or friends."} actions={isSharedView ? <Button variant="secondary" onClick={startNewList}>Create your own</Button> : undefined} />

      {!isSharedView && (
        <Panel>
          <label className="block text-sm font-medium text-ctp-text">List title <span className="font-normal text-ctp-subtext0">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Looking For List" className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /></label>
          <label className="mt-4 block text-sm font-medium text-ctp-text">Card list<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={9} placeholder={'# Main Deck\n1 Aenean Ward\n2 Angel Attendant\n4 Fireball'} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 font-mono text-sm text-ctp-text" /></label>
          <p className="mt-2 text-xs text-ctp-subtext0">Use one card per line: “4 Fireball” or “4x Fireball”. Main, Material, and Sideboard headers are accepted but combined into one wishlist.</p>
          <Button variant="primary" onClick={importList} disabled={!pasteText.trim()} className="mt-4">Review list</Button>
        </Panel>
      )}

      {skippedLines.length > 0 && !isSharedView && <Panel tone="warning" padding="sm" className="mt-4 text-sm text-ctp-subtext1"><p className="font-medium text-ctp-yellow">Some lines could not be imported:</p><p className="mt-1 font-mono text-xs">{skippedLines.join(" · ")}</p></Panel>}

      {visibleEntries.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ctp-subtext1">{totalCards} cards · {visibleEntries.length} unique requests</p>
            {isSharedView && <div className="flex rounded-md border border-ctp-surface1 p-0.5">{(["cards", "sets"] as const).map((mode) => <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`rounded px-3 py-1 text-xs ${viewMode === mode ? "bg-ctp-surface1 text-ctp-text" : "text-ctp-subtext0"}`}>{mode === "cards" ? "Cards" : "By Set"}</button>)}</div>}
          </div>

          {viewMode === "cards" || !isSharedView ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{resolved.map(({ entry, card }, index) => <RequestedCard key={`${entry.name}-${entry.editionUuid ?? "any"}-${index}`} entry={entry} card={card} editable={!isSharedView} onEditionChange={(uuid) => changeEdition(index, uuid)} />)}</div> : <div className="mt-5 space-y-7">{grouped.map(([group, items]) => <Section key={group} heading="compact" title={group}><div className="mt-3 grid gap-4 sm:grid-cols-2">{items.map(({ entry, card }, index) => <RequestedCard key={`${entry.name}-${index}`} entry={entry} card={card} editable={false} />)}</div></Section>)}</div>}

          {!isSharedView && <div className="mt-6 flex items-center gap-3"><button type="button" onClick={copyShareLink} className="rounded-md bg-ctp-green px-4 py-2 text-sm font-semibold text-ctp-base">{copyState === "copied" ? "Link copied!" : copyState === "failed" ? "Couldn't copy link" : "Copy share link"}</button><span className="text-xs text-ctp-subtext0">The link contains the list; no account or server storage is needed.</span></div>}
        </section>
      )}

      {isSharedView && resolved.some(({ card }) => !card) && <p className="mt-5 text-sm text-ctp-yellow">Some requested names could not be matched to the current card catalog. They remain visible so nothing is silently lost.</p>}
    </PageLayout>
  );
}
