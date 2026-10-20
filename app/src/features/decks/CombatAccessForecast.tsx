import ForeseForecast from "./ForeseForecast";
import { useMemo, useState, useTransition } from "react";
import { computeCombatAccessForecast, type Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import Button from "../../components/ui/Button";
import { ForecastCheckpointSelector, ForecastMetricBar } from "../../components/ui/ForecastVisual";

export default function CombatAccessForecast({ mainLines, materialLines, cardsByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
}) {
  const [seen, setSeen] = useState(10);
  const [musicboxReady, setMusicboxReady] = useState(false);
  const [replayReserve, setReplayReserve] = useState(3);
  const hasMusicbox = materialLines.some(line => line.name === "Clockwork Musicbox" && line.quantity > 0);
  const [pending, startTransition] = useTransition();
  const forecast = useMemo(() => computeCombatAccessForecast(mainLines, materialLines, cardsByName, seen, 1024, { ready: musicboxReady, reserve: replayReserve }), [mainLines, materialLines, cardsByName, seen, musicboxReady, replayReserve]);
  const ceiling = Math.max(1, forecast.printedPower, forecast.boostedPower);
  const [highlight, setHighlight] = useState<"allies" | "boosts">("allies");
  const sourceNames = new Set(forecast.sources.filter(source => source.addedPower > 0).map(source => source.name));
  const quantities = new Map<string, number>();
  for (const line of [...mainLines, ...materialLines]) if (line.quantity > 0) quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity);
  const allyNames = new Set([...quantities.keys()].filter(name => {
    const card = cardsByName.get(name);
    return card?.types.includes("ALLY") && card.power !== null;
  }));
  const printedNames = new Set([...allyNames].filter(name => (cardsByName.get(name)?.power ?? 0) > 0));
  const associated = [...quantities].filter(([name]) => allyNames.has(name) || sourceNames.has(name)).map(([name, quantity]) => ({
    name, quantity, detail: allyNames.has(name) && sourceNames.has(name) ? "Ally · boost" : allyNames.has(name) ? "Ally" : "Boost",
  }));
  const hasForese = mainLines.some(line => line.name === "Forese, Fervid Cantor" && line.quantity > 0);
  return <section data-component="CombatAccessForecast" aria-busy={pending}>
    <h3 className="text-sm font-semibold">Ally attack forecast</h3>
    {forecast.unavailable ? <p className="mt-3 text-sm text-ctp-yellow">Card data is incomplete. Attack forecast unavailable.</p> : <>
      <p className="mt-1 text-xs text-ctp-subtext1">Estimated available power · {seen} cards seen · before Intercept</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Button aria-pressed={highlight === "allies"} variant="ghost" className={`text-left ${highlight === "allies" ? "ring-2 ring-ctp-blue" : ""}`} onClick={() => setHighlight("allies")}>
          <ForecastMetricBar label="Printed ally power" value={forecast.printedPower / ceiling} displayValue={forecast.printedPower.toFixed(1)} />
        </Button>
        <Button aria-pressed={highlight === "boosts"} variant="ghost" className={`text-left ${highlight === "boosts" ? "ring-2 ring-ctp-blue" : ""}`} onClick={() => setHighlight("boosts")}>
          <ForecastMetricBar label="With boosts & deployment" value={forecast.boostedPower / ceiling} displayValue={forecast.boostedPower.toFixed(1)} />
        </Button>
      </div>
      <p className="my-3 text-xs text-ctp-subtext1" role="status">{highlight === "allies" ? "Attacking ally pool" : "Supported boost sources"} · Main and Material</p>
      <AssociatedCards lines={associated} cardsByName={cardsByName} highlighted={highlight === "allies" ? printedNames : sourceNames} />
      {associated.length === 0 && <p className="text-sm text-ctp-subtext1">No attacking allies or supported boosts found.</p>}
    </>}
    <div className="mt-3"><ForecastCheckpointSelector checkpoints={[7,10,15,20].map(n => ({seen:n,label:`${n} seen`}))} selected={seen} onSelect={n => startTransition(() => setSeen(n))} /></div>
    {hasMusicbox && <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={musicboxReady} onChange={event => startTransition(() => setMusicboxReady(event.target.checked))} className="h-5 w-5 accent-ctp-blue" />
        Musicbox ready
      </label>
      {musicboxReady && <label className="flex min-h-12 items-center gap-2 text-sm">
        Reserve left for replay
        <input type="number" min={0} max={60} value={replayReserve} onChange={event => {
          const value = event.target.valueAsNumber;
          startTransition(() => setReplayReserve(Number.isFinite(value) ? Math.max(0, Math.min(60, Math.floor(value))) : 0));
        }} className="min-h-12 w-20 rounded border border-ctp-surface2 bg-ctp-base px-3 focus-visible:outline-2 focus-visible:outline-ctp-blue" />
      </label>}
    </div>}
    {pending && <p role="status" className="mt-2 text-xs">Recalculating…</p>}
    {!forecast.unavailable && <>
      {hasMusicbox && musicboxReady && <p className="mt-2 text-xs text-ctp-subtext1">Musicbox adds {forecast.musicboxAddedPower.toFixed(1)} average power from one affordable replay.</p>}
      {hasForese && <p className="mt-2 text-xs text-ctp-subtext1">Forese contributes {forecast.foreseAddedPower.toFixed(1)} average power from the ally put in play; Forese rests.</p>}

      {forecast.unmodeled.length > 0 && <p className="mt-3 text-xs text-ctp-yellow">Power effects not counted: {forecast.unmodeled.join(" · ")}</p>}
    </>}
    {hasForese && <ForeseForecast mainLines={mainLines} cardsByName={cardsByName} seen={seen} />}

  </section>;
}
