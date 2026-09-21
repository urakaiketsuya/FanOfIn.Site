import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import DeckWorkspacePicker from "../deckbuilder/components/DeckWorkspacePicker";
import type { DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";

export type ReviewPopulationSource = "tournament" | "balanced";

export default function DeckReviewSetup({ championName, spiritFilter, spiritElement, champions, spiritElements, spirits, catalogByName, spiritCatalogByName, populationSource, pending, onChampionChange, onSpiritChange, onElementChange, onPopulationSourceChange, onStartOver, onLoadWorkspace, spiritLabel }: {
  championName: string | null;
  spiritFilter: string | null;
  spiritElement: string | null;
  champions: string[];
  spiritElements: string[];
  spirits: string[];
  catalogByName: Map<string, Card>;
  spiritCatalogByName: Map<string, Card>;
  populationSource: string;
  pending: boolean;
  onChampionChange: (value: string | null) => void;
  onSpiritChange: (value: string | null) => void;
  onElementChange: (value: string | null) => void;
  onPopulationSourceChange: (value: ReviewPopulationSource) => void;
  onStartOver: () => void;
  onLoadWorkspace: (workspace: Omit<DeckWorkspace, "version" | "updatedAt">) => void;
  spiritLabel: (name: string) => string;
}) {
  const controls = <>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="deck-review-champion" className="text-ctp-subtext0">Champion:</label>
      <select id="deck-review-champion" value={championName ?? ""} onChange={(event) => onChampionChange(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"><option value="">Choose a Champion…</option>{champions.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      {championName && <>
        <label htmlFor="deck-review-element" className="sm:ml-2 text-ctp-subtext0">Element:</label>
        <select id="deck-review-element" value={spiritElement ?? spiritCatalogByName.get(spiritFilter ?? "")?.elements.find((element) => element !== "NORM") ?? ""} onChange={(event) => onElementChange(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"><option value="">Choose an element…</option>{spiritElements.map((element) => <option key={element} value={element}>{element}</option>)}</select>
        {(spiritElement || spiritFilter) && <><label htmlFor="deck-review-spirit" className="sm:ml-2 text-ctp-subtext0">Spirit:</label><select id="deck-review-spirit" value={spiritFilter ?? ""} onChange={(event) => onSpiritChange(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"><option value="">Choose a Spirit…</option>{spirits.map((name) => <option key={name} value={name}>{spiritLabel(name)}</option>)}</select></>}
        <button type="button" onClick={onStartOver} className="rounded-md border border-ctp-surface1 px-2 py-1 text-xs text-ctp-subtext1 hover:border-ctp-red hover:text-ctp-red">Start over</button>
      </>}
    </div>
    {!championName && <div className="mt-3"><DeckWorkspacePicker catalogByName={catalogByName} source="review" onLoad={onLoadWorkspace} /></div>}
    {championName && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ctp-surface1 pt-3 text-xs"><span className="text-ctp-subtext0">Evidence source:</span>{(["balanced", "tournament"] as const).map((source) => <button key={source} type="button" aria-pressed={populationSource === source} onClick={() => onPopulationSourceChange(source)} className={`rounded px-2 py-1 font-medium transition-colors duration-200 ${populationSource === source ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"}`}>{source === "balanced" ? "Balanced" : "Tournament"}</button>)}{pending && <span className="text-ctp-subtext0">Recalculating suggestions…</span>}</div>}
  </>;

  if (!championName) return <Panel className="mt-5">{controls}</Panel>;
  return <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2">
    <summary className="cursor-pointer text-xs font-medium text-ctp-subtext1 hover:text-ctp-text">Review settings · {championName}{spiritFilter ? ` · ${spiritFilter}` : ""}</summary>
    <div className="pt-3">{controls}</div>
  </details>;
}
