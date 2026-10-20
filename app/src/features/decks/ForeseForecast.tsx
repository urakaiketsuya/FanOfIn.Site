import { useMemo, useState } from "react";
import { computeForeseForecast, FORESE_NAME, type Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import { ForecastCheckpointSelector, ForecastMetricBar } from "../../components/ui/ForecastVisual";

export default function ForeseForecast({ mainLines, cardsByName, seen: sharedSeen }: {
  mainLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
  seen?: number;
}) {
  const [localSeen, setSeen] = useState(10);
  const seen = sharedSeen ?? localSeen;
  const forecast = useMemo(() => computeForeseForecast(mainLines, cardsByName, seen), [mainLines, cardsByName, seen]);
  if (!forecast.foreseCopies) return null;
  const sources = [{ name: FORESE_NAME, quantity: forecast.foreseCopies }, ...forecast.targets];
  return <section data-component="ForeseForecast" className="mt-4 rounded-lg border border-ctp-surface1 p-3">
    <h3 className="text-sm font-semibold">Forese · put an ally onto the field</h3>
    {forecast.unavailable ? <p className="mt-3 text-sm text-ctp-yellow">Card data is incomplete or unsupported. Deployment odds are unavailable.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <ForecastMetricBar label="Access to Forese + Melody/Harmony" value={forecast.accessChance} />
      <ForecastMetricBar label="Access + Scavenge puts an ally in play" value={forecast.deploymentChance} />
    </div>}
    <p className="my-3 text-xs text-ctp-subtext1">First deployment · {seen} cards seen · {forecast.eligibleCopies} eligible Resonators</p>
    <AssociatedCards lines={sources} cardsByName={cardsByName} label="Forese and eligible deployment targets" />
    {sharedSeen === undefined && <div className="mt-3"><ForecastCheckpointSelector checkpoints={[7, 10, 15, 20].map(n => ({ seen: n, label: `${n} seen` }))} selected={seen} onSelect={setSeen} /></div>}
  </section>;
}
