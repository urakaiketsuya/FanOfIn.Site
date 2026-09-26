import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckCollectionLine, DeckFormat, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { VisualCommunityGate, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { usePriceTrendByName } from "../pricing/usePriceTrendByName";
import { useSimulatorEvidenceByName } from "../simulator/useSimulatorEvidenceByName";
import DeckTuningEvidence from "./DeckTuningEvidence";
import { formatUsd } from "../../lib/format";
import { computeSectionPrice } from "../../lib/deckPrice";
import { computeDeckIdentity } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, findDeckChampionName, slugifyFilename } from "../../lib/ttsExport";
import { buildClarentPlaytestUrl } from "../../lib/clarentPlaytest";
import { copyDecklistAndOpen, deckBuilderDestinations } from "../../lib/deckBuilderDestinations";
import { useCardCatalog } from "../cards/useCardCatalog";
import { extractProducedTokens } from "../../lib/cardIntent";
import { useDecklistDisplayPrefs, type DeckDisplayMode } from "../../lib/decklistDisplayPrefs";
import DecklistWinRate from "./DecklistWinRate";
import Button from "../../components/ui/Button";
import { CompactDeckSection as CompactSection, DetailedDeckSection, VisualDeckSections } from "./DecklistSections";

/** Plain-text export with "# Section" headers and "4 Card Name" lines — round-trips with the Compare tool's paste parser. */
export function buildDecklistText(decklist: OmnidexDecklist, extraSections: { title: string; lines: OmnidexDecklistCardLine[] }[] = []): string {
  const sections: [string, OmnidexDecklistCardLine[]][] = [
    ...extraSections.map((section) => [section.title, section.lines] as [string, OmnidexDecklistCardLine[]]),
    ["Main", decklist.main],
    ["Material", decklist.material],
    ["Sideboard", decklist.sideboard],
  ];
  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `# ${title}\n${lines.map((l) => `${l.quantity} ${l.card}`).join("\n")}`)
    .join("\n\n");
}


