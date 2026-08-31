import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CardImpactRole, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { useCardImpactData } from "../archetypes/data";
import { useCardsByNames } from "./useCardsByNames";
import { formatUsd } from "../../lib/format";
import { computeSectionPrice } from "../../lib/deckPrice";
import { computeDeckIdentity } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, findDeckChampionName, slugifyFilename } from "../../lib/ttsExport";
import { buildClarentPlaytestUrl } from "../../lib/clarentPlaytest";
import { copyDecklistAndOpen, deckBuilderDestinations } from "../../lib/deckBuilderDestinations";

/** Only surface a suggestion once shrinkage has left it meaningfully above zero — filters out noise that technically cleared the sample-size bar but is still statistically thin. */
const MIN_SUGGESTED_LIFT = 0.02;
const MAX_SUGGESTIONS = 5;
type DeckDisplayMode = "compact" | "visual" | "detailed";

const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };

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

function DeckSection({
  title,
  lines,
  cardsByName,
  priceByName,
  showThumbnails,
}: {
  title: string;
  lines: OmnidexDecklistCardLine[];
  cardsByName: Map<string, Card>;
  priceByName: Map<string, number>;
  showThumbnails: boolean;
}) {
  if (lines.length === 0) return null;
  const total = lines.reduce((n, l) => n + l.quantity, 0);
  const price = computeSectionPrice(lines, priceByName);

  return (
    <div>
      <h4 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">
        {title} ({total}){price.total > 0 && <span className="ml-1 normal-case text-ctp-subtext1">· {formatUsd(price.total)}</span>}
      </h4>
      <ul className="mt-1 space-y-0.5">
        {lines.map((line, i) => {
          const card = cardsByName.get(line.card);
          const isChampion = card?.types.includes("CHAMPION");
          const unitPrice = priceByName.get(line.card);
          return (
            <li key={i} className="flex items-center gap-1.5 text-sm">
              <span className="w-6 shrink-0 text-right text-ctp-subtext0">{line.quantity}x</span>
              {showThumbnails &&
                (card?.editions[0] ? (
                  <CardImage
                    image={card.editions[0].image}
                    alt={line.card}
                    className="h-8 w-6 shrink-0 rounded object-cover object-top"
                  />
                ) : (
                  <div className="h-8 w-6 shrink-0 rounded bg-ctp-surface0" />
                ))}
              {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
              {card ? (
                <CardHoverPreview image={card.editions[0]?.image} alt={line.card}>
                  <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                    {line.card}
                  </Link>
                </CardHoverPreview>
              ) : (
                <span className="text-ctp-text">{line.card}</span>
              )}
              {isChampion && (
                <span className="shrink-0 rounded-full border border-ctp-blue px-1.5 text-[10px] text-ctp-blue">
                  Champion
                </span>
              )}
              {unitPrice !== undefined && (
                <span className="ml-auto shrink-0 text-xs text-ctp-subtext0">{formatUsd(unitPrice * line.quantity)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CompactDeckSection({ title, lines, cardsByName }: { title: string; lines: OmnidexDecklistCardLine[]; cardsByName: Map<string, Card> }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const columns = title === "Main" ? "sm:grid-cols-2 lg:grid-cols-4" : title === "Material" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <section><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{title} ({total})</h4><ul className={`mt-2 grid gap-x-4 gap-y-1.5 ${columns}`}>{lines.map((line) => { const card = cardsByName.get(line.card); return <li key={line.card} className="flex min-w-0 items-center gap-1.5 text-sm">{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-7 w-5 shrink-0 rounded-sm object-cover object-top" /> : <div className="h-7 w-5 shrink-0 rounded-sm bg-ctp-surface0" />}{line.quantity > 1 && <span className="shrink-0 text-ctp-subtext0">{line.quantity}x</span>}<span className="min-w-0 truncate">{card ? <CardHoverPreview image={card.editions[0]?.image} alt={line.card}><Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">{line.card}</Link></CardHoverPreview> : <span className="text-ctp-text">{line.card}</span>}</span></li>; })}</ul></section>;
}

function VisualDeckSection({ title, lines, cardsByName }: { title: string; lines: OmnidexDecklistCardLine[]; cardsByName: Map<string, Card> }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <section><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{title} ({total})</h4><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">{lines.map((line) => { const card = cardsByName.get(line.card); const content = <>{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.card} className="h-full w-full object-cover" /> : <span className="flex h-full items-center p-1 text-center text-[9px] text-ctp-subtext0">{line.card}</span>}{line.quantity > 1 && <span className="absolute right-1 top-1 rounded bg-ctp-base/90 px-1 text-[10px] text-ctp-text">{line.quantity}x</span>}</>; return <CardHoverPreview key={line.card} image={card?.editions[0]?.image} alt={line.card}>{card ? <Link to={`/cards/${card.slug}`} title={line.card} className="relative block aspect-[5/7] overflow-hidden rounded bg-ctp-surface0">{content}</Link> : <div title={line.card} className="relative block aspect-[5/7] overflow-hidden rounded bg-ctp-surface0">{content}</div>}</CardHoverPreview>; })}</div></section>;
}

export default function DecklistView({
  decklist,
  cardsByName,
  showThumbnails = false,
  deckId,
  extraSections = [],
  trailingSections = [],
  defaultDisplayMode = "detailed",
}: {
  decklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  showThumbnails?: boolean;
  /** `${eventId}:${player}` — when present, resolves this decklist's named-build cluster and surfaces "Cards that might help" below the three sections. Omit to skip the lookup entirely (e.g. a pasted/custom decklist with no real deckId). */
  deckId?: string;
  extraSections?: { title: string; lines: OmnidexDecklistCardLine[] }[];
  trailingSections?: { title: string; lines: OmnidexDecklistCardLine[] }[];
  defaultDisplayMode?: DeckDisplayMode;
}) {
  const priceByName = useDeckPriceByName();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [displayMode, setDisplayMode] = useState<DeckDisplayMode>(defaultDisplayMode);

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

  const allLines = useMemo(() => [...extraSections.flatMap((section) => section.lines), ...decklist.main, ...decklist.material, ...decklist.sideboard, ...trailingSections.flatMap((section) => section.lines)], [decklist, extraSections, trailingSections]);
  const massEntryUrl = useMemo(
    () => buildTcgplayerMassEntryUrl(allLines.map((l) => ({ name: l.card, quantity: l.quantity }))),
    [allLines],
  );
  const clarentUrl = useMemo(() => buildClarentPlaytestUrl(decklist, undefined, [...extraSections, ...trailingSections]), [decklist, extraSections, trailingSections]);

  const cardImpactData = useCardImpactData();
  const suggestions = useMemo(() => {
    if (!deckId || !cardImpactData) return [];
    const clusterId = cardImpactData.deckClusterIndex[deckId];
    if (!clusterId) return [];
    const cluster = cardImpactData.clusters.find((c) => c.clusterId === clusterId);
    if (!cluster) return [];
    const currentNames = new Set(allLines.map((l) => l.card));
    return cluster.cards.filter((c) => c.adjustedLift >= MIN_SUGGESTED_LIFT && !currentNames.has(c.cardName)).slice(0, MAX_SUGGESTIONS);
  }, [deckId, cardImpactData, allLines]);
  const suggestionCards = useCardsByNames(suggestions.map((s) => s.cardName));

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
    <div>
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
            <div className="ml-auto flex shrink-0 gap-2">
              <a
                href={clarentUrl}
                target="_blank"
                rel="noreferrer"
                title="Opens this deck in Clarent's solo Goldfish playtest mode"
                className="rounded-md border border-ctp-green px-2 py-1 text-xs text-ctp-green hover:bg-ctp-surface0"
              >
                Playtest in Clarent &rarr;
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className={`rounded-md border px-2 py-1 text-xs ${
                  copyState === "failed"
                    ? "border-ctp-red text-ctp-red"
                    : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}
              </button>
              {deckBuilderDestinations.map((destination) => (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() => void handleCopyAndOpen(destination.url)}
                  title={`Copies this decklist, then opens ${destination.label} so you can paste it into a new deck`}
                  className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
                >
                  Copy & open {destination.label} &rarr;
                </button>
              ))}
              <a
                href={massEntryUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-ctp-blue px-2 py-1 text-xs text-ctp-blue hover:bg-ctp-surface0"
              >
                Buy on TCGplayer &rarr;
              </a>
              <button
                type="button"
                onClick={handleExportTts}
                title="Downloads a .json file — in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it"
                className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:text-ctp-text"
              >
                Export to TTS
              </button>
            </div>
          )}
        </div>
      )}
      <div className="mb-4 flex justify-end gap-1" role="group" aria-label="Decklist display">{(["compact", "visual", "detailed"] as const).map((mode) => <button key={mode} type="button" onClick={() => setDisplayMode(mode)} aria-pressed={displayMode === mode} className={`rounded-md border px-2 py-1 text-xs capitalize ${displayMode === mode ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"}`}>{mode}</button>)}</div>
      {displayMode === "compact" && <div className="space-y-5">{[...extraSections, { title: "Main", lines: decklist.main }, { title: "Material", lines: decklist.material }, { title: "Sideboard", lines: decklist.sideboard }, ...trailingSections].map((section) => <CompactDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={cardsByName} />)}</div>}
      {displayMode === "visual" && <div className="space-y-6">{[...extraSections, { title: "Main", lines: decklist.main }, { title: "Material", lines: decklist.material }, { title: "Sideboard", lines: decklist.sideboard }, ...trailingSections].map((section) => <VisualDeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={cardsByName} />)}</div>}
      {displayMode === "detailed" && <div className="grid gap-4 sm:grid-cols-2">
        {extraSections.map((section) => <DeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={cardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />)}
        <DeckSection title="Main" lines={decklist.main} cardsByName={cardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />
        <DeckSection
          title="Material"
          lines={decklist.material}
          cardsByName={cardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
        />
        <DeckSection
          title="Sideboard"
          lines={decklist.sideboard}
          cardsByName={cardsByName}
          priceByName={priceByName}
          showThumbnails={showThumbnails}
        />
        {trailingSections.map((section) => <DeckSection key={section.title} title={section.title} lines={section.lines} cardsByName={cardsByName} priceByName={priceByName} showThumbnails={showThumbnails} />)}
      </div>}

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-md border border-ctp-surface1 bg-ctp-mantle p-3">
          <h4 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Cards that might help</h4>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Decks in this build that ran these cards tended to win more — correlational, not a guarantee.
          </p>
          <ul className="mt-2 space-y-1">
            {suggestions.map((s) => {
              const card = suggestionCards.get(s.cardName);
              return (
                <li key={s.cardName} className="flex flex-wrap items-center gap-1.5 text-sm">
                  {card ? (
                    <CardHoverPreview image={card.editions[0]?.image} alt={s.cardName}>
                      <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                        {s.cardName}
                      </Link>
                    </CardHoverPreview>
                  ) : (
                    <span className="text-ctp-text">{s.cardName}</span>
                  )}
                  <span className="rounded-full border border-ctp-surface1 px-1.5 text-[10px] text-ctp-subtext0">
                    {ROLE_LABEL[s.role]}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-ctp-green">
                    +{(s.adjustedLift * 100).toFixed(0)}pp
                  </span>
                  <span className="shrink-0 text-xs text-ctp-subtext0">
                    ({s.deckCountWith} with vs {s.deckCountWithout} without)
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
