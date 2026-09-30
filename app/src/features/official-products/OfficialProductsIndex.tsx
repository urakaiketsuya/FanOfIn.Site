import { useToast } from "../../components/ui/toast/ToastContext";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import DeckCardPreview from "../../components/DeckCardPreview";
import DeckPreviewCard from "../../components/DeckPreviewCard";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import { encodeCustomDecks } from "../../lib/compareShareLink";
import { useCardCatalog } from "../cards/useCardCatalog";
import { buildDecklistText } from "../events/DecklistView";
import { findDeckChampionName } from "../../lib/ttsExport";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { officialProductDecks, officialProductsSource, PRODUCT_LABELS, type OfficialProductDeck } from "./data";
import DeckCollectionTools from "../collection/DeckCollectionTools";
import Section from "../../components/ui/Section";

const SECTION_LABELS: Record<keyof OfficialProductDeck["cards"], string> = {
  material: "Material",
  main: "Main",
  sideboard: "Sideboard",
  mastery: "Mastery",
  token: "Tokens",
  pantheon: "Pantheon",
  generated: "Generated",
  status: "Statuses",
};

const SECTION_ORDER = ["material", "main", "sideboard", "mastery", "token", "pantheon", "generated", "status"] as const;

function asDecklist(deck: OfficialProductDeck): OmnidexDecklist {
  const lines = (section: "main" | "material" | "sideboard") => deck.cards[section].map((card) => ({ card: card.name, quantity: card.quantity }));
  return { main: lines("main"), material: lines("material"), sideboard: lines("sideboard") };
}

