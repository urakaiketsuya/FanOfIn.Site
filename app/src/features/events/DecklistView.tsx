import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckFormat, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
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
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import DecklistWinRate from "./DecklistWinRate";
import Button from "../../components/ui/Button";
import { CompactDeckSection as CompactSection, DetailedDeckSection, VisualDeckSections } from "./DecklistSections";

type DeckDisplayMode = "compact" | "visual" | "detailed";

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
}) {
  const priceByName = useDeckPriceByName();
  const priceTrendByName = usePriceTrendByName();
  const catalog = useCardCatalog();
  const displayPrefs = useDecklistDisplayPrefs();
  // Visual mode's optional "sim games" field only — cardId isn't Champion-scoped like the Guided
  // Deck Builder's own evidence map, so this works for any decklist, not just a suggested build.
  const simulatorEvidenceByName = useSimulatorEvidenceByName();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [displayMode, setDisplayMode] = useState<DeckDisplayMode>(() => defaultDisplayMode === "detailed" && typeof window !== "undefined" && window.matchMedia?.("(max-width: 639px)").matches ? "compact" : defaultDisplayMode);

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
      {(identity.classes.length > 0 || identity.elements.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-ctp-subtext1">
          {identity.classes.length > 0 && <span>Classes: {identity.classes.join("/")}</span>}
          {identity.elements.length > 0 && <span>Elements: {identity.elements.join("/")}</span>}
        </div>
      )}
      {(deckPrice.total > 0 || allLines.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {deckPrice.total > 0 && (
            <>
              <span className="font-semibold text-ctp-text">Deck price: {formatUsd(deckPrice.total)}</span>
              {sideboardPrice.total > 0 && (
                <span className="text-ctp-subtext1">+ {formatUsd(sideboardPrice.total)} sideboard</span>
              )}
              {missingCount > 0 && (
                <span className="text-xs text-ctp-subtext0">
                  ({missingCount} card{missingCount === 1 ? "" : "s"} missing price data)
                </span>
              )}
            </>
          )}
          {allLines.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
              <a
                href={clarentUrl}
                target="_blank"
                rel="noreferrer"
                title="Opens this deck in Clarent's solo Goldfish playtest mode"
                className="rounded-md border border-ctp-green px-2 py-1 text-xs text-ctp-green hover:bg-ctp-surface0"
              >
                Playtest in Clarent &rarr;
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className={copyState === "failed" ? "border-ctp-red text-ctp-red" : ""}
              >
                {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}
              </Button>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text">More actions</summary>
                <div className="absolute right-0 z-30 mt-2 grid w-64 gap-1 rounded-lg border border-ctp-surface1 bg-ctp-base p-2 shadow-xl">
                  {deckBuilderDestinations.map((destination) => <button key={destination.id} type="button" onClick={() => void handleCopyAndOpen(destination.url)} title={`Copies this decklist, then opens ${destination.label} so you can paste it into a new deck`} className="rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Copy & open {destination.label} &rarr;</button>)}
                  <a href={massEntryUrl} target="_blank" rel="noreferrer" className="rounded px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">Buy on TCGplayer &rarr;</a>
                  <button type="button" onClick={handleExportTts} title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it" className="rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Export to TTS</button>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Link to="/settings" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs text-ctp-subtext1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text">Display</Link>
        <div className="flex gap-1 rounded-lg bg-ctp-mantle p-1" role="group" aria-label="Decklist display">{(["compact", "visual", "detailed"] as const).map((mode) => <button key={mode} type="button" onClick={() => setDisplayMode(mode)} aria-pressed={displayMode === mode} className={`min-h-8 rounded-md px-2 text-xs capitalize transition-all duration-200 active:scale-[0.97] ${displayMode === mode ? "bg-ctp-blue/15 font-semibold text-ctp-blue shadow-sm" : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}>{displayMode === mode && <span aria-hidden="true">✓ </span>}{mode}</button>)}</div>
      </div>
      {showDeckStats && displayPrefs.winRate && deckId && (
        <div className="mb-4 space-y-3">
          <DecklistWinRate deckId={deckId} />
        </div>
      )}
      {displayMode === "compact" && <div className="space-y-5">{[...extraSections, { title: "Main", lines: decklist.main }, { title: "Material", lines: decklist.material }, { title: "Sideboard", lines: decklist.sideboard }, ...displayTrailingSections].map((section) => <CompactSection key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} />)}</div>}
      {displayMode === "visual" && (() => {
        const sections = [...extraSections, { title: "Main", lines: decklist.main }, { title: "Material", lines: decklist.material }, { title: "Sideboard", lines: decklist.sideboard }, ...displayTrailingSections];
        const fields: VisualFieldVisibility = {
          cost: displayPrefs.visualCost,
          price: displayPrefs.visualPrice,
          priceTrend: displayPrefs.visualPriceTrend,
          tags: displayPrefs.visualTags,
          simulator: displayPrefs.visualSimulator,
          community: displayPrefs.visualCommunity,
        };
        return displayPrefs.visualCommunity ? (
          <VisualCommunityGate format={format}>
            {(communityInclusionByName) => (
              <VisualDeckSections sections={sections} cardsByName={displayCardsByName} cardSize={displayPrefs.visualCardSize} priceByName={priceByName} priceTrendByName={priceTrendByName} simulatorEvidenceByName={simulatorEvidenceByName} communityInclusionByName={communityInclusionByName} fields={fields} />
            )}
          </VisualCommunityGate>
        ) : (
          <VisualDeckSections sections={sections} cardsByName={displayCardsByName} cardSize={displayPrefs.visualCardSize} priceByName={priceByName} priceTrendByName={priceTrendByName} simulatorEvidenceByName={simulatorEvidenceByName} communityInclusionByName={undefined} fields={fields} />
        );
      })()}
      {displayMode === "detailed" && <div className="grid gap-4 sm:grid-cols-2">
        {extraSections.map((section) => <DetailedDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />)}
        <DetailedDeckSection title="Main" lines={decklist.main} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />
        <DetailedDeckSection
          title="Material"
          lines={decklist.material}
          cardsByName={displayCardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
        />
        <DetailedDeckSection
          title="Sideboard"
          lines={decklist.sideboard}
          cardsByName={displayCardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
        />
        {displayTrailingSections.map((section) => <DetailedDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={displayCardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />)}
      </div>}

      {displayPrefs.tuningEvidence && (
        <DeckTuningEvidence decklist={decklist} cardsByName={displayCardsByName} deckId={deckId} format={format} championFallback={championFallback} />
      )}
    </div>
  );
}