export default function DecklistView({
  decklist,
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
  collectionControl,
  collectionPanel,
}: {
  decklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  showThumbnails?: boolean;
  /** `${eventId}:${player}` — when present, resolves this decklist's named-build cluster for `DeckTuningEvidence`'s "Cards that might help" box, and (with the "Win rate" display preference on) this specific sighting's own match record. Omit for a pasted/custom decklist with no real deckId — `DeckTuningEvidence` still falls back to Champion-scoped evidence unless `championFallback` is false, and the win-rate section simply doesn't render. */
  deckId?: string;
  /** Suppresses `DeckTuningEvidence` entirely when "PANTHEON" — the tournament pipeline that evidence is built from doesn't track that format. Omit for tournament decklists, which are always Standard. */
  format?: DeckFormat;
  /** Set false on a page that already renders its own Champion-scoped "cards that might help" fallback (currently only `DeckDetail.tsx`) to avoid a redundant second copy. The "cards worth reviewing" box is unaffected — nothing else surfaces that signal today. */
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
  collectionControl?: ReactNode;
  collectionPanel?: ReactNode;
}) {
  const displayPrefs = useDecklistDisplayPrefs();
  const priceByName = useDeckPriceByName(displayPrefs.showPrices);
  const priceTrendByName = usePriceTrendByName(displayPrefs.showPrices && displayPrefs.visualPriceTrend);
  const catalog = useCardCatalog();
  // Visual mode's optional "sim games" field only — cardId isn't Champion-scoped like the Guided
  // Deck Builder's own evidence map, so this works for any decklist, not just a suggested build.
  const simulatorEvidenceByName = useSimulatorEvidenceByName();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const displayMode = displayPrefs.displayMode ?? (defaultDisplayMode === "detailed" && typeof window !== "undefined" && window.matchMedia?.("(max-width: 639px)").matches ? "compact" : defaultDisplayMode);
  const setDisplayMode = displayPrefs.setDisplayMode;
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildDecklistText(decklist, [...extraSections, ...trailingSections]));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handleCopyAndOpen(url: string) {
    try {
      await copyDecklistAndOpen(buildDecklistText(decklist, [...extraSections, ...trailingSections]), url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  const deckPrice = computeSectionPrice([...decklist.main, ...decklist.material], priceByName);
  const sideboardPrice = computeSectionPrice(decklist.sideboard, priceByName);
  const missingCount = deckPrice.missing + sideboardPrice.missing;

  const identity = useMemo(
    () =>
      computeDeckIdentity(
        [...decklist.main, ...decklist.material].map((l) => ({ name: l.card, quantity: l.quantity })),
        cardsByName,
      ),
    [decklist, cardsByName],
  );
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

  const allLines = useMemo(() => [...extraSections.flatMap((section) => section.lines), ...decklist.main, ...decklist.material, ...decklist.sideboard, ...trailingSections.flatMap((section) => section.lines)], [decklist, extraSections, trailingSections]);
  const massEntryUrl = useMemo(
    () => buildTcgplayerMassEntryUrl(allLines.map((l) => ({ name: l.card, quantity: l.quantity }))),
    [allLines],
  );
  const clarentUrl = useMemo(() => buildClarentPlaytestUrl(decklist, undefined, [...extraSections, ...trailingSections]), [decklist, extraSections, trailingSections]);
  const missingOwnershipLines = useMemo(() => ownershipByName ? [...ownershipByName.values()].filter((line) => line.missing > 0) : [], [ownershipByName]);
  const missingCopies = missingOwnershipLines.reduce((sum, line) => sum + line.missing, 0);
  const missingCardNames = useMemo(() => new Set(missingOwnershipLines.map((line) => line.card)), [missingOwnershipLines]);
  const missingMassEntryUrl = useMemo(() => buildTcgplayerMassEntryUrl(missingOwnershipLines.map((line) => ({ name: line.card, quantity: line.missing }))), [missingOwnershipLines]);
  const visibleSections = useMemo(() => {
    const filter = (lines: OmnidexDecklistCardLine[]) => showMissingOnly && ownershipByName ? lines.filter((line) => missingCardNames.has(line.card)) : lines;
    return {
      extra: extraSections.map((section) => ({ ...section, lines: filter(section.lines) })),
      main: filter(decklist.main),
      material: filter(decklist.material),
      sideboard: filter(decklist.sideboard),
      trailing: displayTrailingSections.map((section) => ({ ...section, lines: filter(section.lines) })),
    };
  }, [decklist, displayTrailingSections, extraSections, missingCardNames, showMissingOnly, ownershipByName]);

  function handleExportTts() {
    const championName = findDeckChampionName(decklist.material, cardsByName);
    const save = buildTtsSaveFile(
      [
        ...extraSections.map((section) => ({ label: section.title, lines: section.lines })),
        { label: "Main", lines: decklist.main },
        { label: "Material", lines: decklist.material },
        { label: "Sideboard", lines: decklist.sideboard },
        ...trailingSections.map((section) => ({ label: section.title, lines: section.lines })),
      ],
      cardsByName,
    );
    downloadJsonFile(`${slugifyFilename(championName ?? "decklist")}-tts.json`, save);
  }

  return (
    <div data-component="DecklistView">
      <div className="relative mb-3 flex flex-wrap items-center gap-1 border-b border-ctp-surface0 pb-2">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-3 text-xs text-ctp-subtext1 hover:bg-ctp-surface0">Display <span aria-hidden="true" className="ml-1">▾</span></summary>
          <div className="absolute left-0 top-full z-30 mt-1 max-h-[60dvh] w-72 max-w-full space-y-3 overflow-y-auto rounded-xl border border-ctp-surface1 bg-ctp-base p-3 shadow-xl">
            <div className="flex gap-1" role="group" aria-label="Decklist display">{(["compact", "visual", "detailed"] as const).map((mode) => <button key={mode} type="button" onClick={() => setDisplayMode(mode)} aria-pressed={displayMode === mode} className={`min-h-11 flex-1 rounded-md px-2 text-xs capitalize ${displayMode === mode ? "bg-ctp-blue/15 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>{mode}</button>)}</div>
            {displayMode === "visual" && <>
              <label className="flex items-center justify-between text-xs text-ctp-subtext1">Card size<select aria-label="Card size" value={displayPrefs.visualCardSize} onChange={(event) => displayPrefs.setVisualCardSize(event.target.value as "large" | "medium" | "compact")} className="min-h-11 rounded border border-ctp-surface1 bg-ctp-base px-2"><option value="large">Large</option><option value="medium">Medium</option><option value="compact">Compact</option></select></label>
              {[
                { label: "Cost", checked: displayPrefs.visualCost, change: displayPrefs.setVisualCost },
                { label: "Price trend", checked: displayPrefs.visualPriceTrend, change: displayPrefs.setVisualPriceTrend },
                { label: "Tags", checked: displayPrefs.visualTags, change: displayPrefs.setVisualTags },
                { label: "Simulator games", checked: displayPrefs.visualSimulator, change: displayPrefs.setVisualSimulator },
                { label: "Community usage", checked: displayPrefs.visualCommunity, change: displayPrefs.setVisualCommunity },
              ].map((field) => <label key={field.label} className="flex min-h-9 items-center gap-2 text-xs text-ctp-subtext1"><input type="checkbox" checked={field.checked} onChange={(event) => field.change(event.target.checked)} />{field.label}</label>)}
            </>}
            {(identity.classes.length > 0 || identity.elements.length > 0) && <p className="text-xs text-ctp-subtext0">{identity.classes.join("/")} · {identity.elements.join("/")}</p>}
            <Link to="/settings" className="inline-flex min-h-11 items-center text-xs text-ctp-blue">More display settings →</Link>
          </div>
        </details>
        <button type="button" aria-pressed={displayPrefs.showPrices} onClick={() => displayPrefs.setShowPrices(!displayPrefs.showPrices)} className={`min-h-11 rounded-md px-3 text-xs ${displayPrefs.showPrices ? "bg-ctp-blue/10 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Price</button>
        {collectionControl}
        {allLines.length > 0 && <>
          <Button variant="secondary" size="sm" onClick={handleCopy} className={`ml-auto min-h-11 ${copyState === "failed" ? "border-ctp-red text-ctp-red" : ""}`}>{copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy"}</Button>
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-3 text-xs text-ctp-subtext1 hover:bg-ctp-surface0">More</summary>
            <div className="absolute right-0 top-full z-30 mt-1 grid max-h-[60dvh] w-64 max-w-full gap-1 overflow-y-auto rounded-lg border border-ctp-surface1 bg-ctp-base p-2 shadow-xl">
              {toolbarActions}
              <a href={clarentUrl} target="_blank" rel="noreferrer" className="rounded px-3 py-2 text-sm text-ctp-green hover:bg-ctp-surface0">Playtest in Clarent →</a>
                  {deckBuilderDestinations.map((destination) => <button key={destination.id} type="button" onClick={() => void handleCopyAndOpen(destination.url)} title={`Copies this decklist, then opens ${destination.label} so you can paste it into a new deck`} className="rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Copy & open {destination.label} &rarr;</button>)}
                  <a href={massEntryUrl} target="_blank" rel="noreferrer" className="rounded px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">Buy on TCGplayer &rarr;</a>
                  <button type="button" onClick={handleExportTts} title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it" className="rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Export to TTS</button>

            </div>
          </details>
        </>}
      </div>
      {displayPrefs.showPrices && <div className="mb-3 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text">Estimated price: {formatUsd(deckPrice.total + sideboardPrice.total)}</span><span className="ml-2 text-xs">Main + Material {formatUsd(deckPrice.total)} · Sideboard {formatUsd(sideboardPrice.total)}</span>{missingCount > 0 && <span className="ml-2 text-xs">{missingCount} card{missingCount === 1 ? "" : "s"} without prices</span>}</div>}
      {collectionPanel && <div className="mb-3">{collectionPanel}</div>}
      {ownershipByName && (missingCopies > 0 ? <div className="mb-4 rounded-xl border border-ctp-yellow/40 bg-ctp-yellow/10 p-3 text-sm"><p className="text-ctp-text"><strong className="text-ctp-yellow">{missingCopies} missing cop{missingCopies === 1 ? "y" : "ies"}</strong> across {missingOwnershipLines.length} card{missingOwnershipLines.length === 1 ? "" : "s"}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><button type="button" aria-pressed={showMissingOnly} onClick={() => setShowMissingOnly((value) => !value)} className={`min-h-10 rounded-lg border px-3 text-xs font-medium ${showMissingOnly ? "border-ctp-yellow bg-ctp-yellow/15 text-ctp-yellow" : "border-ctp-surface1 text-ctp-subtext1"}`}>{showMissingOnly ? "Show full deck" : "Show missing only"}</button><a href={missingMassEntryUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ctp-blue px-3 text-xs font-medium text-ctp-blue">Shop missing ↗</a><Link to="/collection" className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-medium text-ctp-blue sm:min-h-0">Open collection</Link></div></div> : <div className="mb-4 rounded-xl border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green">Collection complete for this deck.</div>)}
      {ownershipByName && showMissingOnly && missingCopies > 0 && <p className="mb-3 text-xs text-ctp-subtext1">Showing only cards your collection does not fully cover. Section totals reflect this filtered view.</p>}
      {displayMode === "compact" && <div className="space-y-5">{[...visibleSections.extra, { title: "Main", lines: visibleSections.main }, { title: "Material", lines: visibleSections.material }, { title: "Sideboard", lines: visibleSections.sideboard }, ...visibleSections.trailing].map((section) => <CompactSection priceByName={displayPrefs.showPrices ? priceByName : undefined} key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} ownershipByName={ownershipByName} />)}</div>}
      {displayMode === "visual" && (() => {
        const sections = [...visibleSections.extra, { title: "Main", lines: visibleSections.main }, { title: "Material", lines: visibleSections.material }, { title: "Sideboard", lines: visibleSections.sideboard }, ...visibleSections.trailing];
        const fields: VisualFieldVisibility = {
          cost: displayPrefs.visualCost,
          price: displayPrefs.showPrices,
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
        {visibleSections.extra.map((section) => <DetailedDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} ownershipByName={ownershipByName} />)}
        <DetailedDeckSection title="Main" lines={visibleSections.main} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} ownershipByName={ownershipByName} />
        <DetailedDeckSection
          title="Material"
          lines={visibleSections.material}
          cardsByName={displayCardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
          ownershipByName={ownershipByName}
        />
        <DetailedDeckSection
          title="Sideboard"
          lines={visibleSections.sideboard}
          cardsByName={displayCardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
          ownershipByName={ownershipByName}
        />
        {visibleSections.trailing.map((section) => <DetailedDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} ownershipByName={ownershipByName} />)}
      </div>}

      {showDeckStats && displayPrefs.winRate && deckId && (
        <div className="mb-4 space-y-3">
          <DecklistWinRate deckId={deckId} />
        </div>
      )}
      {showAnalysis && displayPrefs.tuningEvidence && (
        <DeckTuningEvidence decklist={decklist} cardsByName={displayCardsByName} deckId={deckId} format={format} championFallback={championFallback} />
      )}
    </div>
  );
}
