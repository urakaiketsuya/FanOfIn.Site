import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { computeForeseForecast, FORESE_NAME, type Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
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
    <div className="mt-3 flex flex-wrap gap-3">{sources.map(source => {
      const card = cardsByName.get(source.name);
      const content = <><CardArtTile card={card} name={source.name} cornerBadge={`${source.quantity}×`} /><span className="mt-1 block text-xs font-medium">{source.name}</span></>;
      return card ? <Link key={source.name} to={`/cards/${card.slug}`} className="w-24 min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={source.name} className="w-24">{content}</div>;
    })}</div>
    <p className="mt-3 text-xs text-ctp-subtext1">{forecast.eligibleCopies} eligible Resonators · non-advanced element · reserve cost ≤3</p>
    {sharedSeen === undefined && <div className="mt-3"><ForecastCheckpointSelector checkpoints={[7, 10, 15, 20].map(n => ({ seen: n, label: `${n} seen` }))} selected={seen} onSelect={setSeen} /></div>}
    {forecast.unavailable ? <p className="mt-3 text-sm text-ctp-yellow">Card data is incomplete or unsupported. Deployment odds are unavailable.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <ForecastMetricBar label="Access to Forese + Melody/Harmony" value={forecast.accessChance} />
      <ForecastMetricBar label="Access + Scavenge puts an ally in play" value={forecast.deploymentChance} />
    </div>}
    <p className="mt-3 text-xs text-ctp-subtext0">First trigger: have Forese awake, activate a Melody/Harmony, then rest Forese to Scavenge 5. A hit enters the field. Costs, removal, repeat triggers and attack readiness are not modeled; the attack forecast includes the ally’s power without counting it twice.</p>
  </section>;
}
