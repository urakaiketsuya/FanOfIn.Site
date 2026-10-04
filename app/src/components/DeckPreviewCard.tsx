import { useId, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import CardArtTile from "./CardArtTile";
import DeckCardPreview from "./DeckCardPreview";
import DisclosureChevron from "./DisclosureChevron";
import Panel from "./ui/Panel";
import Button from "./ui/Button";
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

type ListAction = { to: string; newTab?: boolean; expanded?: never; onToggle?: never; content?: never } | {
  to?: never; newTab?: never; expanded: boolean; onToggle: () => void; content: ReactNode;
};

/** Immutable preview only: adapters own fetching, mutations, navigation and expanded content. */
export default function DeckPreviewCard({ model, cardsByName, championCard, view, cardLinksNewTab = false, presentation = "detail" }: {
  model: DeckPreviewModel;
  cardLinksNewTab?: boolean;
  presentation?: "detail" | "cover" | "library";
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
  if (presentation === "library") return (
    <Panel as="article" padding="none" data-component="DeckPreviewCard" data-source={model.source.kind} data-deck-id={model.id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl">
      {view.to !== undefined ? <Link to={view.to} target={view.newTab ? "_blank" : undefined} rel={view.newTab ? "noreferrer" : undefined} aria-label={`Open deck: ${model.title}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ctp-blue">
        <CardArtTile card={leadCard} name={label} artworkOnly />
        <div className="px-5 pt-5"><h2 className="break-words text-2xl font-semibold leading-tight text-ctp-text group-hover:text-ctp-blue">{model.title}</h2></div>
      </Link> : <><CardArtTile card={leadCard} name={label} artworkOnly /><h2 className="px-5 pt-5 break-words text-2xl font-semibold leading-tight text-ctp-text">{model.title}</h2></>}
      <div className="px-5 pb-2">
        {leadCard ? <Link to={`/cards/${leadCard.slug}`} className="inline-flex min-h-control items-center break-words text-sm text-ctp-subtext1 hover:text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">{label}</Link> : <p className="mt-2 break-words text-sm text-ctp-subtext1">{label}</p>}
        <p className="text-xs text-ctp-subtext0">{model.format === "STANDARD" ? "Standard" : model.format === "PANTHEON" ? "Pantheon" : "Format unknown"} · {model.source.label}</p>
        {model.status}
      </div>
      <div className="px-5 pb-4">
        {view.to !== undefined ? <Link to={view.to} target={view.newTab ? "_blank" : undefined} rel={view.newTab ? "noreferrer" : undefined} className={`${deckPreviewActionClass} -ml-3 text-ctp-blue`} aria-label={`Open deck: ${model.title}`}>Open deck <span aria-hidden="true">→</span></Link> : <Button variant="ghost" onClick={view.onToggle} aria-expanded={view.expanded} aria-controls={contentId}><DisclosureChevron className={view.expanded ? "rotate-180" : ""} />{view.expanded ? "Hide list" : "View list"}</Button>}
        <details className="group border-t border-ctp-surface1/60">
          <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 text-sm text-ctp-subtext1 focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden" aria-label={`Details and actions for ${model.title}`}>Details and actions<DisclosureChevron className="group-open:rotate-180" /></summary>
          <p className="mb-3 text-sm text-ctp-subtext1">{count("main") ?? "Unknown"} main · {count("sideboard") ?? "Unknown"} sideboard</p>
          {model.metadata && <div className="mb-3 break-words text-sm text-ctp-subtext1">{model.metadata}</div>}
          <div className="flex flex-wrap gap-2 [&>a]:min-h-control [&>button]:min-h-control">{model.actions}</div>
        </details>
      </div>
      {view.to === undefined && view.expanded && <div id={contentId} className="min-w-0 border-t border-ctp-surface1 p-4">{view.content}</div>}
    </Panel>
  );
  if (presentation === "cover" && view.to !== undefined) return (
    <Panel as="article" padding="none" data-component="DeckPreviewCard" data-source={model.source.kind} data-deck-id={model.id} className="identity-surface flex h-full min-w-0 flex-col overflow-hidden rounded-3xl">
      <Link target={view.newTab ? "_blank" : undefined} rel={view.newTab ? "noreferrer" : undefined} to={view.to} aria-label={`Open deck: ${model.title}`} className="group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ctp-blue">
        <div className="relative grid shrink-0 grid-cols-[minmax(0,1fr)] overflow-hidden">
          <div className="col-start-1 row-start-1 self-start"><CardArtTile card={leadCard} name={label} artworkOnly /></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
          <div className="relative col-start-1 row-start-1 min-w-0 self-end p-4 pt-12 text-white">
            <p className="mb-1 text-xs text-white/85">{model.source.label}{model.format && ` · ${model.format === "STANDARD" ? "Standard" : "Pantheon"}`}</p>
            <h2 className="break-words text-2xl font-bold leading-tight">{model.title}</h2>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="break-words text-xs text-ctp-subtext0">{label}</p>
          {model.metadata && <div className="break-words text-sm leading-relaxed text-ctp-subtext1">{model.metadata}</div>}
          <span className="mt-auto flex min-h-12 items-center font-medium text-ctp-blue group-hover:underline">Open deck <span aria-hidden="true" className="ml-2">→</span></span>
        </div>
      </Link>
    </Panel>
  );
  return <Panel as="article" padding="none" data-component="DeckPreviewCard" data-source={model.source.kind} data-deck-id={model.id} className="identity-surface flex min-w-0 flex-col overflow-hidden">
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="min-w-0">{leadCard ? <Link target={cardLinksNewTab ? "_blank" : undefined} rel={cardLinksNewTab ? "noreferrer" : undefined} to={`/cards/${leadCard.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{art}</Link> : art}</div>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold leading-snug text-ctp-text sm:text-2xl">{model.title}</h2>
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-ctp-subtext1"><span className="rounded bg-ctp-surface0 px-2 py-1">{model.format === "STANDARD" ? "Standard" : model.format === "PANTHEON" ? "Pantheon" : "Format unknown"}</span><span className="rounded bg-ctp-blue/10 px-2 py-1 text-ctp-blue">{model.source.label}</span></div>
          {model.metadata && <div className="mt-2 break-words text-xs leading-relaxed text-ctp-subtext1">{model.metadata}</div>}
        </div>
      </div>
      {preview && preview.lines.length > 0 && <section aria-label={preview.label}><p className="mb-2 text-xs text-ctp-subtext0">{preview.label}</p><DeckCardPreview newTab={cardLinksNewTab} compact groupByElement={preview.section === "main"} lines={preview.lines.slice(0, 3)} cardsByName={cards} /></section>}
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ctp-surface1/60 pt-3">{(["main", "sideboard"] as const).map(section => <div key={section} className="flex flex-col-reverse gap-0.5"><dt className="text-xs text-ctp-subtext1">{section === "main" ? "Main deck" : "Sideboard"}</dt><dd className="text-lg font-semibold tabular-nums text-ctp-text">{count(section) ?? "Unknown"}</dd></div>)}</dl>
      {model.status}
    </div>
    <footer className="border-t border-ctp-surface1 bg-ctp-base/40 p-3">
      <div className="flex flex-wrap items-center gap-2 [&>a]:min-h-12 [&>button]:min-h-12 [&>a]:min-w-12 [&>button]:min-w-12 [&>a]:max-w-full [&>button]:max-w-full">
        {view.to !== undefined ? <Link target={view.newTab ? "_blank" : undefined} rel={view.newTab ? "noreferrer" : undefined} to={view.to} aria-label={`View list: ${model.title}`} className={`${deckPreviewActionClass} bg-ctp-blue text-ctp-base`}>View list</Link> : <Button variant="primary" onClick={view.onToggle} aria-label={`${view.expanded ? "Hide" : "View"} list: ${model.title}`} aria-expanded={view.expanded} aria-controls={contentId} className={`${deckPreviewActionClass} bg-ctp-blue text-ctp-base`}><DisclosureChevron className={view.expanded ? "rotate-180" : ""} />{view.expanded ? "Hide list" : "View list"}</Button>}
        {model.actions}
      </div>
    </footer>
    {view.to === undefined && view.expanded && <div id={contentId} className="min-w-0 border-t border-ctp-surface1 p-4">{view.content}</div>}
  </Panel>;
}
