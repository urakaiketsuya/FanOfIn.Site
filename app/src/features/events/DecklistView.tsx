import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import ElementIcon from "../../components/ElementIcon";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { formatUsd } from "../../lib/format";
import { computeSectionPrice } from "../../lib/deckPrice";
import { computeDeckIdentity } from "../../lib/deckIdentity";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, findDeckChampionName, slugifyFilename } from "../../lib/ttsExport";

/** Plain-text export with "# Section" headers and "4 Card Name" lines — round-trips with the Compare tool's paste parser. */
function buildDecklistText(decklist: OmnidexDecklist): string {
  const sections: [string, OmnidexDecklistCardLine[]][] = [
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

export default function DecklistView({
  decklist,
  cardsByName,
  showThumbnails = false,
}: {
  decklist: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  showThumbnails?: boolean;
}) {
  const priceByName = useDeckPriceByName();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildDecklistText(decklist));
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

  const allLines = useMemo(() => [...decklist.main, ...decklist.material, ...decklist.sideboard], [decklist]);
  const massEntryUrl = useMemo(
    () => buildTcgplayerMassEntryUrl(allLines.map((l) => ({ name: l.card, quantity: l.quantity }))),
    [allLines],
  );

  function handleExportTts() {
    const championName = findDeckChampionName(decklist.material, cardsByName);
    const save = buildTtsSaveFile(
      [
        { label: "Main", lines: decklist.main },
        { label: "Material", lines: decklist.material },
        { label: "Sideboard", lines: decklist.sideboard },
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
      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>
    </div>
  );
}
