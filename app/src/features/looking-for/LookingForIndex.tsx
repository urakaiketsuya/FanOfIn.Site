import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, CardEdition } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { decodeLookingForShare, encodeLookingForShare, type LookingForEntry } from "../../lib/lookingForShareLink";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardCatalog } from "../cards/useCardCatalog";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";
import TradingBinder from "./TradingBinder";

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
        <div className="w-20 shrink-0">
          <CardArtTile card={card} name={entry.name} editionUuid={displayEdition?.uuid} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {card ? <Link to={`/cards/${card.slug}`} className="inline-flex min-h-control items-center rounded font-semibold text-ctp-blue hover:underline focus-visible:outline-2">{card.name}</Link> : <p className="font-semibold text-ctp-red">{entry.name}</p>}
            <span className="shrink-0 rounded-full bg-ctp-surface0 px-2 py-0.5 text-sm font-semibold text-ctp-text">×{entry.quantity}</span>
          </div>
          {!card && <p className="mt-1 text-xs text-ctp-red">Card name not found in the synced catalog.</p>}
          {card && editable && (
            <label className="mt-3 block text-xs text-ctp-subtext0">
              Printing preference
              <select value={entry.editionUuid ?? ""} onChange={(event) => onEditionChange?.(event.target.value || undefined)} className="mt-1 block min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-sm text-ctp-text">
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
  const publicBinderSlug = searchParams.get("binder") ?? undefined;
  const isSharedView = shared !== null;
  useDocumentTitle(shared?.title ?? (publicBinderSlug ? "Public Trading Binder" : "Trading Binder"), "Publish cards for trade, track wants, find matches, and manage offers.");

  const cardsByLowerName = useMemo(() => new Map(cards.map((card) => [card.name.toLocaleLowerCase(), card])), [cards]);
  const [title, setTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [entries, setEntries] = useState<LookingForEntry[]>([]);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [personalView, setPersonalView] = useState<"binder" | "quick">("binder");

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
    setPersonalView("binder");
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

  const cardList = <div className="mt-4 grid gap-4 sm:grid-cols-2">
    {resolved.map(({ entry, card }, index) => (
      <RequestedCard key={`${entry.name}-${index}`} entry={entry} card={card} editable={!isSharedView}
        onEditionChange={uuid => changeEdition(index, uuid)} />
    ))}
  </div>;

  return (
    <PageLayout data-component="LookingForIndex" width="wide">
      <PageHeader title={shared?.title ?? (publicBinderSlug ? "Public Trading Binder" : "Trading Binder")} description={isSharedView ? `${totalCards} cards across ${visibleEntries.length} requested items.` : publicBinderSlug ? "Cards this player has made public for trading." : "Publish only the cards you choose, find reciprocal wants, and manage trade offers without exposing your private collection."} actions={(isSharedView || publicBinderSlug) ? <Button variant="secondary" onClick={startNewList}>Open your binder</Button> : undefined} />

      {!isSharedView && !publicBinderSlug && <Tabs baseId="trade-workspace" label="Trading workspace" variant="pill" wrap
        tabs={[{ key: "binder", label: "My binder" }, { key: "quick", label: "Quick share list" }]}
        active={personalView} onChange={setPersonalView} />}
      {publicBinderSlug && !isSharedView && <TradingBinder publicSlug={publicBinderSlug} />}
      {!isSharedView && !publicBinderSlug && <TabPanel baseId="trade-workspace" tab="binder" active={personalView} keepMounted>
        <TradingBinder />
      </TabPanel>}

      {!isSharedView && !publicBinderSlug && <TabPanel baseId="trade-workspace" tab="quick" active={personalView} keepMounted>
        <Panel className="mt-4">
          <label className="block text-sm font-medium text-ctp-text">List title <span className="font-normal text-ctp-subtext0">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Looking For List" className="mt-1 block min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /></label>
          <label className="mt-4 block text-sm font-medium text-ctp-text">Card list<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={6} placeholder={'4 Fireball\n2 Angel Attendant'} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 font-mono text-sm text-ctp-text" /></label>
          <Button variant="primary" onClick={importList} disabled={!pasteText.trim()} className="mt-4">Review list</Button>
        </Panel>
        {skippedLines.length > 0 && <Panel tone="warning" padding="sm" className="mt-4 text-sm text-ctp-subtext1">
          <p className="font-medium text-ctp-yellow">Some lines could not be imported</p>
          <p className="mt-1 break-words font-mono text-xs">{skippedLines.join(" · ")}</p>
        </Panel>}
        {visibleEntries.length > 0 && <section className="mt-6" aria-label="List review">
          <p className="text-sm text-ctp-subtext1">{totalCards} cards · {visibleEntries.length} unique requests</p>
          {cardList}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={copyShareLink}>Copy share link</Button>
            {copyState !== "idle" && <span role="status" className="text-sm">{copyState === "copied" ? "Link copied" : "Couldn’t copy link"}</span>}
          </div>
        </section>}
      </TabPanel>}

      {isSharedView && visibleEntries.length > 0 && <section className="mt-6" aria-label="Requested cards">
        <Tabs baseId="wishlist-view" label="Wishlist view" variant="pill" wrap
          active={viewMode} onChange={setViewMode} tabs={[{ key: "cards", label: "Cards" }, { key: "sets", label: "By set" }]} />
        <TabPanel baseId="wishlist-view" tab="cards" active={viewMode}>{cardList}</TabPanel>
        <TabPanel baseId="wishlist-view" tab="sets" active={viewMode}>
          <div className="mt-5 space-y-7">
            {grouped.map(([group, items]) => <Section key={group} heading="compact" title={group}>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {items.map(({ entry, card }, index) => <RequestedCard key={`${entry.name}-${index}`} entry={entry} card={card} editable={false} />)}
              </div>
            </Section>)}
          </div>
        </TabPanel>
      </section>}

      {isSharedView && resolved.some(({ card }) => !card) && <p className="mt-5 text-sm text-ctp-yellow">Some requested names could not be matched to the current card catalog. They remain visible so nothing is silently lost.</p>}
    </PageLayout>
  );
}
