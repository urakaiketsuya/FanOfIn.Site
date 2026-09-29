import { useId, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import CardArtTile from "./CardArtTile";
import DeckCardPreview from "./DeckCardPreview";
import DisclosureChevron from "./DisclosureChevron";
import Panel from "./ui/Panel";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { useChampionCardImages } from "../features/players/useChampionCardImages";
import { findDeckChampionName } from "../lib/ttsExport";

export const deckPreviewActionClass = "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue disabled:opacity-50";

export interface DeckPreviewModel {
  id: string;
  title: string;
  /** Null until a source's full list is loaded. Samples must never masquerade as full lists. */
  decklist: OmnidexDecklist | null;
  championName?: string | null;
  format?: DeckFormat;
  source: { kind: "official" | "event" | "community"; label: string };
  metadata?: ReactNode;
  actions?: ReactNode;
  materialPreview?: OmnidexDecklist["material"];
  mainCount?: number | null;
  sideboardCount?: number | null;
  preview?: { section?: "main"; label: string; lines: { name: string; quantity?: number }[] };
  status?: ReactNode;
}

type ListAction = { to: string; expanded?: never; onToggle?: never; content?: never } | {
  to?: never; expanded: boolean; onToggle: () => void; content: ReactNode;
};

/** Immutable preview only: adapters own fetching, mutations, navigation and expanded content. */
export default function DeckPreviewCard({ model, cardsByName, championCard, view }: {
  model: DeckPreviewModel;
  cardsByName?: Map<string, Card>;
  championCard?: Card;
  view: ListAction;
}) {
  const contentId = useId();
  const names = useMemo(() => cardsByName ? [] : [
    ...(model.championName ? [model.championName] : []),
    ...((model.decklist?.material ?? model.materialPreview)?.map(line => line.card) ?? []),
    ...(model.preview?.lines.map(line => line.name) ?? []),
  ], [cardsByName, model.championName, model.decklist, model.materialPreview, model.preview]);
  const resolvedCards = useCardsByNames(names);
  const cards = cardsByName ?? resolvedCards;
  const materialLines = model.decklist?.material ?? model.materialPreview;
  const matchingMaterialName = model.championName ? materialLines?.findLast(line => line.card === model.championName || line.card.startsWith(`${model.championName}, `))?.card : undefined;
  const championName = (materialLines && findDeckChampionName(materialLines, cards)) ?? matchingMaterialName ?? model.championName;
  const representativeCards = useChampionCardImages(championCard || !championName || cards.has(championName) ? [] : [championName]);
  const leadName = championName ?? materialLines?.[0]?.card ?? model.preview?.lines[0]?.name ?? "Champion not specified";
  const leadCard = cards.get(leadName) ?? championCard ?? representativeCards.get(leadName);
  const label = leadCard?.name ?? leadName;
  const art = <><CardArtTile card={leadCard} name={label} /><span className="mt-1 block break-words text-xs leading-snug text-ctp-subtext1">{label}</span></>;
  const material = materialLines?.filter(line => line.card !== label).slice(0, 3).map(line => ({ name: line.card, quantity: line.quantity }));
  const preview: DeckPreviewModel["preview"] = material?.length ? { label: "Featured material cards", lines: material } : model.preview;
  const count = (section: "main" | "sideboard") => {
    const supplied = section === "main" ? model.mainCount : model.sideboardCount;
    if (supplied !== undefined) return supplied;
    return model.decklist?.[section].reduce((sum, line) => sum + line.quantity, 0);
  };
  return <Panel as="article" padding="none" data-component="DeckPreviewCard" data-source={model.source.kind} data-deck-id={model.id} className="flex min-w-0 flex-col overflow-hidden">
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
        <div className="min-w-0">{leadCard ? <Link to={`/cards/${leadCard.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{art}</Link> : art}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1 text-xs text-ctp-subtext1"><span className="rounded bg-ctp-surface0 px-2 py-1">{model.format === "STANDARD" ? "Standard" : model.format === "PANTHEON" ? "Pantheon" : "Format unknown"}</span><span className="rounded bg-ctp-blue/10 px-2 py-1 text-ctp-blue">{model.source.label}</span></div>
          <h2 className="mt-2 break-words text-base font-semibold leading-snug text-ctp-text">{model.title}</h2>
          {model.metadata && <div className="mt-2 break-words text-xs leading-relaxed text-ctp-subtext1">{model.metadata}</div>}
        </div>
      </div>
      {preview && preview.lines.length > 0 && <section aria-label={preview.label}><p className="mb-2 text-xs text-ctp-subtext0">{preview.label}</p><DeckCardPreview compact groupByElement={preview.section === "main"} lines={preview.lines.slice(0, 3)} cardsByName={cards} /></section>}
      <p className="text-xs text-ctp-subtext1">{count("main") ?? "Unknown"} main · {count("sideboard") ?? "Unknown"} sideboard</p>
      {model.status}
    </div>
    <footer className="border-t border-ctp-surface1 p-3">
      <div className="flex flex-wrap items-center gap-2 [&>a]:min-h-12 [&>button]:min-h-12 [&>a]:min-w-12 [&>button]:min-w-12 [&>a]:max-w-full [&>button]:max-w-full">
        {view.to !== undefined ? <Link to={view.to} aria-label={`View list: ${model.title}`} className={`${deckPreviewActionClass} bg-ctp-blue text-ctp-base`}>View list</Link> : <button type="button" onClick={view.onToggle} aria-expanded={view.expanded} aria-controls={contentId} className={`${deckPreviewActionClass} bg-ctp-blue text-ctp-base`}><DisclosureChevron className={view.expanded ? "rotate-180" : ""} />{view.expanded ? "Hide list" : "View list"}</button>}
        {model.actions}
      </div>
    </footer>
    {view.to === undefined && view.expanded && <div id={contentId} className="min-w-0 border-t border-ctp-surface1 p-4">{view.content}</div>}
  </Panel>;
}
