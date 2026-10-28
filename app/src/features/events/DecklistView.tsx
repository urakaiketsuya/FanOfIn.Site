import DialogSheet from "../../components/ui/DialogSheet";
import DecklistActions from "./DecklistActions";
import { arrangeDeckSections, DECK_GROUPS, DECK_SORTS, type DeckGrouping, type DeckSorting } from "../../lib/decklistArrangement";
import MenuDetails from "../../components/ui/MenuDetails";
import DeckLegalityWarning from "../../components/deck-editor/DeckLegalityWarning";
import { sortDeckCardsByElement } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckCollectionLine, DeckFormat, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { VisualCommunityGate, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { useDeckPriceByNameState } from "../pricing/useDeckPriceByName";
import { usePriceTrendByName } from "../pricing/usePriceTrendByName";
import { useSimulatorEvidenceByName } from "../simulator/useSimulatorEvidenceByName";
import DeckTuningEvidence from "./DeckTuningEvidence";
import { formatUsd } from "../../lib/format";
import { computeSectionPrice } from "../../lib/deckPrice";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { useCardCatalog } from "../cards/useCardCatalog";
import { extractProducedTokens } from "../../lib/cardIntent";
import { useDecklistDisplayPrefs, type DeckDisplayMode } from "../../lib/decklistDisplayPrefs";
import DecklistWinRate from "./DecklistWinRate";
import Button from "../../components/ui/Button";
import { DeckSectionExpansion } from "./DeckSection";
import { DetailedDeckSection, VisualDeckSections } from "./DecklistSections";

export { buildDecklistText, buildEditableDeckText } from "../../lib/decklistText";

export default function DecklistView({
  decklist,
  deckTitle,
  deckOwner,
  cardsByName,
  showThumbnails = false,
  deckId,
  format,
  championFallback = true,
  extraSections = [],
  trailingSections = [],
  defaultDisplayMode = "detailed",
  showDeckStats = true,
  showAnalysis = true,
  ownershipByName,
  toolbarActions,
  showActions = true,
  collectionControl,
  collectionPanel,
}: {
  decklist: OmnidexDecklist;
  deckTitle?: string;
  deckOwner?: string;
  cardsByName: Map<string, Card>;
  showThumbnails?: boolean;
  /** `${eventId}:${player}` – when present, resolves this decklist's named-build cluster for `DeckTuningEvidence`'s "Cards that might help" box, and (with the "Win rate" display preference on) this specific sighting's own match record. Omit for a pasted/custom decklist with no real deckId – `DeckTuningEvidence` still falls back to Champion-scoped evidence unless `championFallback` is false, and the win-rate section simply doesn't render. */
  deckId?: string;
  /** Suppresses `DeckTuningEvidence` entirely when "PANTHEON" – the tournament pipeline that evidence is built from doesn't track that format. Omit for tournament decklists, which are always Standard. */
  format?: DeckFormat;
  /** Set false on a page that already renders its own Champion-scoped "cards that might help" fallback (currently only `DeckDetail.tsx`) to avoid a redundant second copy. The "cards worth reviewing" box is unaffected – nothing else surfaces that signal today. */
  championFallback?: boolean;
  extraSections?: { title: string; lines: OmnidexDecklistCardLine[] }[];
  trailingSections?: { title: string; lines: OmnidexDecklistCardLine[] }[];
  defaultDisplayMode?: DeckDisplayMode;
  /** Set false on a page that already renders its own DIAO score / win rate (currently only `DeckDetail.tsx`, which shows a cluster-level average win rate rather than this one sighting's record) to avoid a redundant, differently-scoped second copy. */
  showDeckStats?: boolean;
  /** Disable expensive recommendation analysis in historical previews. */
  showAnalysis?: boolean;
  /** Ownership status for the signed-in viewer. When supplied, shortages are visible in every display mode. */
  ownershipByName?: Map<string, DeckCollectionLine>;
  toolbarActions?: ReactNode;
  showActions?: boolean;
  collectionControl?: ReactNode;
  collectionPanel?: ReactNode;
}) {
  const displayPrefs = useDecklistDisplayPrefs();
  const priceSorting = displayPrefs.sorting === "priceAsc" || displayPrefs.sorting === "priceDesc";
  const showPrices = displayPrefs.showPrices || priceSorting;
  const priceState = useDeckPriceByNameState(showPrices);
  const { priceByName } = priceState;
  const priceTrendByName = usePriceTrendByName(displayPrefs.showPrices && displayPrefs.visualPriceTrend);
  const catalog = useCardCatalog();
  // Visual mode's optional "sim games" field only – cardId isn't Champion-scoped like the Guided
  // Deck Builder's own evidence map, so this works for any decklist, not just a suggested build.
  const simulatorEvidenceByName = useSimulatorEvidenceByName();
  const [customizing, setCustomizing] = useState(false);
  const displayMode = displayPrefs.displayMode ?? (defaultDisplayMode === "detailed" && typeof window !== "undefined" && window.matchMedia?.("(max-width: 639px)").matches ? "visual" : defaultDisplayMode);
  const setDisplayMode = displayPrefs.setDisplayMode;
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const deckPrice = computeSectionPrice([...decklist.main, ...decklist.material], priceByName);
  const sideboardPrice = computeSectionPrice(decklist.sideboard, priceByName);
  const missingCount = deckPrice.missing + sideboardPrice.missing;

  const referencedTokens = useMemo(() => {
    const catalogBySlug = new Map(catalog.map((card) => [card.slug, card]));
    const tokenByName = new Map(catalog.filter((card) => card.types.includes("TOKEN")).map((card) => [card.name.toLocaleLowerCase(), card]));
    const tokens = new Map<string, OmnidexDecklistCardLine>();
    for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) {
      const source = cardsByName.get(line.card);
      for (const reference of source?.references ?? []) {
        const target = catalogBySlug.get(reference.slug) ?? catalog.find((card) => card.name === reference.name);
        if (target?.types.includes("TOKEN")) tokens.set(target.name, { card: target.name, quantity: 1 });
      }
      // Many token cards are absent from the API reference graph even though the printed effect
      // names them. Resolve those names through the catalog for real card thumbnails and links.
      for (const tokenName of source ? extractProducedTokens(source) : []) {
        const target = tokenByName.get(tokenName.toLocaleLowerCase());
        if (target) tokens.set(target.name, { card: target.name, quantity: 1 });
      }
    }
    return Array.from(tokens.values()).sort((a, b) => a.card.localeCompare(b.card));
  }, [catalog, decklist, cardsByName]);
  const displayTrailingSections = useMemo(
    () => [...trailingSections, ...(referencedTokens.length > 0 && !trailingSections.some((section) => section.title === "Tokens") ? [{ title: "Tokens", lines: referencedTokens }] : [])],
    [trailingSections, referencedTokens],
  );
  // Tokens are not decklist lines, so callers generally do not include them in their initial
  // image lookup. Merge the local catalog for display only, keeping caller-resolved cards first.
  const displayCardsByName = useMemo(() => new Map([...catalog.map((card) => [card.name, card] as const), ...cardsByName]), [catalog, cardsByName]);

  const missingOwnershipLines = useMemo(() => ownershipByName ? [...ownershipByName.values()].filter((line) => line.missing > 0) : [], [ownershipByName]);
  const missingCopies = missingOwnershipLines.reduce((sum, line) => sum + line.missing, 0);
  const missingCardNames = useMemo(() => new Set(missingOwnershipLines.map((line) => line.card)), [missingOwnershipLines]);
  const missingMassEntryUrl = useMemo(() => buildTcgplayerMassEntryUrl(missingOwnershipLines.map((line) => ({ name: line.card, quantity: line.missing }))), [missingOwnershipLines]);
  const visibleSections = useMemo(() => {
    const filter = (lines: OmnidexDecklistCardLine[]) => showMissingOnly && missingCopies > 0 && ownershipByName ? lines.filter((line) => missingCardNames.has(line.card)) : lines;
    return {
      extra: extraSections.map((section) => ({ ...section, lines: filter(section.lines) })),
      main: sortDeckCardsByElement(filter(decklist.main), displayCardsByName),
      material: filter(decklist.material),
      sideboard: filter(decklist.sideboard),
      trailing: displayTrailingSections.map((section) => ({ ...section, lines: filter(section.lines) })),
    };
  }, [decklist, displayCardsByName, displayTrailingSections, extraSections, missingCardNames, missingCopies, showMissingOnly, ownershipByName]);

  const arrangedSections = useMemo(() => arrangeDeckSections([...visibleSections.extra, { title: "Main", lines: visibleSections.main }, { title: "Material", lines: visibleSections.material }, { title: "Sideboard", lines: visibleSections.sideboard }, ...visibleSections.trailing], displayCardsByName, priceByName, displayPrefs.grouping, displayPrefs.sorting), [visibleSections, displayCardsByName, priceByName, displayPrefs.grouping, displayPrefs.sorting]);

  return (
    <DeckSectionExpansion><div data-component="DecklistView">
      <DeckLegalityWarning deck={decklist} catalog={cardsByName} format={format ?? "STANDARD"} historical />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Card layout" className="flex flex-wrap gap-1">
          {(["Grid", "Rows", "List"] as const).map(layout => {
            const selected = layout === "List" ? displayMode === "detailed" : displayMode === "visual" && (layout === "Rows" ? displayPrefs.visualCardSize === "rows" : displayPrefs.visualCardSize !== "rows");
            return <Button key={layout} aria-pressed={selected} variant={selected ? "primary" : "secondary"} onClick={() => {
              setDisplayMode(layout === "List" ? "detailed" : "visual");
              if (layout === "Rows") displayPrefs.setVisualCardSize("rows");
              else if (layout === "Grid" && displayPrefs.visualCardSize === "rows") displayPrefs.setVisualCardSize("medium");
            }}>{layout}</Button>;
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ctp-subtext1">{DECK_GROUPS[displayPrefs.grouping]} · {DECK_SORTS[displayPrefs.sorting]}</span>
          <Button onClick={() => setCustomizing(true)}>Customize</Button>
          {collectionControl}
          {showActions && <MenuDetails className="relative"><summary className="flex min-h-control cursor-pointer list-none items-center px-3 text-sm">More <DisclosureChevron /></summary><div className="absolute right-0 top-full z-30 grid w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><DecklistActions decklist={decklist} cardsByName={displayCardsByName} deckTitle={deckTitle} deckOwner={deckOwner} extraSections={extraSections} trailingSections={trailingSections} toolbarActions={toolbarActions} /></div></MenuDetails>}
        </div>
      </div>
      {customizing && <DialogSheet title="Customize cards" onDismiss={() => setCustomizing(false)} footer={<Button variant="primary" onClick={() => setCustomizing(false)}>Done</Button>}>
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Arrange</h3>
            <label className="block text-xs text-ctp-subtext1">Group by<select className="mt-1 min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-2" value={displayPrefs.grouping} onChange={event => displayPrefs.setGrouping(event.target.value as DeckGrouping)}>{Object.entries(DECK_GROUPS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-xs text-ctp-subtext1">Sort cards<select className="mt-1 min-h-control w-full rounded border border-ctp-surface1 bg-ctp-base px-2" value={displayPrefs.sorting} onChange={event => displayPrefs.setSorting(event.target.value as DeckSorting)}>{Object.entries(DECK_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {displayMode === "visual" && displayPrefs.visualCardSize !== "rows" && <h3 className="text-sm font-medium">Appearance</h3>}
            {displayMode === "visual" && <>               {displayPrefs.visualCardSize !== "rows" && <label className="flex items-center justify-between text-xs text-ctp-subtext1">Grid size<select aria-label="Grid size" value={displayPrefs.visualCardSize} onChange={(event) => displayPrefs.setVisualCardSize(event.target.value as "large" | "medium" | "compact" | "rows")} className="min-h-control rounded border border-ctp-surface1 bg-ctp-base px-2"><option value="large">Large</option><option value="medium">Medium</option><option value="compact">Compact</option></select></label>} </>}
            <h3 className="text-sm font-medium">Show</h3>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={priceSorting} aria-pressed={showPrices} onClick={() => displayPrefs.setShowPrices(!displayPrefs.showPrices)} className={`min-h-control rounded-md px-3 text-xs ${showPrices ? "bg-ctp-blue/10 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>{priceSorting ? "Price · sorting" : "Price"}</button>

            </div>
            {displayMode === "visual" && <>

              {[
                { label: "Cost", checked: displayPrefs.visualCost, change: displayPrefs.setVisualCost },
                { label: "Price trend", checked: displayPrefs.visualPriceTrend, change: displayPrefs.setVisualPriceTrend },
                { label: "Tags", checked: displayPrefs.visualTags, change: displayPrefs.setVisualTags },
                { label: "Simulator games", checked: displayPrefs.visualSimulator, change: displayPrefs.setVisualSimulator },
                { label: "Community usage", checked: displayPrefs.visualCommunity, change: displayPrefs.setVisualCommunity },
              ].map((field) => <label key={field.label} className="flex min-h-control items-center gap-2 text-xs text-ctp-subtext1"><input type="checkbox" checked={field.checked} onChange={(event) => field.change(event.target.checked)} />{field.label}</label>)}
            </>}
          <Link to="/settings" className="inline-flex min-h-control items-center text-sm text-ctp-blue">More display settings</Link>
        </div>
      </DialogSheet>}
      {showPrices && <div className="mb-3 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text">Estimated price: {formatUsd(deckPrice.total + sideboardPrice.total)}</span><span className="ml-2 text-xs">Main + Material {formatUsd(deckPrice.total)} · Sideboard {formatUsd(sideboardPrice.total)}</span>{missingCount > 0 && <span className="ml-2 text-xs">{missingCount} card{missingCount === 1 ? "" : "s"} without prices</span>}</div>}
      {collectionPanel && <div className="mb-3">{collectionPanel}</div>}
      {ownershipByName && (missingCopies > 0 ? <div className="mb-4 space-y-2 text-sm">
        {!collectionPanel && <p className="text-ctp-text"><strong className="text-ctp-yellow">{missingCopies} missing cop{missingCopies === 1 ? "y" : "ies"}</strong> across {missingOwnershipLines.length} card{missingOwnershipLines.length === 1 ? "" : "s"}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={showMissingOnly} onClick={() => setShowMissingOnly(value => !value)} className={`min-h-12 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ctp-blue ${showMissingOnly ? "border-ctp-yellow bg-ctp-yellow/15 text-ctp-yellow" : "border-ctp-surface1 text-ctp-subtext1"}`}>{showMissingOnly ? "Show full deck" : "Show missing only"}</button>
          {!collectionPanel && <a href={missingMassEntryUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Shop on TCGplayer ↗</a>}
          {!collectionPanel && <Link to="/collection" className="inline-flex min-h-12 items-center justify-center rounded-lg px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Open collection</Link>}
        </div>
      </div> : !collectionPanel && <div className="mb-4 rounded-xl border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green">Collection complete for this deck.</div>)}
      {ownershipByName && showMissingOnly && missingCopies > 0 && <p className="mb-3 text-xs text-ctp-subtext1">Showing only cards your collection does not fully cover. Section totals reflect this filtered view.</p>}
      {showPrices && priceState.loading && <p role="status" className="mb-3 text-sm text-ctp-subtext1">Loading prices…</p>}
      {showPrices && priceState.error && <div role="status" className="mb-3 text-sm text-ctp-red">{priceState.error} <Button onClick={priceState.retry}>Retry prices</Button></div>}
      {displayPrefs.grouping === "set" && <p className="mb-3 text-xs text-ctp-subtext1">Unspecified printings use the earliest set.</p>}
      {displayMode === "visual" && (() => {
        const sections = arrangedSections;
        const fields: VisualFieldVisibility = {
          cost: displayPrefs.visualCost,
          price: showPrices,
          priceTrend: displayPrefs.showPrices && displayPrefs.visualPriceTrend,
          tags: displayPrefs.visualTags,
          simulator: displayPrefs.visualSimulator,
          community: displayPrefs.visualCommunity,
        };
        return displayPrefs.visualCommunity ? (
          <VisualCommunityGate format={format}>
            {(communityInclusionByName) => (
              <VisualDeckSections sections={sections} cardsByName={displayCardsByName} cardSize={displayPrefs.visualCardSize} priceByName={priceByName} priceTrendByName={priceTrendByName} simulatorEvidenceByName={simulatorEvidenceByName} communityInclusionByName={communityInclusionByName} fields={fields} ownershipByName={ownershipByName} />
            )}
          </VisualCommunityGate>
        ) : (
          <VisualDeckSections sections={sections} cardsByName={displayCardsByName} cardSize={displayPrefs.visualCardSize} priceByName={priceByName} priceTrendByName={priceTrendByName} simulatorEvidenceByName={simulatorEvidenceByName} communityInclusionByName={undefined} fields={fields} ownershipByName={ownershipByName} />
        );
      })()}
      {displayMode === "detailed" && <div className="grid gap-4 sm:grid-cols-2">
        {arrangedSections.map(section => <DetailedDeckSection key={section.title} {...section} cardsByName={displayCardsByName} priceByName={showPrices ? priceByName : new Map()} showThumbnails={showThumbnails} ownershipByName={ownershipByName} />)}
      </div>}

      {showDeckStats && displayPrefs.winRate && deckId && (
        <div className="mb-4 space-y-3">
          <DecklistWinRate deckId={deckId} />
        </div>
      )}
      {showAnalysis && displayPrefs.tuningEvidence && (
        <DeckTuningEvidence decklist={decklist} cardsByName={displayCardsByName} deckId={deckId} format={format} championFallback={championFallback} />
      )}
    </div></DeckSectionExpansion>
  );
}
