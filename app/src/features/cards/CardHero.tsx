import type { Card, CardEdition } from "@gatcg/shared";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";
import ClassIcon from "../../components/ClassIcon";
import CostIcon from "../../components/CostIcon";
import ElementIcon from "../../components/ElementIcon";
import HistoryChart from "../../components/HistoryChart";
import TypeIcon from "../../components/TypeIcon";
import Panel from "../../components/ui/Panel";
import { typeIconKey } from "../../lib/cardTypeIcon";
import type { PriceRow } from "../../lib/db";
import { formatUsd } from "../../lib/format";
import { alternateFacesForEdition } from "../../lib/cardFaces";

interface PriceSeries {
  label: string;
  dated: { date: string; value: number }[];
}

const badgeClass = "flex items-center gap-1 rounded-full border border-ctp-surface1 bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-subtext1";

function Badge({ children, to }: { children: ReactNode; to: string }) {
  return <Link to={to} className={`${badgeClass} hover:border-ctp-blue hover:text-ctp-blue`}>{children}</Link>;
}

function Stat({ label, value, icon }: { label: string; value: number | string | null; icon?: ReactNode }) {
  if (value === null) return null;
  return <div className="min-w-20 border-l border-ctp-surface2 pl-3 first:border-l-0 first:pl-0"><div className="flex items-center gap-1 text-xs text-ctp-subtext0">{icon}{label}</div><div className="mt-1 text-lg font-semibold leading-none text-ctp-text">{value}</div></div>;
}

