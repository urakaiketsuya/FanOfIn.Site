import { Link } from "react-router-dom";
import { buildDeckBuilderPath, deckBuilderParamsFromDecklist } from "../../lib/deckBuilderLink";
import DeckExportActions from "../../components/deck-export/DeckExportActions";
import { useToast } from "../../components/ui/toast/ToastContext";
import { useMemo, useState, type ReactNode } from "react";
import type { Card, OmnidexDecklist, OmnidexDecklistCardLine } from "@gatcg/shared";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import { buildTtsSaveFile, downloadJsonFile, findDeckChampionName, slugifyFilename } from "../../lib/ttsExport";
import { buildClarentPlaytestUrl } from "../../lib/clarentPlaytest";
import { copyDecklistAndOpen, deckBuilderDestinations } from "../../lib/deckBuilderDestinations";
import Button from "../../components/ui/Button";
import { buildDecklistText } from "../../lib/decklistText";

export default function DecklistActions({ decklist, cardsByName, deckTitle, deckOwner, extraSections = [], trailingSections = [], toolbarActions, showBuilderAction = false }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; deckTitle?: string; deckOwner?: string; extraSections?: { title: string; lines: OmnidexDecklistCardLine[] }[]; trailingSections?: { title: string; lines: OmnidexDecklistCardLine[] }[]; toolbarActions?: ReactNode; showBuilderAction?: boolean }) {
  const builder = useMemo(() => showBuilderAction ? deckBuilderParamsFromDecklist(decklist, cardsByName) : null, [showBuilderAction, decklist, cardsByName]);
  const { notify } = useToast();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  async function handleCopy(includePrintings = false) {
    try {
      await navigator.clipboard.writeText(buildDecklistText(decklist, [...extraSections, ...trailingSections], includePrintings));
      setCopyState("copied"); notify({ message: "Decklist copied.", key: "copy" });
    } catch {
      setCopyState("failed"); notify({ tone: "error", message: "Could not copy the decklist.", key: "copy", action: { label: "Retry copy", onClick: () => handleCopy(includePrintings) } });
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

  async function handleCopyAndOpen(url: string) {
    try {
      await copyDecklistAndOpen(buildDecklistText(decklist, [...extraSections, ...trailingSections]), url);
      setCopyState("copied"); notify({ message: "Decklist copied.", key: "copy" });
    } catch {
      setCopyState("failed"); notify({ tone: "error", message: "Could not copy the decklist.", key: "copy", action: { label: "Retry copy", onClick: () => handleCopy() } });
    }
    setTimeout(() => setCopyState("idle"), 1500);
  }

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
    notify({ message: "Decklist download started." });
  }

  return <>
          <Button variant="secondary" size="sm" onClick={() => void handleCopy()} className={`min-h-control ${copyState === "failed" ? "border-ctp-red text-ctp-red" : ""}`}>{copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy decklist"}</Button>
          <DeckExportActions ownerName={deckOwner} title={deckTitle ?? `${findDeckChampionName(decklist.material, cardsByName) ?? "Untitled"} deck`} cardsByName={cardsByName} sections={[...extraSections, { title: "Material Deck", lines: decklist.material }, { title: "Main Deck", lines: decklist.main }, { title: "Sideboard", lines: decklist.sideboard }, ...trailingSections]} />
              {builder && <Link className="flex min-h-control items-center rounded px-3 text-sm text-ctp-blue" to={buildDeckBuilderPath(builder.championName, builder.spiritFilter, builder.lockedCards, builder.lockedSections, { printings: builder.printings })}>Tune in Deck Builder</Link>}
              {toolbarActions}
              {[...decklist.main, ...decklist.material, ...decklist.sideboard].some(line => line.printings?.length) && <><Button onClick={() => void handleCopy(true)}>Copy with printings (Fan of Insight)</Button><p className="px-3 text-xs text-ctp-subtext1">Standard copy and external exports omit printing choices. Copy with printings preserves them when pasted here.</p></>}
              <a href={clarentUrl} target="_blank" rel="noreferrer" className="flex min-h-control items-center rounded px-3 py-2 text-sm text-ctp-green hover:bg-ctp-surface0">Playtest in Clarent →</a>
                  {deckBuilderDestinations.map((destination) => <button key={destination.id} type="button" onClick={() => void handleCopyAndOpen(destination.url)} title={`Copies this decklist, then opens ${destination.label} so you can paste it into a new deck`} className="flex min-h-control items-center rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Copy & open {destination.label} &rarr;</button>)}
                  <a href={massEntryUrl} target="_blank" rel="noreferrer" className="flex min-h-control items-center rounded px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0">Buy on TCGplayer &rarr;</a>
                  <button type="button" onClick={handleExportTts} title="Downloads a .json file – in Tabletop Simulator, use Games ▸ Save & Load ▸ Load to open it" className="flex min-h-control items-center rounded px-3 py-2 text-left text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Export to TTS</button>

  </>;
}
