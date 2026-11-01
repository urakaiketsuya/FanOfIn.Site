import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import spoilers from "../../../../data/reference/card-spoilers-2026-11-01.json";
import CardResult from "../../components/CardResult";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";

const controlClass = "mt-2 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue";

export default function CardSpoilers() {
  useDocumentTitle("Card spoilers", "Unreleased Grand Archive cards from the CBL developer stream.");
  const catalog = useCardCatalog();
  const byName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const set = params.get("set") ?? "";
  const shown = spoilers.cards.filter(card => (!set || card.setPrefix === set) &&
    [card.name, card.effect, ...card.classes, ...card.types, ...card.subtypes, ...card.elements].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }
  return <PageLayout width="fluid">
    <PageHeader title="Card spoilers" />
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ctp-subtext1">
      <span className="rounded bg-ctp-yellow/10 px-2 py-1 text-ctp-yellow">Unverified spoilers</span>
      <time dateTime={spoilers.capturedAt}>November 1, 2026</time>
      <a href={spoilers.source.streamUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-control items-center rounded text-ctp-blue underline focus-visible:outline-2 focus-visible:outline-ctp-blue">CBL developer stream ↗</a>
    </div>
    <p className="mt-2 max-w-2xl text-sm text-ctp-subtext1">Transcribed from stream screenshots; names, rules text and printing details may change. Existing catalog artwork is shown where available.</p>
    <div className="my-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Find a spoiler<input type="search" className={controlClass} value={query} placeholder="Name, rules text, class or element" onChange={event => update("q", event.target.value)} /></label>
      <label className="text-sm">Reveal<select className={controlClass} value={set} onChange={event => update("set", event.target.value)}>
        <option value="">All reveals</option>
        {Object.entries(spoilers.sets).map(([prefix, description]) => <option key={prefix} value={prefix}>{prefix} · {description}</option>)}
      </select></label>
    </div>
    <p role="status" className="mb-4 text-sm text-ctp-subtext1">{shown.length} of {spoilers.cards.length} spoilers</p>
    {shown.length === 0 && <div className="space-y-3"><p>No spoilers match your filters.</p><Button onClick={() => setParams({})}>Clear filters</Button></div>}
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {shown.map(card => <CardResult key={`${card.setPrefix}:${card.name}`} card={byName.get(card.name)} name={card.name} compactOnMobile>
        <div className="space-y-2 text-sm">
          <p className="text-xs text-ctp-subtext1">{card.setPrefix}{card.collectorNumber ? ` · ${card.collectorNumber}` : ""}{card.rarity ? ` · ${card.rarity}` : ""}</p>
          <div className="flex flex-wrap gap-1 text-xs">
            {[...card.elements, ...card.types, ...card.classes, ...card.subtypes, ...(card.exalted ? ["Exalted"] : []), ...(card.deckSection === "song" ? ["Song deck"] : []), ...(card.unlocksDeckSection === "song" ? ["Unlocks Song deck"] : []), ...(card.reprintOf ? ["Reprint"] : [])].map(label => <span key={label} className="rounded bg-ctp-surface0 px-2 py-1">{label}</span>)}
          </div>
          <p className="text-xs text-ctp-subtext1">{[card.cost ? `${card.cost.value} ${card.cost.type}` : null, card.level != null ? `Level ${card.level}` : null, card.power != null ? `Power ${card.power}` : null, card.life != null ? `Life ${card.life}` : null, card.speed].filter(Boolean).join(" · ")}</p>
          <p className="whitespace-pre-line break-words">{card.effect}</p>
        </div>
      </CardResult>)}
    </div>
  </PageLayout>;
}
