import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { computeResourceCurveReliability } from "./resourceCurve";

function status(probability: number): { label: string; className: string } {
  if (probability >= 0.8) return { label: "Reliable", className: "text-ctp-green" };
  if (probability >= 0.6) return { label: "Playable", className: "text-ctp-blue" };
  return { label: "Thin", className: "text-ctp-yellow" };
}

export default function ResourceCurveReliability({ mainLines, materialLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const points = useMemo(() => computeResourceCurveReliability(mainLines, catalogByName, startingHandSize), [mainLines, catalogByName, startingHandSize]);
  const cardsByCost = useMemo(() => new Map(points.map((point) => [point.cost, mainLines.filter((line) => catalogByName.get(line.name)?.cost_reserve === point.cost)])), [points, mainLines, catalogByName]);
  if (points.length === 0) return null;
  return <Panel data-component="ResourceCurveReliability" className="mt-4 shadow-sm"><Section heading="dense" title="Resource timing" description="When each printed Reserve-cost band first becomes affordable, and how likely the deck is to have drawn one."><div className="mt-3 space-y-3">{points.map((point) => { const read = status(point.first.probability); const delta = point.second.probability - point.first.probability; return <article key={point.cost} className="rounded-xl border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ctp-text">Reserve {point.cost}</p><p className="text-[10px] text-ctp-subtext0">{point.copies} copies · first affordable T{point.first.turn}{point.second.turn < point.first.turn ? ` / T${point.second.turn} going second` : ""}</p></div><div className="text-right"><p className={`text-lg font-bold tabular-nums ${read.className}`}>{(point.first.probability * 100).toFixed(1)}%</p><p className={`text-[10px] font-medium ${read.className}`}>{read.label} going first</p></div></div><div className="mt-3 space-y-2"><ReliabilityBar label={`First · T${point.first.turn}`} probability={point.first.probability} /><ReliabilityBar label={`Second · T${point.second.turn}`} probability={point.second.probability} /><p className="text-right text-[10px] tabular-nums text-ctp-subtext0">Going second: +{(delta * 100).toFixed(1)} pts{point.second.turn < point.first.turn ? " · one turn sooner" : ""}</p></div><div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">{(cardsByCost.get(point.cost) ?? []).map((line) => { const card = catalogByName.get(line.name); const tile = <div className="w-16 shrink-0 snap-start"><div className="relative aspect-[5/7] overflow-hidden rounded-md bg-ctp-surface0">{card?.editions[0] && <CardImage image={card.editions[0].image} alt={line.name} className="h-full w-full object-cover" />}<span className="absolute right-1 top-1 rounded-full bg-ctp-base/90 px-1 py-0.5 text-[9px] font-semibold text-ctp-text">{line.quantity}×</span></div><p className="mt-1 truncate text-[9px] text-ctp-subtext1">{line.name}</p></div>; return card ? <Link key={line.name} to={`/cards/${card.slug}`}>{tile}</Link> : <div key={line.name}>{tile}</div>; })}</div></article>; })}</div><details className="mt-3 text-[10px] leading-4 text-ctp-subtext0"><summary className="flex min-h-11 cursor-pointer items-center">How this is calculated</summary><p className="mt-1">Exact draw odds use the selected level-0 Champion's starting hand. The second player sees one additional card at the same personal turn. Bands use printed Reserve costs; use Curve Affordability Check to enter conditional effective costs. Availability does not account for board state, level requirements, or earlier spending.</p></details></Section></Panel>;
}

function ReliabilityBar({ label, probability }: { label: string; probability: number }) { const read = status(probability); return <div className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-[10px]"><span className="text-ctp-subtext0">{label}</span><span className="h-2.5 overflow-hidden rounded-full bg-ctp-surface0"><span className="block h-full rounded-full bg-ctp-blue" style={{ width: `${probability * 100}%` }} /></span><span className={`text-right font-semibold tabular-nums ${read.className}`}>{(probability * 100).toFixed(1)}%</span></div>; }