function ProductDeckCard({
  deck,
  cardsByName,
  compareSelected,
  compareDisabled,
  onToggleCompare,
}: {
  deck: OfficialProductDeck;
  cardsByName: Map<string, Card>;
  compareSelected: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const { notify } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [ownershipState, setOwnershipState] = useState<"idle" | "saving" | "saved" | "needs-cards" | "failed" | "signed-out">("idle");
  const [ownershipNotice, setOwnershipNotice] = useState("");
  const [missingCollectionLines, setMissingCollectionLines] = useState<{ cardUuid: string; cardName: string; quantity: number }[]>([]);
  const decklist = useMemo(() => asDecklist(deck), [deck]);
  const builderPath = useMemo(() => {
    const params = deckBuilderParamsFromDecklist(decklist, cardsByName);
    if (!params) return null;
    const path = buildDeckBuilderPath(params.championName, params.spiritFilter, params.lockedCards, params.lockedSections);
    return deck.productCode === "RDOPD" ? `${path}${path.includes("?") ? "&" : "?"}format=pantheon` : path;
  }, [deck, decklist, cardsByName]);
  const productLabel = PRODUCT_LABELS[deck.productCode] ?? deck.productCode;
  const releaseLabel = deck.releaseDate ? (deck.productCode === "DOAp" ? "Jan 2023" : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(deck.releaseDate))) : null;
  const collectionLines = useMemo(() => {
    const lines = new Map<string, { cardUuid: string; cardName: string; quantity: number }>();
    for (const section of [decklist.main, decklist.material, decklist.sideboard]) for (const line of section) {
      const card = cardsByName.get(line.card);
      if (!card) continue;
      const current = lines.get(card.uuid);
      if (current) current.quantity += line.quantity;
      else lines.set(card.uuid, { cardUuid: card.uuid, cardName: card.name, quantity: line.quantity });
    }
    return [...lines.values()];
  }, [decklist, cardsByName]);

  async function copyDecklist() {
    const extras = (["mastery", "token", "pantheon"] as const)
      .filter((section) => deck.cards[section].length > 0)
      .map((section) => `# ${SECTION_LABELS[section]}\n${deck.cards[section].map((line) => `${line.quantity} ${line.name}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText([buildDecklistText(decklist), extras].filter(Boolean).join("\n\n"));
      setCopyState("copied"); notify({ message: "Printed decklist copied.", key: "copy" });
    } catch {
      setCopyState("failed"); notify({ tone: "error", message: "Could not copy the printed decklist.", key: "copy", action: { label: "Retry", onClick: copyDecklist } });
    }
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  async function assignCopies(locationId: string, lines: { cardUuid: string; cardName: string; quantity: number }[]) {
    if (!lines.length) return;
    const tracking = await accountApi.collectionTracking();
    const records = new Map(tracking.cards.map((record) => [record.cardUuid, record]));
    await accountApi.saveCollectionTrackingBatch(lines.map((line) => {
      const record = records.get(line.cardUuid);
      const assignments = [...(record?.assignments ?? [])];
      const assignment = assignments.find((item) => item.deckId === locationId);
      if (assignment) assignment.quantity += line.quantity;
      else assignments.push({ deckId: locationId, quantity: line.quantity });
      return { cardUuid: line.cardUuid, cardName: line.cardName, mightOwn: record?.mightOwn ?? false, loans: record?.loans ?? [], revision: record?.revision ?? 0, assignments };
    }));
  }

  async function markOwned() {
    if (!collectionLines.length) return;
    setOwnershipState("saving"); setOwnershipNotice("");
    try {
      const [favorite, collection, tracking] = await Promise.all([
        accountApi.favoriteOfficialProductDeck(deck.id, { favorited: true, title: deck.name, format: deck.productCode === "RDOPD" ? "PANTHEON" : "STANDARD", championName: findDeckChampionName(decklist.material, cardsByName) ?? deck.champions[0] ?? null, decklist }),
        accountApi.collection(),
        accountApi.collectionTracking(),
      ]);
      const ownedByCard = new Map<string, number>();
      for (const entry of collection.entries) ownedByCard.set(entry.cardUuid, (ownedByCard.get(entry.cardUuid) ?? 0) + entry.ownedQuantity);
      const records = new Map(tracking.cards.map((record) => [record.cardUuid, record]));
      const assignedHere: { cardUuid: string; cardName: string; quantity: number }[] = [];
      const missing: { cardUuid: string; cardName: string; quantity: number }[] = [];
      for (const line of collectionLines) {
        const record = records.get(line.cardUuid);
        const alreadyHere = record?.assignments?.find((item) => item.deckId === favorite.locationId)?.quantity ?? 0;
        const assignedElsewhere = (record?.assignments ?? []).filter((item) => item.deckId !== favorite.locationId).reduce((sum, item) => sum + item.quantity, 0);
        const available = Math.max(0, (ownedByCard.get(line.cardUuid) ?? 0) - assignedElsewhere - alreadyHere);
        const quantity = Math.min(line.quantity - alreadyHere, available);
        if (quantity > 0) assignedHere.push({ ...line, quantity });
        const shortfall = Math.max(0, line.quantity - alreadyHere - quantity);
        if (shortfall > 0) missing.push({ ...line, quantity: shortfall });
      }
      await assignCopies(favorite.locationId, assignedHere);

      setMissingCollectionLines(missing);
      notify({ message: `${deck.name} pinned to My Decks.${missing.length ? " Some cards are still missing." : " Existing copies assigned."}`, tone: missing.length ? "warning" : "success", key: "ownership" });
      if (missing.length) {
        const copies = missing.reduce((sum, line) => sum + line.quantity, 0);
        setOwnershipState("needs-cards");
        setOwnershipNotice(`${deck.name} is pinned. ${assignedHere.reduce((sum, line) => sum + line.quantity, 0)} existing unassigned copies were located; ${copies} more ${copies === 1 ? "copy is" : "copies are"} needed.`);
      } else {
        setOwnershipState("saved");
        setOwnershipNotice(`${deck.name} is pinned in My Decks and your existing copies are assigned to it.`);
      }
    } catch (reason) {
      notify({ tone: "error", key: "ownership", message: reason instanceof Error ? reason.message : "Could not pin this deck. Please try again." });
      if (reason instanceof AccountApiError && reason.status === 401) { setOwnershipState("signed-out"); setOwnershipNotice("Sign in to add this deck and its cards to your library."); }
      else { setOwnershipState("failed"); setOwnershipNotice(reason instanceof Error ? reason.message : "Could not add this official deck."); }
    }
  }

  async function addMissingCopies() {
    if (!missingCollectionLines.length) return;
    setOwnershipState("saving"); setOwnershipNotice("");
    try {
      await accountApi.updateCollection({ mode: "add", source: `Official product: ${deck.name}`, requestId: crypto.randomUUID(), lines: missingCollectionLines });
      await assignCopies(`official-product:${deck.id}`, missingCollectionLines);

      setMissingCollectionLines([]); setOwnershipState("saved");
      notify({ message: "Missing copies added and assigned.", key: "ownership" });
      setOwnershipNotice(`Added and assigned the remaining ${deck.name} copies. Your pinned list is ready.`);
    } catch (reason) {
      notify({ tone: "error", key: "ownership", message: "Could not add the missing cards. Please try again." });
      setOwnershipState("failed");
      setOwnershipNotice(reason instanceof Error ? reason.message : "Could not add the missing cards.");
    }
  }

  return <DeckPreviewCard cardsByName={cardsByName} model={{
    id: deck.id, title: deck.name, decklist,
    championName: findDeckChampionName(decklist.material, cardsByName) ?? deck.champions[0],
    format: deck.productCode === "RDOPD" ? "PANTHEON" : "STANDARD",
    source: { kind: "official", label: "Official product" },
    metadata: productLabel,
    actions: <>
          {(ownershipState === "saved" || ownershipState === "needs-cards") && <Link to={`/card-locations?deck=${encodeURIComponent(`official-product:${deck.id}`)}`} className="inline-flex min-h-12 items-center rounded-md px-3 text-sm text-ctp-blue">Locate cards</Link>}
          <button type="button" disabled={ownershipState === "saving" || ownershipState === "saved" || ownershipState === "needs-cards" || !collectionLines.length} onClick={() => void markOwned()} className="inline-flex min-h-12 items-center rounded-md border border-ctp-green px-2.5 py-1.5 text-xs font-semibold text-ctp-green disabled:opacity-50">
            {ownershipState === "saving" ? "Setting up owned deck…" : ownershipState === "saved" ? "Owned deck set up ✓" : ownershipState === "needs-cards" ? "Pinned — cards needed" : "I own this deck"}
          </button>
          {ownershipState === "needs-cards" && <button type="button" onClick={() => void addMissingCopies()} className="inline-flex min-h-12 items-center rounded-md border border-ctp-green px-2.5 py-1.5 text-xs font-semibold text-ctp-green hover:bg-ctp-green/10">Add missing {missingCollectionLines.reduce((sum, line) => sum + line.quantity, 0)} copies</button>}
          <button type="button" onClick={copyDecklist} className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">
            {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}
          </button>
          <button
            type="button"
            onClick={onToggleCompare}
            disabled={compareDisabled}
            aria-pressed={compareSelected}
            className={`inline-flex min-h-12 items-center rounded-md border px-2.5 py-1.5 text-xs ${
              compareSelected
                ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue"
                : "border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            {compareSelected ? "Selected to compare ✓" : "Select to compare"}
          </button>
    </>,
    status: <>
        <p className="mt-2 text-xs text-ctp-subtext1">“I own this deck” pins the official list and assigns unassigned copies already in your collection. Missing copies are only added if you choose to add them.</p>
        {ownershipState === "signed-out" ? <Link to="/decks/edit" className="mt-2 inline-flex min-h-12 items-center text-xs text-ctp-blue underline">Sign in to add this deck →</Link> : ownershipNotice && <p role={ownershipState === "failed" ? "alert" : "status"} className={`mt-2 text-xs ${ownershipState === "failed" ? "text-ctp-red" : "text-ctp-green"}`}>{ownershipNotice}</p>}
    </>,
  }} view={{ expanded, onToggle: () => setExpanded(value => !value), content: <>
        <p className="mb-4 text-xs text-ctp-subtext1">{productLabel} · {deck.productCode}{releaseLabel && ` · ${deck.releaseDate! > new Date().toISOString().slice(0, 10) ? "Releases" : "Released"} ${releaseLabel}`}</p>
        <div className="mb-4 flex flex-wrap gap-2">          {builderPath && <Link to={builderPath} className="inline-flex min-h-12 items-center rounded-md border border-ctp-green px-2.5 py-1.5 text-xs text-ctp-green hover:bg-ctp-surface0">Tune in Deck Builder →</Link>}
          {deck.sourceUrl && <a href={deck.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Official source ↗</a>}
</div>
        <div className="grid gap-5">
          {SECTION_ORDER.map((section) => {
            const lines = deck.cards[section];
            if (lines.length === 0) return null;
            const count = lines.reduce((sum, line) => sum + line.quantity, 0);
            return <Section key={section} heading="dense" title={`${SECTION_LABELS[section]} (${count})`}>
              <DeckCardPreview groupByElement={section === "main"} lines={lines} cardsByName={cardsByName} />
            </Section>;
          })}
        </div>
      <div className="mt-4"><DeckCollectionTools decklist={decklist} cardsByName={cardsByName} source={`Official deck: ${deck.name}`} /></div>
    </> }} />;
}

export default function OfficialProductsIndex() {
  const { notify } = useToast();
  useDocumentTitle("Official Product Decks", "Browse and copy official Grand Archive starter deck and Re:Collection decklists, then tune them in the Guided Deck Builder.");
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const [section, setSection] = useState<"starter" | "recollection" | "pantheon">("starter");
  const [product, setProduct] = useState("all");
  const [query, setQuery] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const products = useMemo(() => Array.from(new Set(officialProductDecks.filter((deck) => section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD").map((deck) => deck.productCode))), [section]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return officialProductDecks.filter((deck) => (section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD") && (section === "pantheon" || product === "all" || deck.productCode === product) && (!needle || deck.name.toLowerCase().includes(needle) || deck.champions.some((champion) => champion.toLowerCase().includes(needle)))).sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.name.localeCompare(b.name));
  }, [section, product, query]);
  const comparedDecks = useMemo(
    () => compareIds.map((id) => officialProductDecks.find((deck) => deck.id === id)).filter((deck): deck is OfficialProductDeck => deck !== undefined),
    [compareIds],
  );
  const comparePath = useMemo(() => {
    if (comparedDecks.length < 2) return null;
    const custom = encodeCustomDecks(comparedDecks.map((deck) => ({ label: deck.name, decklist: asDecklist(deck) })));
    return `/compare?${new URLSearchParams({ custom, panel: "compare" }).toString()}`;
  }, [comparedDecks]);
  const sectionLabel = section === "pantheon" ? "Pantheon" : section === "recollection" ? "Re:Collection" : "starter";

  function toggleCompare(id: string) {
    const removing = compareIds.includes(id);
    if (!removing && compareIds.length >= 4) return;
    notify({ message: `${removing ? "Removed deck from comparison" : "Added deck to comparison"} · ${compareIds.length + (removing ? -1 : 1)} selected.`, key: "compare" });
    setCompareIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : current.length < 4 ? [...current, id] : current);
  }

  return (
    <PageLayout data-component="OfficialProductsIndex" width="wide">
      <PageHeader title="Official Product Decks" description={<>Starter decks, Re:Collection lists, and Pantheon starters published by Grand Archive. Copy a list as printed or open it in the Guided Deck Builder to start tuning. Source data is attributed to <a href={officialProductsSource} target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">GrandArchive on Silvie.org</a>.</>} />

      <div className="mb-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1" role="group" aria-label="Official deck format">
        {(["starter", "recollection", "pantheon"] as const).map((value) => <button key={value} type="button" aria-pressed={section === value} onClick={() => { setSection(value); setProduct("all"); }} className={`min-h-12 rounded-md px-3 py-1.5 text-sm ${section === value ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{value === "pantheon" ? "Pantheon" : value === "recollection" ? "Re:Collection" : "Starter"}</button>)}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 rounded-xl border border-ctp-surface0 bg-ctp-mantle/50 p-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Champion or product…" aria-label="Search official decks" className="min-h-12 min-w-0 w-full sm:w-auto flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-overlay0" />
        <select value={product} onChange={(event) => setProduct(event.target.value)} aria-label="Product" className="min-h-12 min-w-0 max-w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">
          <option value="all">All products ({officialProductDecks.filter((deck) => section === "pantheon" ? deck.productCode === "RDOPD" : section === "recollection" ? deck.productCode.startsWith("ReC-") : !deck.productCode.startsWith("ReC-") && deck.productCode !== "RDOPD").length})</option>
          {products.map((code) => <option key={code} value={code}>{PRODUCT_LABELS[code] ?? code}</option>)}
        </select>
      </div>

      <div className={`mb-6 rounded-xl border p-3 shadow-sm backdrop-blur transition-colors ${compareIds.length > 0 ? "border-ctp-blue/50 bg-ctp-base/95" : "border-ctp-surface0 bg-ctp-mantle/30"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1">
            <p className="text-sm font-semibold text-ctp-text">Compare {sectionLabel} decks</p>
            <p className="mt-0.5 text-xs text-ctp-subtext0">
              {compareIds.length === 0 && `Select two to four ${sectionLabel.toLowerCase()} decks below.`}
              {compareIds.length === 1 && "One selected — choose one more."}
              {compareIds.length >= 2 && compareIds.length < 4 && `Ready to compare ${compareIds.length} decks — add up to ${4 - compareIds.length} more.`}
              {compareIds.length === 4 && "Four selected — ready to compare."}
            </p>
          </div>
          {comparedDecks.map((deck) => (
            <button key={deck.id} type="button" onClick={() => toggleCompare(deck.id)} title={`Remove ${deck.name}`} className="min-h-12 rounded-full border border-ctp-blue/50 bg-ctp-base px-2.5 py-1 text-xs text-ctp-blue hover:border-ctp-red hover:text-ctp-red">
              {deck.name} ×
            </button>
          ))}
          {comparePath && <Link to={comparePath} className="inline-flex min-h-12 items-center rounded-md bg-ctp-blue px-3 py-2 text-sm font-semibold text-ctp-base hover:brightness-110">Compare selected →</Link>}
        </div>
      </div>

      <p className="mb-3 text-xs text-ctp-subtext0">Showing {visible.length} official deck{visible.length === 1 ? "" : "s"}</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">{visible.map((deck) => <ProductDeckCard key={deck.id} deck={deck} cardsByName={cardsByName} compareSelected={compareIds.includes(deck.id)} compareDisabled={compareIds.length === 4 && !compareIds.includes(deck.id)} onToggleCompare={() => toggleCompare(deck.id)} />)}</div>
      {visible.length === 0 && <p className="rounded-xl border border-ctp-surface0 p-8 text-center text-sm text-ctp-subtext1">No official products match those filters.</p>}
    </PageLayout>
  );
}