export default function CardHero({ card, edition, editionIndex, editionsExpanded, price, priceSeries, rarityLabel, onEditionChange, onEditionsExpandedChange }: { card: Card; edition?: CardEdition; editionIndex: number; editionsExpanded: boolean; price?: PriceRow; priceSeries: PriceSeries | null; rarityLabel: (rarity: number) => string; onEditionChange: (index: number) => void; onEditionsExpandedChange: (expanded: boolean) => void }) {
  const [faceIndex, setFaceIndex] = useState(0);
  const alternateFaces = alternateFacesForEdition(edition);
  const alternateFace = faceIndex > 0 ? alternateFaces[faceIndex - 1] : undefined;
  useEffect(() => setFaceIndex(0), [editionIndex]);
  const faceName = alternateFace?.name ?? card.name;
  const faceImage = alternateFace?.edition.image ?? edition?.image;
  const faceEffect = alternateFace?.effect ?? card.effect;
  const faceFlavor = alternateFace?.flavor ?? card.flavor;
  const faceStats = alternateFace ?? card;
  return <Panel padding="lg" className="mt-4 overflow-hidden"><div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
    <div className="mx-auto w-full max-w-[280px] md:mx-0">{faceImage ? <CardImage image={faceImage} alt={`${faceName}${alternateFace ? " reverse face" : ""}`} className="aspect-[5/7] w-full rounded-xl border border-ctp-surface2 object-cover shadow-xl shadow-black/30" /> : <div className="flex aspect-[5/7] items-center justify-center rounded-lg border border-ctp-surface1 bg-ctp-mantle text-ctp-subtext0">No image</div>}
      {alternateFaces.length > 0 && <div className="mt-3 rounded-xl border border-ctp-surface1 bg-ctp-base p-1" role="group" aria-label="Card face"><div className={`grid gap-1 ${alternateFaces.length === 1 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}><button type="button" aria-pressed={faceIndex === 0} onClick={() => setFaceIndex(0)} className={`min-h-11 rounded-lg px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40 ${faceIndex === 0 ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>Front</button>{alternateFaces.map((face, index) => <button key={face.uuid} type="button" aria-pressed={faceIndex === index + 1} onClick={() => setFaceIndex(index + 1)} className={`min-h-11 rounded-lg px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40 ${faceIndex === index + 1 ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}>{alternateFaces.length === 1 ? "Back" : `Face ${index + 2}`}</button>)}</div><p className="px-2 pb-1 pt-2 text-center text-xs text-ctp-subtext0">{faceIndex === 0 ? card.name : alternateFace?.name}</p></div>}
      {card.editions.length > 1 && <div className="mt-3"><button type="button" onClick={() => onEditionsExpandedChange(!editionsExpanded)} aria-expanded={editionsExpanded} className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ctp-subtext0 hover:text-ctp-text"><span>Editions ({card.editions.length})</span><span aria-hidden="true">{editionsExpanded ? "▲" : "▼"}</span></button>{editionsExpanded && <div className="mt-2 grid grid-cols-3 gap-2">{card.editions.map((candidate, index) => <button key={candidate.uuid} type="button" onClick={() => onEditionChange(index)} aria-pressed={index === editionIndex} className={`rounded-md border p-1 text-left ${index === editionIndex ? "border-ctp-blue" : "border-ctp-surface1"}`}><CardImage image={candidate.image} alt={`${card.name} — ${candidate.set.name}`} className="aspect-[5/7] w-full rounded object-cover" /><p className="mt-1 truncate text-[10px] text-ctp-subtext1">{candidate.set.name}</p><p className="truncate text-[10px] text-ctp-subtext0">#{candidate.collector_number} · {rarityLabel(candidate.rarity)}</p></button>)}</div>}</div>}
    </div>
    <div className="min-w-0"><h1 className="text-3xl font-bold tracking-tight text-ctp-text sm:text-4xl">{faceName}</h1>{alternateFace && <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ctp-blue">Reverse face of {card.name}</p>}{edition?.illustrator && <p className="mt-1 text-sm text-ctp-subtext0">Illustrated by <Link to={`/cards?artist=${encodeURIComponent(edition.illustrator)}`} className="font-medium text-ctp-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/40">{edition.illustrator}</Link></p>}<div className="mt-2 flex flex-wrap gap-1.5">{faceStats.classes.map((value) => <Badge key={value} to={`/cards?class=${encodeURIComponent(value)}`}><ClassIcon cardClass={value} size={14} />{value}</Badge>)}{faceStats.types.map((value) => <Badge key={value} to={`/cards?type=${encodeURIComponent(value)}`}><TypeIcon type={typeIconKey(value, faceStats.types)} size={14} />{value}</Badge>)}{faceStats.elements.map((value) => <Badge key={value} to={`/cards?element=${encodeURIComponent(value)}`}><ElementIcon element={value} size={14} />{value}</Badge>)}{faceStats.subtypes.length > 0 && <details className="text-xs text-ctp-subtext0"><summary className="cursor-pointer px-2 py-0.5">{faceStats.subtypes.length} subtype{faceStats.subtypes.length === 1 ? "" : "s"}</summary><div className="mt-1 flex flex-wrap gap-1">{faceStats.subtypes.map((value) => <Badge key={value} to={`/cards?subtype=${encodeURIComponent(value)}`}>{value}</Badge>)}</div></details>}</div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 border-y border-ctp-surface1 py-4"><Stat label="Memory" value={faceStats.cost_memory} icon={<CostIcon kind="memory" size={12} />} /><Stat label="Reserve" value={faceStats.cost_reserve} icon={<CostIcon kind="reserve" size={12} />} /><Stat label="Level" value={faceStats.level} /><Stat label="Power" value={faceStats.power} /><Stat label="Life" value={faceStats.life} /><Stat label="Durability" value={faceStats.durability} /></div>
      {faceEffect && <div className="mt-5 rounded-xl bg-ctp-base/55 p-4 text-sm leading-relaxed text-ctp-text"><p className="whitespace-pre-wrap">{faceEffect.replace(/\*\*/g, "")}</p></div>}{faceFlavor && <p className="mt-3 text-sm italic text-ctp-subtext0">{faceFlavor}</p>}
      {price && <div className="mt-5 rounded-xl border border-ctp-surface2/70 bg-ctp-base/45 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Market price</h2><p className="mt-0.5 text-xs text-ctp-subtext0">{edition?.set.name}</p></div><a href={price.tcgplayerUrl} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 text-xs font-semibold text-ctp-blue hover:bg-ctp-blue/10">View on TCGplayer ↗</a></div><div className="mt-3 flex flex-wrap gap-6 text-sm">{price.normal && <span className="text-ctp-subtext1">Normal: {formatUsd(price.normal.market)}{price.normal.low !== null && price.normal.high !== null && <span className="text-xs text-ctp-subtext0"> ({formatUsd(price.normal.low)}–{formatUsd(price.normal.high)})</span>}</span>}{price.foil && <span className="text-ctp-subtext1">Foil: {formatUsd(price.foil.market)}{price.foil.low !== null && price.foil.high !== null && <span className="text-xs text-ctp-subtext0"> ({formatUsd(price.foil.low)}–{formatUsd(price.foil.high)})</span>}</span>}</div>{priceSeries && <div className="mt-3 max-w-md rounded-lg bg-ctp-mantle/60 p-3"><p className="text-xs text-ctp-subtext0">{priceSeries.label} price, last {priceSeries.dated.length} weeks</p><HistoryChart points={priceSeries.dated} label={`${priceSeries.label} price`} formatValue={formatUsd} compact /><div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0"><span>{new Date(priceSeries.dated[0].date).toLocaleDateString()}</span><span>{new Date(priceSeries.dated.at(-1)!.date).toLocaleDateString()}</span></div></div>}</div>}
    </div>
  </div></Panel>;
}
